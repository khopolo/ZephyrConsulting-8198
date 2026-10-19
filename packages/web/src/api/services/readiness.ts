export type IntegrationMode = 'disabled' | 'sandbox' | 'live';
export type ProductId = 'safespace' | 'shiftmate';
export const integrationMode = (value?: string): IntegrationMode =>
  value === 'sandbox' || value === 'live' ? value : 'disabled';

export const gateLabels: Record<string, string> = {
  implementation: 'Payment and destination lifecycle implementation still in progress',
  mode: 'Billing mode is disabled or unknown',
  credentials: 'Environment-specific Payfast credentials are missing',
  https: 'Published HTTPS website origin is required',
  ingress: 'Trusted notification source metadata is not available',
  email: 'Real verification/reset email delivery is not verified',
  destination: 'Destination backend enforcement is not independently verified',
  onsite: 'Onsite once-off and recurring checkout compatibility is not verified',
  provider: 'Reachable sandbox notifications and cancellation are not verified',
  terms: 'Reviewed product licence, prices and terms are required',
  business: 'Confirmed company disclosures are required',
  recovery: 'Production backup and recovery procedure is not reviewed',
  approval: 'Separate explicit live-launch approval is required',
};

export interface GateEvidence {
  productId: string;
  environment: string;
  gate: string;
  deploymentVersion: string;
  verifiedAt: number;
  reference: string;
}
export function assessReadiness(
  env: Record<string, string | undefined>,
  evidence: GateEvidence[] = [],
  now = Date.now(),
) {
  const mode = integrationMode(env.PAYFAST_MODE);
  let https = false;
  try {
    const url = new URL(env.WEBSITE_URL || '');
    https = url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash && !['localhost','127.0.0.1'].includes(url.hostname);
  } catch { /* Missing or malformed configuration fails closed. */ }
  const presence = (name: string) => Boolean(env[name]?.trim());
  const environmentStatus = (productId: ProductId, environment: 'sandbox' | 'live') => {
    const prefix = environment === 'sandbox' ? 'PAYFAST_SANDBOX_' : 'PAYFAST_';
    const tested = (gate: string) => Boolean(env.DEPLOYMENT_VERSION) && evidence.some(e =>
      e.productId === productId && e.environment === environment && e.gate === gate &&
      e.deploymentVersion === env.DEPLOYMENT_VERSION && e.verifiedAt <= now &&
      e.verifiedAt > now - 30 * 86400000 && e.reference.trim().length >= 10);
    const credentialPresence = {
      merchantId: presence(`${prefix}MERCHANT_ID`),
      merchantKey: presence(`${prefix}MERCHANT_KEY`),
      passphrase: presence(`${prefix}PASSPHRASE`),
    };
    const gates = {
      // Not an env toggle: remains false until lifecycle/enforcement code and tests land.
      implementation: false,
      mode: mode === environment,
      credentials: Object.values(credentialPresence).every(Boolean),
      https,
      // No caller-controlled forwarded headers can satisfy this gate.
      ingress: false,
      email: false,
      destination: presence(productId === 'safespace' ? 'SAFESPACE_APP_URL' : 'SHIFTMATE_APP_URL') && tested('destination'),
      onsite: tested('onsite'),
      provider: tested('provider'),
      terms: tested('terms'),
      business: tested('business'),
      recovery: environment === 'sandbox' || tested('recovery'),
      approval: environment === 'sandbox' || tested('approval'),
    };
    const blockers = Object.entries(gates).filter(([, ok]) => !ok).map(([code]) => ({ code, message: gateLabels[code] }));
    return { environment, enabled: blockers.length === 0, gates, blockers, credentialPresence };
  };
  return {
    mode,
    emailDeliveryEnabled: false,
    downloadsEnabled: false,
    deploymentVersionPresent: presence('DEPLOYMENT_VERSION'),
    products: (['safespace', 'shiftmate'] as const).map(productId => ({
      productId,
      sandbox: environmentStatus(productId, 'sandbox'),
      live: environmentStatus(productId, 'live'),
    })),
  };
}

export const publicReadiness = (report: ReturnType<typeof assessReadiness>) => ({
  mode: report.mode,
  emailDeliveryEnabled: report.emailDeliveryEnabled,
  downloadsEnabled: report.downloadsEnabled,
  products: report.products.map(p => ({
    productId: p.productId,
    checkoutEnabled: report.mode === 'sandbox' ? p.sandbox.enabled : report.mode === 'live' ? p.live.enabled : false,
    blockers: (report.mode === 'sandbox' ? p.sandbox : p.live).blockers,
  })),
});