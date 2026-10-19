import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { base } from "../__core/app";
import { authed, isAdmin } from "../middleware/auth";
import { auth } from "../auth";
import { db } from "../database";
import * as s from "../database/schema";
import { assessReadiness, publicReadiness } from '../services/readiness';

export const store = {
  catalogue: base.handler(async () => ({
    products: await db.select().from(s.products),
    plans: await db.select().from(s.plans).where(eq(s.plans.active, true)),
    company: Object.fromEntries((await db.select().from(s.settings)).map((v) => [v.key, v.value])),
    readiness: publicReadiness(assessReadiness(process.env, await db.select().from(s.readinessEvidence))),
    checkoutEnabled: false,
    downloadsEnabled: false,
    emailDeliveryEnabled: false,
  })),
  legal: base.input(z.object({ id: z.string().max(60) })).handler(async ({ input }) => {
    const [page] = await db.select().from(s.legal).where(eq(s.legal.id, input.id));
    if (!page) throw new ORPCError("NOT_FOUND");
    return page;
  }),
  contact: base
    .input(
      z.object({
        name: z.string().trim().min(2).max(100),
        email: z.string().email().max(254),
        subject: z.string().trim().min(3).max(150),
        message: z.string().trim().min(20).max(5000),
        consent: z.literal(true),
        website: z.string().max(200).default(""),
      }),
    )
    .handler(async ({ input, context }) => {
      if (input.website)
        throw new ORPCError("BAD_REQUEST", { message: "Unable to submit this request." });
      const key = createHash("sha256").update(input.email.toLowerCase()).digest("hex");
      const now = Date.now();
      const [limit] = await db
        .insert(s.limits)
        .values({ key, count: 1, resetsAt: now + 3600000 })
        .onConflictDoUpdate({
          target: s.limits.key,
          set: {
            count: sql`CASE WHEN ${s.limits.resetsAt} < ${now} THEN 1 ELSE ${s.limits.count} + 1 END`,
            resetsAt: sql`CASE WHEN ${s.limits.resetsAt} < ${now} THEN ${now + 3600000} ELSE ${s.limits.resetsAt} END`,
          },
        })
        .returning();
      if (limit.count > 5)
        throw new ORPCError("TOO_MANY_REQUESTS", {
          message: "Too many requests. Please try again in an hour.",
        });
      const session = await auth.api.getSession({ headers: context.headers });
      const [ticket] = await db
        .insert(s.tickets)
        .values({
          name: input.name,
          email: session?.user.email ?? input.email.toLowerCase(),
          subject: input.subject,
          message: input.message,
          customerId: session?.user.id,
        })
        .returning({ id: s.tickets.id });
      return {
        reference: ticket.id,
        message:
          "Your request has been saved. Email notifications are not configured; keep this reference. Sign in before submitting to track requests in your dashboard.",
      };
    }),
  dashboard: authed.handler(async ({ context }) => ({
    user: context.user,
    admin: isAdmin(context.user.id),
    orders: await db
      .select()
      .from(s.orders)
      .where(eq(s.orders.customerId, context.user.id))
      .orderBy(desc(s.orders.createdAt)),
    tickets: await db
      .select()
      .from(s.tickets)
      .where(eq(s.tickets.customerId, context.user.id))
      .orderBy(desc(s.tickets.createdAt)),
    entitlements: await db
      .select()
      .from(s.entitlements)
      .where(eq(s.entitlements.customerId, context.user.id)),
    subscriptions: await db
      .select()
      .from(s.subscriptions)
      .where(eq(s.subscriptions.customerId, context.user.id)),
  })),
  checkout: authed.input(z.object({ planId: z.string().max(80) })).handler(async ({ input, context }) => {
    const [plan] = await db
      .select()
      .from(s.plans)
      .where(and(eq(s.plans.id, input.planId), eq(s.plans.active, true)));
    if (!plan) throw new ORPCError("NOT_FOUND", { message: "This plan is not available." });
    if (!context.user.emailVerified) throw new ORPCError('PRECONDITION_FAILED', { message: 'Verify your email before purchasing. Delivery setup is still required.' });
    // Fail closed before creating any order; neither browser state nor redirect can grant access.
    throw new ORPCError("PRECONDITION_FAILED", {
      message:
        "Checkout is not enabled. Payment verification and destination-app entitlement enforcement must be configured and tested first.",
    });
  }),
  access: authed
    .input(z.object({ productId: z.enum(["safespace", "shiftmate"]) }))
    .handler(async ({ input, context }) => {
      const list = await db
        .select()
        .from(s.entitlements)
        .where(
          and(
            eq(s.entitlements.customerId, context.user.id),
            eq(s.entitlements.productId, input.productId),
            eq(s.entitlements.status, "active"),
            eq(s.entitlements.environment, 'live'),
          ),
        );
      if (
        !list.some(
          (e) => e.validFrom <= Date.now() && (e.validUntil === null || e.validUntil > Date.now()),
        )
      )
        throw new ORPCError("FORBIDDEN", { message: "No current entitlement for this product." });
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "Destination-app integration is not verified. Product access is disabled.",
      });
    }),
};
