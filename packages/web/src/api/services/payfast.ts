import { createHash, timingSafeEqual } from 'node:crypto';

export type Fields = readonly (readonly [string, string])[];
// PHP urlencode, uppercase escapes and '+' for spaces, per Payfast integration docs.
export function payfastEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*~]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g, '+');
}
export function parameterString(fields: Fields, trim = true) {
  return fields.filter(([key, value]) => key !== 'signature' && (!trim || value !== ''))
    .map(([key, value]) => `${key}=${payfastEncode(trim ? value.trim() : value)}`).join('&');
}
export function integrationSignature(fields: Fields, passphrase: string, trim = true) {
  const values = parameterString(fields, trim);
  return createHash('md5').update(`${values}&passphrase=${payfastEncode(trim ? passphrase.trim() : passphrase)}`).digest('hex');
}
export function constantTimeSignature(actual: string, expected: string) {
  return /^[a-f0-9]{32}$/.test(actual) && /^[a-f0-9]{32}$/.test(expected) && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
export function parseNotification(body: string): [string, string][] {
  if (Buffer.byteLength(body) > 16384) throw new Error('Notification too large');
  if (/%(?![a-fA-F0-9]{2})/.test(body)) throw new Error('Malformed encoding');
  const fields: [string, string][] = [];
  const seen = new Set<string>();
  for (const pair of body.split('&')) {
    const separator = pair.indexOf('=');
    if (separator < 1) throw new Error('Malformed notification');
    const decode = (v: string) => decodeURIComponent(v.replace(/\+/g, ' '));
    const key = decode(pair.slice(0, separator));
    const value = decode(pair.slice(separator + 1));
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key) || seen.has(key) || [...value].some(c => c.charCodeAt(0) < 32)) throw new Error('Ambiguous notification');
    seen.add(key); fields.push([key, value]);
  }
  if (fields.at(-1)?.[0] !== 'signature') throw new Error('Signature must be final');
  const required = ['merchant_id', 'm_payment_id', 'pf_payment_id', 'payment_status', 'signature'];
  if (required.some(key => !fields.find(([k,v]) => k === key && v))) throw new Error('Missing notification field');
  if (!['COMPLETE','CANCELLED'].includes(Object.fromEntries(fields).payment_status)) throw new Error('Unsupported notification status');
  return fields;
}
export function decimalCents(value: string) {
  if (!/^\d{1,8}\.\d{2}$/.test(value)) throw new Error('Invalid ZAR amount');
  const [whole, decimal] = value.split('.');
  const cents = Number(whole) * 100 + Number(decimal);
  if (!Number.isSafeInteger(cents)) throw new Error('Invalid amount');
  return cents;
}
export const recurringFrequency = (interval: 'month' | 'year') => interval === 'month' ? '3' : '6';
export async function confirmNotification(fields: Fields, environment: 'sandbox' | 'live', request: typeof fetch = fetch) {
  const host = environment === 'sandbox' ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';
  const response = await request(`https://${host}/eng/query/validate`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: parameterString(fields, false), redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Payfast confirmation unavailable');
  return (await response.text()) === 'VALID';
}
// Deliberately not mounted: signature + server confirmation alone cannot satisfy
// trusted-source, immutable order, transactional ledger and renewal schedule gates.