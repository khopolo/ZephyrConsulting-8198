import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { db as productionDb } from '../database';
import * as s from '../database/schema';

export type SalesDb = typeof productionDb;
export const integrationPayload = z.object({
  version: z.literal(1),
  action: z.enum(['redeem', 'check']),
  productId: z.enum(['safespace', 'shiftmate']),
  environment: z.enum(['sandbox', 'live']),
  credentialId: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
  timestamp: z.number().int().nonnegative(),
  nonce: z.string().regex(/^[a-zA-Z0-9_-]{22,100}$/),
  destinationUserId: z.string().min(1).max(200),
  code: z.string().regex(/^[a-zA-Z0-9_-]{32}$/).optional(),
}).strict();
export type IntegrationPayload = z.infer<typeof integrationPayload>;
export interface IntegrationCredential {
  id: string;
  productId: 'safespace' | 'shiftmate';
  environment: 'sandbox' | 'live';
  secret: string;
}
export class IntegrationDenied extends Error {
  constructor() { super('Integration request denied.'); }
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
// Fixed key order; both parties serialize this exact object, not arbitrary request JSON.
export const canonicalPayload = (p: IntegrationPayload) => JSON.stringify({
  version: p.version, action: p.action, productId: p.productId,
  environment: p.environment, credentialId: p.credentialId,
  timestamp: p.timestamp, nonce: p.nonce, destinationUserId: p.destinationUserId,
  code: p.code ?? null,
});
export const signIntegration = (payload: IntegrationPayload, secret: string) =>
  createHmac('sha256', secret).update(canonicalPayload(payload)).digest('hex');
export function validateIntegration(raw: unknown, signature: string, credential: IntegrationCredential | null, now: number): IntegrationPayload {
  const parsed = integrationPayload.safeParse(raw);
  if (!parsed.success || !credential || credential.secret.length < 32 || !/^[a-f0-9]{64}$/.test(signature)) throw new IntegrationDenied();
  const p = parsed.data;
  if (p.credentialId !== credential.id || p.productId !== credential.productId || p.environment !== credential.environment || Math.abs(now - p.timestamp) > 30000) throw new IntegrationDenied();
  if ((p.action === 'redeem') !== Boolean(p.code)) throw new IntegrationDenied();
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(signIntegration(p, credential.secret), 'hex'))) throw new IntegrationDenied();
  return p;
}
const customerKey = (environment: string, productId: string, customerId: string) => hash(JSON.stringify([environment, productId, customerId]));
const destinationKey = (environment: string, productId: string, userId: string) => hash(JSON.stringify([environment, productId, userId]));

// No public route is mounted. Production must supply independently verified
// readiness; tests may inject an isolated policy without touching deployment env.
export function createAppLinking(database: SalesDb, now: () => number = Date.now, enabled: (productId: IntegrationPayload['productId'], environment: IntegrationPayload['environment']) => boolean = () => false) {
  async function requireCredential(tx: Parameters<Parameters<SalesDb['transaction']>[0]>[0], credential: IntegrationCredential) {
    const [row] = await tx.select().from(s.integrationCredentials).where(and(
      eq(s.integrationCredentials.id, credential.id), eq(s.integrationCredentials.productId, credential.productId),
      eq(s.integrationCredentials.environment, credential.environment), eq(s.integrationCredentials.status, 'active'),
    ));
    if (!row) throw new IntegrationDenied();
  }
  async function issue(customerId: string, productId: 'safespace' | 'shiftmate', environment: 'sandbox' | 'live') {
    if (!enabled(productId, environment)) throw new IntegrationDenied();
    const expiresAt = now() + 60000;
    const code = randomBytes(24).toString('base64url');
    await database.transaction(async tx => {
      const [user] = await tx.select().from(s.user).where(eq(s.user.id, customerId));
      const [profile] = await tx.select().from(s.profiles).where(eq(s.profiles.id, customerId));
      if (!user?.emailVerified || profile?.status !== 'active') throw new IntegrationDenied();
      // One current code per owner/product/environment; don't delete audit history.
      await tx.update(s.linkCodes).set({ consumedAt: now() }).where(and(eq(s.linkCodes.customerId, customerId), eq(s.linkCodes.productId, productId), eq(s.linkCodes.environment, environment), isNull(s.linkCodes.consumedAt)));
      await tx.insert(s.linkCodes).values({ customerId, productId, environment, codeHash: hash(code), expiresAt });
      await tx.insert(s.audit).values({ actorId: customerId, action: 'app-link.code-issued', targetId: productId });
    });
    return { code, expiresAt, productId, environment };
  }
  async function handle(raw: unknown, signature: string, credential: IntegrationCredential | null) {
    const p = validateIntegration(raw, signature, credential, now());
    if (!enabled(p.productId, p.environment)) throw new IntegrationDenied();
    return database.transaction(async tx => {
      await requireCredential(tx, credential!);
      // Replay registration and every state change commit together. Retain nonce rows;
      // timestamps already reject old requests. Never reuse a nonce across actions.
      const nonceKey = hash(JSON.stringify([p.credentialId, p.nonce]));
      const [inserted] = await tx.insert(s.integrationNonces).values({ key: nonceKey, expiresAt: now() + 60000 }).onConflictDoNothing().returning();
      if (!inserted) throw new IntegrationDenied();
      let customerId: string;
      if (p.action === 'redeem') {
        const [code] = await tx.update(s.linkCodes).set({ consumedAt: now() }).where(and(
          eq(s.linkCodes.codeHash, hash(p.code!)), eq(s.linkCodes.productId, p.productId),
          eq(s.linkCodes.environment, p.environment), gt(s.linkCodes.expiresAt, now()), isNull(s.linkCodes.consumedAt),
        )).returning();
        if (!code) throw new IntegrationDenied();
        customerId = code.customerId;
        const ckey = customerKey(p.environment, p.productId, customerId);
        const dkey = destinationKey(p.environment, p.productId, p.destinationUserId);
        const [existingCustomer] = await tx.select().from(s.identityLinks).where(eq(s.identityLinks.customerProductKey, ckey));
        const [existingDestination] = await tx.select().from(s.identityLinks).where(eq(s.identityLinks.destinationKey, dkey));
        if ((existingCustomer && existingCustomer.destinationKey !== dkey) || (existingDestination && existingDestination.customerId !== customerId)) throw new IntegrationDenied();
        const [user] = await tx.select().from(s.user).where(eq(s.user.id, customerId));
        const [profile] = await tx.select().from(s.profiles).where(eq(s.profiles.id, customerId));
        if (!user?.emailVerified || profile?.status !== 'active') throw new IntegrationDenied();
        if (!existingCustomer) await tx.insert(s.identityLinks).values({ customerProductKey: ckey, destinationKey: dkey, customerId, productId: p.productId, environment: p.environment, destinationUserId: p.destinationUserId, credentialId: p.credentialId });
        await tx.insert(s.audit).values({ actorId: customerId, action: 'app-link.redeemed', targetId: p.productId });
        return { linked: true, productId: p.productId, environment: p.environment };
      }
      const [link] = await tx.select().from(s.identityLinks).where(eq(s.identityLinks.destinationKey, destinationKey(p.environment, p.productId, p.destinationUserId)));
      if (!link) return { allowed: false, productId: p.productId, environment: p.environment, validUntil: null };
      customerId = link.customerId;
      const [profile] = await tx.select().from(s.profiles).where(eq(s.profiles.id, customerId));
      const [user] = await tx.select().from(s.user).where(eq(s.user.id, customerId));
      const [product] = await tx.select().from(s.products).where(eq(s.products.id, p.productId));
      if (!user?.emailVerified || profile?.status !== 'active' || product?.status !== 'active') return { allowed: false, productId: p.productId, environment: p.environment, validUntil: null };
      const grants = await tx.select().from(s.entitlements).where(and(eq(s.entitlements.customerId, customerId), eq(s.entitlements.productId, p.productId), eq(s.entitlements.environment, p.environment), eq(s.entitlements.status, 'active')));
      // A source label is not proof of payment. Require an exact finite paid
      // period, verified event, immutable order/terms and optional subscription.
      let grant: typeof grants[number] | undefined;
      for (const candidate of grants) {
        if (!candidate.sourceKey || !candidate.orderId || candidate.validFrom > now() || candidate.validUntil === null || candidate.validUntil <= now()) continue;
        const [ledger] = await tx.select().from(s.paymentLedger).where(eq(s.paymentLedger.providerPaymentKey, candidate.sourceKey));
        if (!ledger || ledger.status !== 'paid' || ledger.environment !== p.environment || ledger.orderId !== candidate.orderId || ledger.subscriptionId !== candidate.subscriptionId || ledger.periodStart !== candidate.validFrom || ledger.periodEnd !== candidate.validUntil) continue;
        const [event] = await tx.select().from(s.paymentEvents).where(eq(s.paymentEvents.id, ledger.eventId));
        const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, candidate.orderId));
        if (!event?.verified || event.type !== 'COMPLETE' || event.environment !== p.environment || event.orderId !== candidate.orderId || !order || order.status !== 'paid' || order.environment !== p.environment || order.customerId !== customerId || order.productId !== p.productId || order.amount !== ledger.amount || order.currency !== ledger.currency || ledger.amount <= 0 || ledger.currency !== 'ZAR' || !order.snapshot || !order.termsVersionId) continue;
        const [acceptance] = await tx.select().from(s.termsAcceptances).where(eq(s.termsAcceptances.orderId, order.id));
        if (!acceptance || acceptance.customerId !== customerId || acceptance.termsVersionId !== order.termsVersionId) continue;
        if (candidate.subscriptionId) {
          const [subscription] = await tx.select().from(s.subscriptions).where(eq(s.subscriptions.id, candidate.subscriptionId));
          if (!subscription || subscription.customerId !== customerId || subscription.planId !== order.planId || subscription.environment !== p.environment || !['active', 'cancelled'].includes(subscription.status) || !subscription.snapshot || subscription.paidThrough === null || subscription.paidThrough < candidate.validUntil) continue;
        }
        grant = candidate;
        break;
      }
      return { allowed: Boolean(grant), productId: p.productId, environment: p.environment, validUntil: grant?.validUntil ?? null };
    });
  }
  return { issue, handle };
}