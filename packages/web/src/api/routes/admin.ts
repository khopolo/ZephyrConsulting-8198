import { z } from "zod";
import { ORPCError } from '@orpc/server';
import { createHash } from 'node:crypto';
import { eq, desc } from "drizzle-orm";
import { admin as protectedAdmin } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
const record = (actorId: string, action: string, targetId: string) =>
  db.insert(s.audit).values({ actorId, action, targetId });
export const admin = {
  overview: protectedAdmin.handler(async () => ({
    products: await db.select().from(s.products),
    plans: await db.select().from(s.plans),
    tickets: await db.select().from(s.tickets).orderBy(desc(s.tickets.createdAt)),
    orders: await db.select().from(s.orders),
    subscriptions: await db.select().from(s.subscriptions),
    entitlements: await db.select().from(s.entitlements),
    profiles: await db.select().from(s.profiles),
    legal: await db.select().from(s.legal),
    settings: await db.select().from(s.settings),
    audit: await db.select().from(s.audit).orderBy(desc(s.audit.createdAt)).limit(100),
    blockers: [
      "Payfast credentials and sandbox verification",
      "Base44 URLs and destination-side entitlement enforcement",
      "Verified product features and signed Android builds",
      "Transactional email delivery",
      "Legal review and verified company details",
    ],
  })),
  plan: protectedAdmin
    .input(
      z.object({
        id: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
        productId: z.enum(["safespace", "shiftmate"]),
        name: z.string().trim().min(2).max(80),
        price: z.number().int().min(500).max(10000000),
        interval: z.enum(["once", "month", "year"]),
        active: z.boolean(),
      }),
    )
    .handler(async ({ input, context }) => {
      await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(s.plans).where(eq(s.plans.id, input.id));
        if (existing && existing.productId !== input.productId) throw new ORPCError('BAD_REQUEST', { message: 'A plan cannot change product. Create a new plan ID.' });
        if (existing) await tx.insert(s.planVersions).values({ planId: existing.id, snapshot: JSON.stringify(existing), actorId: context.user.id });
        await tx
          .insert(s.plans)
          .values({ ...input, currency: "ZAR" })
          .onConflictDoUpdate({ target: s.plans.id, set: input });
        await tx.insert(s.planVersions).values({ planId: input.id, snapshot: JSON.stringify({ ...input, currency: 'ZAR' }), actorId: context.user.id });
        await tx
          .insert(s.audit)
          .values({ actorId: context.user.id, action: "plan.updated", targetId: input.id });
      });
      return { ok: true };
    }),
  product: protectedAdmin
    .input(
      z.object({
        id: z.enum(["safespace", "shiftmate"]),
        description: z.string().min(10).max(5000),
        status: z.enum(["in_review", "disabled"]),
        features: z.string().max(10000).superRefine((value, context) => {
          try { z.array(z.string().trim().min(1).max(300)).max(30).parse(JSON.parse(value)); }
          catch { context.addIssue({ code: 'custom', message: 'Features must be a JSON array of up to 30 short text entries.' }); }
        }),
        instructions: z.string().max(10000),
      }),
    )
    .handler(async ({ input, context }) => {
      await db.update(s.products).set(input).where(eq(s.products.id, input.id));
      await record(context.user.id, "product.updated", input.id);
      return { ok: true };
    }),
  ticket: protectedAdmin
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["open", "in_progress", "resolved"]),
        response: z.string().max(5000),
      }),
    )
    .handler(async ({ input, context }) => {
      await db
        .update(s.tickets)
        .set({ status: input.status, response: input.response, updatedAt: Date.now() })
        .where(eq(s.tickets.id, input.id));
      await record(context.user.id, "ticket.updated", input.id);
      return { ok: true };
    }),
  legal: protectedAdmin
    .input(z.object({ id: z.string().max(60), content: z.string().min(20).max(30000) }))
    .handler(async ({ input, context }) => {
      await db.transaction(async tx => {
        await tx.update(s.legal).set({ content: input.content, updatedAt: Date.now() }).where(eq(s.legal.id, input.id));
        await tx.insert(s.termsVersions).values({ documentId: input.id, content: input.content, contentHash: createHash('sha256').update(input.content).digest('hex'), status: 'draft' });
        await tx.insert(s.audit).values({ actorId: context.user.id, action: 'legal.draft-version-created', targetId: input.id });
      });
      return { ok: true };
    }),
  setting: protectedAdmin
    .input(
      z.object({
        key: z.enum([
          "contactEmail",
          "supportEmail",
          "phone",
          "address",
          "registrationNumber",
          "informationOfficer",
        ]),
        value: z.string().trim().max(500),
      }),
    )
    .handler(async ({ input, context }) => {
      if (input.value) {
        if (['contactEmail', 'supportEmail'].includes(input.key) && !z.string().email().safeParse(input.value).success) throw new ORPCError('BAD_REQUEST', { message: 'Enter a valid email address.' });
        if (input.key === 'phone' && !/^\+?[0-9 ()-]{7,25}$/.test(input.value)) throw new ORPCError('BAD_REQUEST', { message: 'Enter a valid phone number.' });
      }
      await db
        .insert(s.settings)
        .values(input)
        .onConflictDoUpdate({ target: s.settings.key, set: { value: input.value } });
      await record(context.user.id, "setting.updated", input.key);
      return { ok: true };
    }),
  revoke: protectedAdmin
    .input(z.object({ id: z.string(), reason: z.string().min(10).max(500) }))
    .handler(async ({ input, context }) => {
      await db
        .update(s.entitlements)
        .set({ status: "revoked", validUntil: Date.now() })
        .where(eq(s.entitlements.id, input.id));
      await record(context.user.id, "entitlement.revoked: " + input.reason, input.id);
      return { ok: true };
    }),
};
