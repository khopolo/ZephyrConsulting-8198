import { test, expect } from 'bun:test';
import { createClient } from '@libsql/client';
import { drizzle } from '../packages/web/node_modules/drizzle-orm/libsql/index.js';
import { betterAuth } from '../packages/web/node_modules/better-auth/dist/index.mjs';
import { drizzleAdapter } from '../packages/web/node_modules/better-auth/dist/adapters/drizzle-adapter/index.mjs';
import * as schema from '../packages/web/src/api/database/schema';
import { authMailCallbacks, type EmailMessage } from '../packages/web/src/api/services/email';

test('isolated Better Auth verification, reset, expiry, one-use and session revocation', async () => {
  // No provisioned database or production transport is imported.
  const client = createClient({ url: 'file::memory:' });
  for (const file of ['0000_eminent_slayback.sql', '0001_secure_sales.sql']) {
    const sql = await Bun.file(`packages/web/drizzle/${file}`).text();
    for (const statement of sql.split('--> statement-breakpoint').map(v => v.trim()).filter(Boolean)) await client.execute(statement);
  }
  const database = drizzle(client, { schema });
  const messages: EmailMessage[] = [];
  const mail = authMailCallbacks({ async send(message) { messages.push(message); return { accepted: true }; } }, 'http://localhost:4200');
  const auth = betterAuth({
    baseURL: 'http://localhost:4200', basePath: '/api/auth',
    secret: 'isolated-test-secret-at-least-thirty-two-characters',
    database: drizzleAdapter(database, { provider: 'sqlite' }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, sendResetPassword: mail.sendResetPassword, resetPasswordTokenExpiresIn: 1800, revokeSessionsOnPasswordReset: true },
    emailVerification: { sendVerificationEmail: mail.sendVerificationEmail, sendOnSignUp: false, expiresIn: 1800, autoSignInAfterVerification: false },
    trustedOrigins: ['http://localhost:4200'], rateLimit: { enabled: false },
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    logger: { disabled: true },
  });
  const request = (path: string, body?: unknown, cookie?: string) => auth.handler(new Request(`http://localhost:4200/api/auth/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:4200', ...(cookie ? { cookie } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }));
  const email = 'isolated@example.test';
  expect((await request('sign-up/email', { email, password: 'original-password-123', name: 'Isolated Test' })).status).toBe(200);
  const signIn = await request('sign-in/email', { email, password: 'original-password-123' });
  expect(signIn.status).toBe(200);
  const cookie = signIn.headers.get('set-cookie')!.split(';')[0];
  expect((await request('get-session', undefined, cookie)).status).toBe(200);
  expect((await request('send-verification-email', { email, callbackURL: 'http://localhost:4200/verify-email' }, cookie)).status).toBe(200);
  const verificationURL = new URL(messages.at(-1)!.text.split('\n\n')[1]);
  const verify = await auth.handler(new Request(verificationURL));
  expect(verify.status).toBe(302);
  const verified = await client.execute('SELECT email_verified FROM user WHERE email = ?', [email]);
  expect(Number(verified.rows[0].email_verified)).toBe(1);
  // Better Auth verification JWT replay is a no-op, not a rejected single-use token.
  expect((await auth.handler(new Request(verificationURL))).status).toBe(302);
  expect((await request('verify-email?token=malformed')).status).toBe(401);
  const existent = await request('request-password-reset', { email, redirectTo: 'http://localhost:4200/reset-password' });
  const absent = await request('request-password-reset', { email: 'absent@example.test', redirectTo: 'http://localhost:4200/reset-password' });
  expect(existent.status).toBe(200); expect(absent.status).toBe(200);
  expect(await existent.json()).toEqual(await absent.json());
  const resetURL = new URL(messages.at(-1)!.text.split('\n\n')[1]);
  const token = resetURL.pathname.split('/').at(-1)!;
  expect((await request('reset-password', { token, newPassword: 'replacement-password-456' })).status).toBe(200);
  expect((await request('reset-password', { token, newPassword: 'replacement-password-456' })).status).toBe(400);
  expect(await (await request('get-session', undefined, cookie)).json()).toBeNull();
  expect((await request('sign-in/email', { email, password: 'original-password-123' })).status).toBe(401);
  expect((await request('sign-in/email', { email, password: 'replacement-password-456' })).status).toBe(200);
  const accounts = await client.execute('SELECT password FROM account');
  expect(String(accounts.rows[0].password)).not.toContain('replacement-password-456');
  await request('request-password-reset', { email });
  const expiredURL = new URL(messages.at(-1)!.text.split('\n\n')[1]);
  const expiredToken = expiredURL.pathname.split('/').at(-1)!;
  await client.execute({ sql: 'UPDATE verification SET expires_at = ? WHERE identifier = ?', args: [Date.now() - 10000, `reset-password:${expiredToken}`] });
  expect((await request('reset-password', { token: expiredToken, newPassword: 'replacement-password-789' })).status).toBe(400);
  expect((await request('request-password-reset', { email, redirectTo: 'https://attacker.test/reset-password' })).status).toBe(403);
  client.close();
}, 30000);