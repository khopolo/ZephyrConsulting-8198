import { expect, test } from 'bun:test';
import { createClient } from '@libsql/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from '../packages/web/node_modules/drizzle-orm/libsql/index.js';
import { eq } from '../packages/web/node_modules/drizzle-orm/index.js';
import * as s from '../packages/web/src/api/database/schema';
import { createAppLinking, signIntegration, validateIntegration, type IntegrationPayload } from '../packages/web/src/api/services/app-linking';

const credential = { id: 'isolated_credential', productId: 'safespace' as const, environment: 'sandbox' as const, secret: 'isolated-secret-that-is-at-least-thirty-two-characters' };
const clock = 1800000000000;
let sequence = 0;
const payload = (changes: Partial<IntegrationPayload> = {}): IntegrationPayload => ({ version: 1, action: 'check', productId: 'safespace', environment: 'sandbox', credentialId: credential.id, timestamp: clock, nonce: `isolated_nonce_${String(++sequence).padStart(12, '0')}`, destinationUserId: 'destination-a', ...changes });
async function fixture() {
  // libsql transaction rollback can replace an in-memory connection. Use a
  // unique disposable file so rollback tests exercise the actual adapter.
  const directory = mkdtempSync(join(tmpdir(), 'zephyr-linking-'));
  const client = createClient({ url: `file:${join(directory, 'isolated.db')}` });
  for (const file of ['0000_eminent_slayback.sql', '0001_secure_sales.sql']) {
    for (const statement of (await Bun.file(`packages/web/drizzle/${file}`).text()).split('--> statement-breakpoint').map(v => v.trim()).filter(Boolean)) await client.execute(statement);
  }
  const db = drizzle(client, { schema: s });
  for (const id of ['owner-a', 'owner-b']) {
    await db.insert(s.user).values({ id, name: id, email: `${id}@example.test`, emailVerified: true });
    await db.insert(s.profiles).values({ id });
  }
  for (const id of ['safespace', 'shiftmate']) await db.insert(s.products).values({ id, name: id, description: 'isolated', status: 'active' });
  await db.insert(s.integrationCredentials).values({ id: credential.id, productId: credential.productId, environment: credential.environment, status: 'active' });
  let time = clock;
  const service = createAppLinking(db, () => time, () => true);
  const send = (p: IntegrationPayload) => service.handle(p, signIntegration(p, credential.secret), credential);
  const link = async (owner = 'owner-a', destination = 'destination-a') => {
    const code = await service.issue(owner, 'safespace', 'sandbox');
    return send(payload({ action: 'redeem', code: code.code, destinationUserId: destination, timestamp: time }));
  };
  return { client: { close() { client.close(); rmSync(directory, { recursive: true, force: true }); } }, db, service, send, link, setTime: (value: number) => { time = value; } };
}

test('HMAC protocol rejects tampering, wrong scope, stale/future time and malformed payload', () => {
  const p = payload();
  const signature = signIntegration(p, credential.secret);
  expect(validateIntegration(p, signature, credential, clock)).toEqual(p);
  for (const changed of [{ ...p, destinationUserId: 'attacker' }, { ...p, environment: 'live' }, { ...p, productId: 'shiftmate' }, { ...p, timestamp: clock - 30001 }, { ...p, timestamp: clock + 30001 }, { ...p, nonce: 'short' }, { ...p, code: 'a'.repeat(32) }, { ...p, extra: true }]) {
    expect(() => validateIntegration(changed, signature, credential, clock)).toThrow('Integration request denied');
  }
  expect(() => validateIntegration(p, 'x', credential, clock)).toThrow();
  expect(() => validateIntegration(p, signature, null, clock)).toThrow();
});

test('default integration gate denies issuance and handling without changing database', async () => {
  const f = await fixture();
  try {
    const closed = createAppLinking(f.db, () => clock);
    await expect(closed.issue('owner-a', 'safespace', 'sandbox')).rejects.toThrow();
    const p = payload();
    await expect(closed.handle(p, signIntegration(p, credential.secret), credential)).rejects.toThrow();
    expect((await f.db.select().from(s.linkCodes)).length).toBe(0);
    expect((await f.db.select().from(s.integrationNonces)).length).toBe(0);
  } finally { f.client.close(); }
});

test('link codes are hashed, superseded, expiring, one-use; nonces cannot replay', async () => {
  const f = await fixture();
  try {
    const old = await f.service.issue('owner-a', 'safespace', 'sandbox');
    const current = await f.service.issue('owner-a', 'safespace', 'sandbox');
    expect(JSON.stringify(await f.db.select().from(s.linkCodes))).not.toContain(current.code);
    await expect(f.send(payload({ action: 'redeem', code: old.code }))).rejects.toThrow();
    const p = payload({ action: 'redeem', code: current.code });
    expect(await f.send(p)).toEqual({ linked: true, productId: 'safespace', environment: 'sandbox' });
    await expect(f.send(p)).rejects.toThrow();
    await expect(f.send(payload({ action: 'redeem', code: current.code }))).rejects.toThrow();
    const expired = await f.service.issue('owner-b', 'safespace', 'sandbox');
    f.setTime(clock + 60000);
    await expect(f.send(payload({ action: 'redeem', code: expired.code, timestamp: clock + 60000 }))).rejects.toThrow();
    expect((await f.db.select().from(s.identityLinks)).length).toBe(1);
  } finally { f.client.close(); }
});

test('one-to-one binding and rejected redemption roll back code and nonce together', async () => {
  const f = await fixture();
  try {
    await f.link();
    const code = await f.service.issue('owner-b', 'safespace', 'sandbox');
    const rejected = payload({ action: 'redeem', code: code.code });
    await expect(f.send(rejected)).rejects.toThrow();
    expect((await f.db.select().from(s.linkCodes)).find(c => c.customerId === 'owner-b')?.consumedAt).toBeNull();
    expect((await f.db.select().from(s.integrationNonces)).length).toBe(1);
    expect((await f.send({ ...rejected, destinationUserId: 'destination-b' })).linked).toBe(true);
    const ownerCode = await f.service.issue('owner-a', 'safespace', 'sandbox');
    await expect(f.send(payload({ action: 'redeem', code: ownerCode.code, destinationUserId: 'destination-c' }))).rejects.toThrow();
  } finally { f.client.close(); }
});

test('unverified/missing/suspended profiles and disabled credentials fail closed', async () => {
  const f = await fixture();
  try {
    await f.db.update(s.user).set({ emailVerified: false }).where(eq(s.user.id, 'owner-a'));
    await expect(f.service.issue('owner-a', 'safespace', 'sandbox')).rejects.toThrow();
    await f.db.update(s.user).set({ emailVerified: true }).where(eq(s.user.id, 'owner-a'));
    const code = await f.service.issue('owner-a', 'safespace', 'sandbox');
    await f.db.update(s.profiles).set({ status: 'suspended' }).where(eq(s.profiles.id, 'owner-a'));
    await expect(f.send(payload({ action: 'redeem', code: code.code }))).rejects.toThrow();
    await f.db.delete(s.profiles).where(eq(s.profiles.id, 'owner-a'));
    await expect(f.service.issue('owner-a', 'safespace', 'sandbox')).rejects.toThrow();
    await f.db.update(s.integrationCredentials).set({ status: 'disabled' });
    await expect(f.send(payload())).rejects.toThrow();
    expect((await f.db.select().from(s.integrationNonces)).length).toBe(0);
  } finally { f.client.close(); }
});

test('valid alternate credentials cannot redeem a code across product or environment', async () => {
  const f = await fixture();
  try {
    const code = await f.service.issue('owner-a', 'safespace', 'sandbox');
    for (const alternate of [{ ...credential, id: 'shiftmate_credential', productId: 'shiftmate' as const }, { ...credential, id: 'live_credential', environment: 'live' as const }]) {
      await f.db.insert(s.integrationCredentials).values({ id: alternate.id, productId: alternate.productId, environment: alternate.environment, status: 'active' });
      const p = payload({ action: 'redeem', code: code.code, credentialId: alternate.id, productId: alternate.productId, environment: alternate.environment });
      await expect(f.service.handle(p, signIntegration(p, alternate.secret), alternate)).rejects.toThrow();
    }
    expect((await f.db.select().from(s.linkCodes))[0].consumedAt).toBeNull();
    expect((await f.db.select().from(s.integrationNonces)).length).toBe(0);
    expect((await f.send(payload({ action: 'redeem', code: code.code }))).linked).toBe(true);
  } finally { f.client.close(); }
});

test('access requires matching paid event, ledger, terms and current finite grant; revocation takes effect', async () => {
  const f = await fixture();
  try {
    await f.link();
    const check = async () => (await f.send(payload())).allowed;
    expect(await check()).toBe(false);
    await f.db.insert(s.plans).values({ id: 'safe-plan', productId: 'safespace', name: 'isolated', price: 10000, interval: 'once' });
    await f.db.insert(s.termsVersions).values({ id: 'terms-a', documentId: 'eula', productId: 'safespace', content: 'isolated', contentHash: 'test' });
    await f.db.insert(s.orders).values({ id: 'order-a', customerId: 'owner-a', productId: 'safespace', planId: 'safe-plan', amount: 10000, currency: 'ZAR', status: 'paid', environment: 'sandbox', snapshot: '{"test":true}', termsVersionId: 'terms-a' });
    await f.db.insert(s.entitlements).values({ id: 'grant-a', customerId: 'owner-a', productId: 'safespace', orderId: 'order-a', environment: 'sandbox', sourceKey: 'sandbox:payment-a', status: 'active', validFrom: clock - 1000, validUntil: clock + 10000 });
    expect(await check()).toBe(false);
    await f.db.insert(s.paymentEvents).values({ id: 'event-a', providerEventId: 'sandbox:event-a', orderId: 'order-a', type: 'COMPLETE', environment: 'sandbox', verified: true });
    await f.db.insert(s.paymentLedger).values({ eventId: 'event-a', orderId: 'order-a', providerPaymentKey: 'sandbox:payment-a', environment: 'sandbox', amount: 10000, currency: 'ZAR', status: 'paid', periodStart: clock - 1000, periodEnd: clock + 10000 });
    expect(await check()).toBe(false);
    await f.db.insert(s.termsAcceptances).values({ customerId: 'owner-a', orderId: 'order-a', termsVersionId: 'terms-a' });
    expect(await check()).toBe(true);
    for (const values of [{ status: 'refunded' }, { status: 'paid', environment: 'live' }, { status: 'paid', environment: 'sandbox', amount: 1 }]) {
      await f.db.update(s.paymentLedger).set(values);
      expect(await check()).toBe(false);
    }
    await f.db.update(s.paymentLedger).set({ status: 'paid', environment: 'sandbox', amount: 10000 });
    await f.db.update(s.entitlements).set({ status: 'revoked' });
    expect(await check()).toBe(false);
    await f.db.update(s.entitlements).set({ status: 'active', validUntil: null });
    expect(await check()).toBe(false);
    await f.db.update(s.entitlements).set({ validUntil: clock + 10000 });
    await f.db.update(s.profiles).set({ status: 'suspended' }).where(eq(s.profiles.id, 'owner-a'));
    expect(await check()).toBe(false);
    await f.db.update(s.profiles).set({ status: 'active' }).where(eq(s.profiles.id, 'owner-a'));
    f.setTime(clock + 10000);
    expect((await f.send(payload({ timestamp: clock + 10000 }))).allowed).toBe(false);
  } finally { f.client.close(); }
});