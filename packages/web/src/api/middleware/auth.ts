import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { base } from "../__core/app";
import { auth } from "../auth";
import { db } from "../database";
import { profiles } from "../database/schema";
export const authed = base.use(async ({ context, next }) => {
  const origin = context.headers.get('origin');
  const allowed = [process.env.WEBSITE_URL, ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:4200'])];
  if (origin && !allowed.includes(origin)) throw new ORPCError('FORBIDDEN', { message: 'Request origin is not allowed.' });
  const session = await auth.api.getSession({ headers: context.headers });
  if (!session) throw new ORPCError("UNAUTHORIZED", { message: "Please sign in to continue." });
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, session.user.id));
  if (profile?.status === "suspended")
    throw new ORPCError("FORBIDDEN", { message: "Account suspended. Contact support." });
  await db.insert(profiles).values({ id: session.user.id }).onConflictDoNothing();
  return next({ context: { user: session.user } });
});
export const isAdmin = (id: string) =>
  (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean).includes(id);
export const admin = authed.use(({ context, next }) => {
  if (!isAdmin(context.user.id))
    throw new ORPCError("FORBIDDEN", { message: "Administrator permission required." });
  return next();
});
