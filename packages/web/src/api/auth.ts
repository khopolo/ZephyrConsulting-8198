import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { runableManagedAuth } from "@runablehq/managed-auth/server";
import { db } from "./database";
import { authMailCallbacks, unavailableTransport } from './services/email';

const mail = authMailCallbacks(unavailableTransport, process.env.WEBSITE_URL!);

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true, minPasswordLength: 12, maxPasswordLength: 128,
    sendResetPassword: mail.sendResetPassword,
    resetPasswordTokenExpiresIn: 1800,
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendVerificationEmail: mail.sendVerificationEmail,
    sendOnSignUp: false, sendOnSignIn: false,
    expiresIn: 1800, autoSignInAfterVerification: false,
  },
  trustedOrigins: [process.env.WEBSITE_URL!, ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:4200'])],
  rateLimit: {
    enabled: true, storage: "database", window: 60, max: 30,
    customRules: {
      '/request-password-reset': { window: 60, max: 3 },
      '/send-verification-email': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },
    },
  },
  plugins: [
    ...runableManagedAuth({
      applicationId: process.env.APPLICATION_ID!,
      issuer: process.env.VITE_RUNABLE_AUTH_ISSUER!,
    }),
  ],
});
