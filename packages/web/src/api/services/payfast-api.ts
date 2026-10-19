import { createHash } from 'node:crypto';
import { z } from 'zod';
import { payfastEncode, type Fields } from './payfast';

// API signatures sort alphabetically; custom checkout signatures do not.
export function apiParameterString(fields: Fields, passphrase: string) {
  const values = new Map<string, string>();
  for (const [key, value] of fields) {
    if (!/^[a-z][a-z0-9_-]*$/.test(key) || values.has(key) || key === 'passphrase') throw new Error('Invalid API parameters');
    values.set(key, value);
  }
  values.delete('signature');
  values.delete('testing');
  values.set('passphrase', passphrase);
  return [...values].filter(([, value]) => value !== '').sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => `${key}=${payfastEncode(value)}`).join('&');
}
export const apiSignature = (fields: Fields, passphrase: string) => createHash('md5').update(apiParameterString(fields, passphrase)).digest('hex');
export class PayfastApiUnavailable extends Error {
  constructor() { super('Payfast API operation could not be verified.'); }
}
export interface PayfastApiConfig {
  environment: 'disabled' | 'sandbox' | 'live';
  merchantId: string;
  passphrase: string;
}
const tokenPattern = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
const safeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const providerId = z.union([z.string().min(1).max(100), safeInteger]).transform(String);
const subscriptionResponse = z.object({
  amount: safeInteger, cycles: safeInteger, cycles_complete: safeInteger,
  frequency: z.number().int().min(1).max(6),
  run_date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/).refine(v => Number.isFinite(Date.parse(v))),
  status: safeInteger, status_text: z.string().min(1).max(80), token: z.string().regex(tokenPattern),
});
const paymentResponse = z.object({ pf_payment_id: providerId, m_payment_id: providerId, status: z.string().min(1).max(80), amount: safeInteger });
const envelope = z.object({ code: z.literal(200), status: z.literal('success'), data: z.object({ response: z.unknown() }) });

// No environment lookup, mutation, retry, checkout or public endpoint here.
// Cancellation timeouts are ambiguous: reconcile with fetch, never report success.
export function createPayfastApi(config: PayfastApiConfig, request: typeof fetch = fetch, now: () => number = Date.now) {
  async function call(path: string, method: 'GET' | 'PUT') {
    if (!['sandbox', 'live'].includes(config.environment) || !/^\d{8}$/.test(config.merchantId) || !config.passphrase.trim()) throw new PayfastApiUnavailable();
    try {
      const timestamp = new Date(now()).toISOString().replace('.000Z', '+00:00').replace(/\.\d{3}Z$/, '+00:00');
      const fields: Fields = [['merchant-id', config.merchantId], ['version', 'v1'], ['timestamp', timestamp]];
      const response = await request(`https://api.payfast.co.za${path}${config.environment === 'sandbox' ? '?testing=true' : ''}`, {
        method, headers: { 'merchant-id': config.merchantId, version: 'v1', timestamp, signature: apiSignature(fields, config.passphrase), accept: 'application/json' },
        redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('application/json') || !response.body) throw new PayfastApiUnavailable();
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 32768) { await reader.cancel(); throw new PayfastApiUnavailable(); }
          chunks.push(chunk.value);
        }
      } finally { reader.releaseLock(); }
      return envelope.parse(JSON.parse(Buffer.concat(chunks).toString('utf8'))).data.response;
    } catch { throw new PayfastApiUnavailable(); }
  }
  async function fetchSubscription(token: string) {
    if (!tokenPattern.test(token)) throw new PayfastApiUnavailable();
    const result = subscriptionResponse.safeParse(await call(`/subscriptions/${token}/fetch`, 'GET'));
    if (!result.success || result.data.token.toLowerCase() !== token.toLowerCase()) throw new PayfastApiUnavailable();
    return result.data;
  }
  async function cancelSubscription(token: string) {
    if (!tokenPattern.test(token)) throw new PayfastApiUnavailable();
    if (await call(`/subscriptions/${token}/cancel`, 'PUT') !== true) throw new PayfastApiUnavailable();
    return { confirmed: true as const };
  }
  // The documented query is credit-card-specific, not a universal payment proof.
  async function queryCreditCardPayment(id: string) {
    if (!tokenPattern.test(id) && !/^\d{1,20}$/.test(id)) throw new PayfastApiUnavailable();
    const result = paymentResponse.safeParse(await call(`/process/query/${id}`, 'GET'));
    if (!result.success || (/^\d+$/.test(id) && result.data.pf_payment_id !== id)) throw new PayfastApiUnavailable();
    return result.data;
  }
  return { fetchSubscription, cancelSubscription, queryCreditCardPayment };
}