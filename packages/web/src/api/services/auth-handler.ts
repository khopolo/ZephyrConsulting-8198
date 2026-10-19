import { auth } from '../auth';

export function handleAuth(request: Request) {
  const path = new URL(request.url).pathname;
  if (request.method === 'POST' && ['/api/auth/request-password-reset', '/api/auth/send-verification-email'].includes(path)) {
    // Return the same configuration failure for every identity. No token is
    // created and no account existence leaks while transport setup is missing.
    return Response.json({ code: 'EMAIL_UNAVAILABLE', message: 'Transactional email delivery is not configured.' }, { status: 503 });
  }
  return auth.handler(request);
}