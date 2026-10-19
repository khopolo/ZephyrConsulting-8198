export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  purpose: 'verification' | 'password-reset';
}
export interface EmailTransport {
  send(message: EmailMessage): Promise<{ accepted: true; reference?: string }>;
}
export class EmailUnavailableError extends Error {
  constructor() { super('Transactional email is not configured. Contact support.'); }
}
// A provider must be selected before a production adapter is installed. Env flags
// cannot activate mail or accidentally enable a test capture transport.
export const unavailableTransport: EmailTransport = {
  async send() { throw new EmailUnavailableError(); },
};

export function authMailCallbacks(transport: EmailTransport, origin: string) {
  const send = async (purpose: EmailMessage['purpose'], data: { user: { email: string }; url: string }) => {
    const url = new URL(data.url);
    if (url.origin !== new URL(origin).origin || !url.pathname.startsWith('/api/auth/')) throw new Error('Invalid authentication mail destination');
    const subject = purpose === 'verification' ? 'Verify your Zephyr email address' : 'Reset your Zephyr password';
    await transport.send({
      to: data.user.email,
      purpose,
      subject,
      text: `${subject}\n\n${url.href}\n\nThis link expires in 30 minutes. If you did not request this, ignore this message.`,
    });
  };
  return {
    sendResetPassword: (data: { user: { email: string }; url: string }) => send('password-reset', data),
    sendVerificationEmail: (data: { user: { email: string }; url: string }) => send('verification', data),
  };
}