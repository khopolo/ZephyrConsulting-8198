import { expect, test } from 'bun:test';
import { apiParameterString, apiSignature, createPayfastApi } from '../packages/web/src/api/services/payfast-api';

const token = 'dc0521d3-55fe-269b-fa00-b647310d760f';
const config = { environment: 'sandbox' as const, merchantId: '10000100', passphrase: 'test passphrase' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const wrap = (response: unknown) => ({ code: 200, status: 'success', data: { response } });
const subscription = { token, amount: 3999, cycles: 0, cycles_complete: 1, frequency: 3, run_date: '2026-11-15T00:00:00+02:00', status: 1, status_text: 'ACTIVE' };
const mock = (value: unknown, status = 200) => (async () => json(value, status)) as typeof fetch;

test('API canonicalization alphabetizes including passphrase, excludes testing and preserves spaces', () => {
  const fields = [['version', 'v1'], ['testing', 'true'], ['timestamp', '2026-10-15T12:00:00+02:00'], ['merchant-id', '10000100'], ['empty', '']] as const;
  expect(apiParameterString(fields, 'test passphrase')).toBe('merchant-id=10000100&passphrase=test+passphrase&timestamp=2026-10-15T12%3A00%3A00%2B02%3A00&version=v1');
  // Independently calculated with Python hashlib, not this signing function.
  expect(apiSignature(fields, 'test passphrase')).toBe('4636bed4e9a8a69c6135ca72ca50edcf');
  expect(apiSignature(fields, 'test passphrase')).toBe(apiSignature([...fields].reverse(), 'test passphrase'));
  expect(apiSignature([['merchant-id', '10000100']], ' test ')).not.toBe(apiSignature([['merchant-id', '10000100']], 'test'));
  expect(() => apiSignature([['version', 'v1'], ['version', 'v2']], 'test')).toThrow();
});

test('subscription fetch uses fixed HTTPS host, sandbox query, signed headers and bounded request', async () => {
  let url = ''; let init: RequestInit | undefined;
  const request = (async (input: RequestInfo | URL, options?: RequestInit) => { url = String(input); init = options; return json(wrap(subscription)); }) as typeof fetch;
  const result = await createPayfastApi(config, request, () => Date.UTC(2026, 9, 15, 12)).fetchSubscription(token);
  expect(result.amount).toBe(3999);
  expect(url).toBe(`https://api.payfast.co.za/subscriptions/${token}/fetch?testing=true`);
  expect(init?.method).toBe('GET'); expect(init?.redirect).toBe('error'); expect(init?.signal).toBeInstanceOf(AbortSignal);
  const headers = new Headers(init?.headers);
  expect(headers.get('timestamp')).toBe('2026-10-15T12:00:00+00:00');
  expect(headers.get('signature')).toBe(apiSignature([['merchant-id', config.merchantId], ['version', 'v1'], ['timestamp', headers.get('timestamp')!]], config.passphrase));
  expect(JSON.stringify(init)).not.toContain(config.passphrase);
});

test('cancel accepts only true provider confirmation and uses PUT; live has no testing query', async () => {
  let path = ''; let method = '';
  const request = (async (input: RequestInfo | URL, init?: RequestInit) => { path = String(input); method = init?.method ?? ''; return json(wrap(true)); }) as typeof fetch;
  expect(await createPayfastApi({ ...config, environment: 'live' }, request).cancelSubscription(token)).toEqual({ confirmed: true });
  expect(path).toBe(`https://api.payfast.co.za/subscriptions/${token}/cancel`); expect(method).toBe('PUT');
  for (const response of [false, 'true', {}, null]) await expect(createPayfastApi(config, mock(wrap(response))).cancelSubscription(token)).rejects.toThrow();
});

test('disabled/invalid configuration and path injection never reach network', async () => {
  let calls = 0;
  const request = (async () => { calls++; return json(wrap(subscription)); }) as typeof fetch;
  for (const settings of [{ ...config, environment: 'disabled' as const }, { ...config, merchantId: 'invalid' }, { ...config, passphrase: '' }]) await expect(createPayfastApi(settings, request).fetchSubscription(token)).rejects.toThrow();
  for (const input of ['../cancel', `${token}?testing=false`, 'https://attacker.test', `${token}/cancel`]) await expect(createPayfastApi(config, request).fetchSubscription(input)).rejects.toThrow();
  expect(calls).toBe(0);
});

test('bad HTTP/envelopes/content, mismatched token, oversized bodies and transport failures fail closed', async () => {
  for (const response of [wrap({ ...subscription, token: 'ac0521d3-55fe-269b-fa00-b647310d760f' }), wrap({ ...subscription, amount: '3999' }), wrap({ ...subscription, run_date: 'tomorrow' }), { code: 200, status: 'failed', data: { response: subscription } }]) await expect(createPayfastApi(config, mock(response)).fetchSubscription(token)).rejects.toThrow();
  await expect(createPayfastApi(config, mock(wrap(subscription), 503)).fetchSubscription(token)).rejects.toThrow();
  const badText = (async () => new Response('not JSON')) as typeof fetch;
  await expect(createPayfastApi(config, badText).fetchSubscription(token)).rejects.toThrow();
  await expect(createPayfastApi(config, mock(wrap('x'.repeat(32769)))).fetchSubscription(token)).rejects.toThrow();
  const timeout = (async () => { throw new Error('secret-bearing provider failure'); }) as unknown as typeof fetch;
  await expect(createPayfastApi(config, timeout).cancelSubscription(token)).rejects.toThrow('Payfast API operation could not be verified.');
});

test('credit-card query validates integer cents and payment identity without creating grants', async () => {
  const response = { pf_payment_id: 69, m_payment_id: 232345, status: 'COMPLETE', amount: 3600 };
  expect(await createPayfastApi(config, mock(wrap(response))).queryCreditCardPayment('69')).toEqual({ ...response, pf_payment_id: '69', m_payment_id: '232345' });
  await expect(createPayfastApi(config, mock(wrap(response))).queryCreditCardPayment('70')).rejects.toThrow();
  await expect(createPayfastApi(config, mock(wrap({ ...response, amount: 3.5 }))).queryCreditCardPayment('69')).rejects.toThrow();
});