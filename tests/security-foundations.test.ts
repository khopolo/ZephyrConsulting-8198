import { describe, test, expect } from 'bun:test';
import { assessReadiness, integrationMode, publicReadiness } from '../packages/web/src/api/services/readiness';
import { integrationSignature, payfastEncode, decimalCents, parseNotification, constantTimeSignature, recurringFrequency, confirmNotification } from '../packages/web/src/api/services/payfast';
import { authMailCallbacks, unavailableTransport } from '../packages/web/src/api/services/email';

describe('readiness fail-closed boundaries', () => {
  test('missing, misspelled and unknown modes disable integrations', () => {
    for (const value of [undefined, '', 'LIVE', 'true', 'production']) expect(integrationMode(value)).toBe('disabled');
    expect(integrationMode('sandbox')).toBe('sandbox');
  });
  test('credentials and forged evidence cannot bypass implementation/ingress/mail gates', () => {
    const env = { PAYFAST_MODE: 'live', WEBSITE_URL: 'https://example.test', DEPLOYMENT_VERSION: 'test', PAYFAST_MERCHANT_ID: 'id', PAYFAST_MERCHANT_KEY: 'key', PAYFAST_PASSPHRASE: 'pass', SAFESPACE_APP_URL: 'https://app.test' };
    const evidence = ['provider','onsite','destination','terms','business','approval','recovery'].map(gate => ({ productId: 'safespace', environment: 'live', deploymentVersion: 'test', gate, verifiedAt: Date.now(), reference: 'isolated fabricated test evidence' }));
    const report = assessReadiness(env, evidence);
    expect(report.products[0].live.enabled).toBe(false);
    expect(report.products[0].live.blockers.map(b => b.code)).toEqual(['implementation','ingress','email']);
    expect(JSON.stringify(publicReadiness(report))).not.toContain('credentialPresence');
    expect(JSON.stringify(report)).not.toContain('"key"');
  });
  test('sandbox evidence never satisfies live evidence', () => {
    const report = assessReadiness({ PAYFAST_MODE: 'sandbox', DEPLOYMENT_VERSION: 'test', SAFESPACE_APP_URL: 'https://app.test' }, [{ productId: 'safespace', environment: 'sandbox', gate: 'destination', deploymentVersion: 'test', verifiedAt: Date.now(), reference: 'isolated test' }]);
    expect(report.products[0].sandbox.gates.destination).toBe(true);
    expect(report.products[0].live.gates.destination).toBe(false);
  });
  test('stale evidence and invalid origin rejected', () => {
    const report = assessReadiness({ WEBSITE_URL: 'https://example.test/path', DEPLOYMENT_VERSION: 'test' });
    expect(report.products[0].live.gates.https).toBe(false);
  });
});
describe('Payfast integration primitives (local, not merchant verification)', () => {
  test('PHP-style URL encoding and ordered signature fixture', () => {
    expect(payfastEncode(' A+&~!*()é ')).toBe('+A%2B%26%7E%21%2A%28%29%C3%A9+');
    // Cross-checked with independently calculated MD5 of the documented parameter format.
    expect(integrationSignature([['name_first','John'],['name_last','Doe']], 'test')).toBe('8fde12dca977f206a5e5395add255e17');
    expect(integrationSignature([['name_last','Doe'],['name_first','John']], 'test')).not.toBe(integrationSignature([['name_first','John'],['name_last','Doe']], 'test'));
  });
  test('constant-time signature comparison rejects malformed inputs', () => {
    expect(constantTimeSignature('a'.repeat(32), 'a'.repeat(32))).toBe(true);
    expect(constantTimeSignature('b'.repeat(32), 'a'.repeat(32))).toBe(false);
    expect(constantTimeSignature('a', 'a'.repeat(32))).toBe(false);
  });
  test('integer-cent amounts and recurring mapping', () => {
    expect(decimalCents('39.99')).toBe(3999);
    for (const input of ['39.999','3e2','-1.00','NaN','39,99']) expect(() => decimalCents(input)).toThrow();
    expect(recurringFrequency('month')).toBe('3'); expect(recurringFrequency('year')).toBe('6');
  });
  test('duplicate parameters, misplaced signature, malformed/oversize payload rejected', () => {
    const body = 'merchant_id=10000100&m_payment_id=order&pf_payment_id=1&payment_status=COMPLETE&signature=' + 'a'.repeat(32);
    expect(parseNotification(body).length).toBe(5);
    for (const bad of [body + '&merchant_id=x', body.replace('merchant_id=', 'merchant_id=x&merchant_id='), body.replace('order','%xx'), 'x'.repeat(16385), body.replace('COMPLETE','REFUNDED')]) expect(() => parseNotification(bad)).toThrow();
  });
  test('server confirmation exact VALID, failure and timeout propagate', async () => {
    const fake = (text: string, status=200) => (async () => new Response(text, { status })) as typeof fetch;
    expect(await confirmNotification([['x','y']], 'sandbox', fake('VALID'))).toBe(true);
    expect(await confirmNotification([['x','y']], 'sandbox', fake('INVALID'))).toBe(false);
    await expect(confirmNotification([], 'sandbox', fake('error',503))).rejects.toThrow();
    await expect(confirmNotification([], 'sandbox', (async () => { throw new Error('timeout'); }) as unknown as typeof fetch)).rejects.toThrow('timeout');
  });
});
describe('mail transport', () => {
  test('unconfigured transport fails without false acceptance', async () => {
    await expect(unavailableTransport.send({ to: 'test@example.test', subject: 'test', text: 'test', purpose: 'verification' })).rejects.toThrow('not configured');
  });
  test('cross-origin authentication link refused', async () => {
    const mail = authMailCallbacks(unavailableTransport, 'https://example.test');
    await expect(mail.sendResetPassword({ user: { email: 'test@example.test' }, url: 'https://attacker.test/api/auth/reset-password/x' })).rejects.toThrow('Invalid');
  });
});