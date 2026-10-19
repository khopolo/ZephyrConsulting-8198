import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";
export * from "./auth-schema";
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now());
export const profiles = sqliteTable("customer_profile", {
  id: text("id")
    .primaryKey()
    .references(() => user.id),
  status: text("status").notNull().default("active"),
  createdAt: createdAt(),
});
export const products = sqliteTable("product", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("in_review"),
  features: text("features").notNull().default("[]"),
  instructions: text("instructions")
    .notNull()
    .default("Installation instructions will be published after compatibility testing."),
});
export const plans = sqliteTable("plan", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  currency: text("currency").notNull().default("ZAR"),
  interval: text("interval").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});
export const orders = sqliteTable(
  "customer_order",
  {
    id: id(),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("pending"),
    providerRef: text("provider_ref"),
    environment: text("environment").notNull().default("disabled"),
    idempotencyKey: text("idempotency_key").unique(),
    snapshot: text("snapshot"),
    termsVersionId: text("terms_version_id"),
    createdAt: createdAt(),
  },
  (t) => [index("orders_customer").on(t.customerId)],
);
export const paymentEvents = sqliteTable("payment_event", {
  id: id(),
  providerEventId: text("provider_event_id").notNull().unique(),
  orderId: text("order_id").references(() => orders.id),
  type: text("type").notNull(),
  environment: text("environment").notNull().default("disabled"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});
export const subscriptions = sqliteTable(
  "subscription",
  {
    id: id(),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    providerRef: text("provider_ref").unique(),
    status: text("status").notNull(),
    renewsAt: integer("renews_at"),
    expiresAt: integer("expires_at"),
    environment: text("environment").notNull().default("disabled"),
    snapshot: text("snapshot"),
    paidThrough: integer("paid_through"),
    cancellationState: text("cancellation_state").notNull().default("none"),
    createdAt: createdAt(),
  },
  (t) => [index("subscriptions_customer").on(t.customerId)],
);
export const entitlements = sqliteTable(
  "entitlement",
  {
    id: id(),
    customerId: text("customer_id")
      .notNull()
      .references(() => user.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    orderId: text("order_id").references(() => orders.id),
    subscriptionId: text("subscription_id").references(() => subscriptions.id),
    status: text("status").notNull(),
    validFrom: integer("valid_from").notNull(),
    validUntil: integer("valid_until"),
    environment: text("environment").notNull().default("disabled"),
    sourceKey: text("source_key").unique(),
    createdAt: createdAt(),
  },
  (t) => [index("entitlements_customer_product").on(t.customerId, t.productId)],
);
export const tickets = sqliteTable(
  "support_ticket",
  {
    id: id(),
    customerId: text("customer_id").references(() => user.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    response: text("response"),
    status: text("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: createdAt(),
  },
  (t) => [index("tickets_customer").on(t.customerId)],
);
export const settings = sqliteTable("setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const legal = sqliteTable("legal_page", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  updatedAt: createdAt(),
});
export const audit = sqliteTable("audit_log", {
  id: id(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id").notNull(),
  createdAt: createdAt(),
});
export const limits = sqliteTable("request_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetsAt: integer("resets_at").notNull(),
});

// Legacy records default to disabled: migration must never manufacture a live grant.
export const planVersions = sqliteTable("plan_version", {
  id: id(),
  planId: text("plan_id").notNull().references(() => plans.id),
  snapshot: text("snapshot").notNull(),
  actorId: text("actor_id").notNull(),
  createdAt: createdAt(),
});
export const termsVersions = sqliteTable("terms_version", {
  id: id(),
  documentId: text("document_id").notNull(),
  productId: text("product_id").references(() => products.id),
  content: text("content").notNull(),
  contentHash: text("content_hash").notNull(),
  status: text("status").notNull().default("draft"),
  reviewedBy: text("reviewed_by"),
  reviewEvidence: text("review_evidence"),
  publishedAt: integer("published_at"),
  createdAt: createdAt(),
});
export const termsAcceptances = sqliteTable("terms_acceptance", {
  id: id(),
  customerId: text("customer_id").notNull().references(() => user.id),
  orderId: text("order_id").notNull().unique().references(() => orders.id),
  termsVersionId: text("terms_version_id").notNull().references(() => termsVersions.id),
  createdAt: createdAt(),
});
export const paymentLedger = sqliteTable("payment_ledger", {
  id: id(),
  eventId: text("event_id").notNull().unique().references(() => paymentEvents.id),
  orderId: text("order_id").notNull().references(() => orders.id),
  subscriptionId: text("subscription_id").references(() => subscriptions.id),
  providerPaymentKey: text("provider_payment_key").notNull().unique(),
  environment: text("environment").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  periodStart: integer("period_start"),
  periodEnd: integer("period_end"),
  createdAt: createdAt(),
});
export const linkCodes = sqliteTable("app_link_code", {
  id: id(),
  codeHash: text("code_hash").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => user.id),
  productId: text("product_id").notNull().references(() => products.id),
  environment: text("environment").notNull(),
  expiresAt: integer("expires_at").notNull(),
  consumedAt: integer("consumed_at"),
  createdAt: createdAt(),
});
export const identityLinks = sqliteTable("app_identity_link", {
  id: id(),
  customerProductKey: text("customer_product_key").notNull().unique(),
  destinationKey: text("destination_key").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => user.id),
  productId: text("product_id").notNull().references(() => products.id),
  environment: text("environment").notNull(),
  destinationUserId: text("destination_user_id").notNull(),
  credentialId: text("credential_id").notNull(),
  createdAt: createdAt(),
});
export const integrationNonces = sqliteTable("integration_nonce", {
  key: text("key").primaryKey(),
  expiresAt: integer("expires_at").notNull(),
});
export const integrationCredentials = sqliteTable("integration_credential", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id),
  environment: text("environment").notNull(),
  status: text("status").notNull().default("disabled"),
  createdAt: createdAt(),
});
export const readinessEvidence = sqliteTable("readiness_evidence", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id),
  environment: text("environment").notNull(),
  gate: text("gate").notNull(),
  deploymentVersion: text("deployment_version").notNull(),
  reference: text("reference").notNull(),
  verifiedAt: integer("verified_at").notNull(),
  actorId: text("actor_id").notNull(),
  createdAt: createdAt(),
});
export const reconciliationJobs = sqliteTable("reconciliation_job", {
  id: id(),
  subscriptionId: text("subscription_id").notNull().references(() => subscriptions.id),
  environment: text("environment").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: integer("next_attempt_at").notNull(),
  evidence: text("evidence"),
  createdAt: createdAt(),
});

/**
 * Define your database schema here, then apply it with `bun run db:push`
 * (from packages/web). Re-export any generated schema from this file
 * (e.g. Better Auth's auth-schema.ts) so drizzle generates complete migrations.
 * Table patterns and conventions: skills/app/references/api.md
 */
