import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { authClient } from '../lib/auth';
import { useCatalogue } from '../queries/store';
import { Seo, PageHero, Notice, ErrorBox } from '../components/site';

export default function Recovery() {
  const [path] = useLocation();
  const catalogue = useCatalogue();
  const session = authClient.useSession();
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [invalid] = useState(() => new URLSearchParams(window.location.search).has('error'));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const reset = path === '/reset-password';
  const verify = path === '/verify-email';
  const available = catalogue.data?.emailDeliveryEnabled === true;
  useEffect(() => {
    // Keep a recovery token only in component memory, not browser history.
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const title = reset ? 'Choose a new password.' : verify ? 'Verify your email.' : 'Recover your account.';
  return <>
    <Seo title={reset ? 'Reset password' : verify ? 'Email verification' : 'Password recovery'} />
    <PageHero eyebrow="ACCOUNT SECURITY" title={title} text="Email verification is required before purchases and product-account linking. Support remains available while delivery is being configured." />
    <section className="container section legalbody">
      {!available && <Notice>Transactional email is not configured. New verification and recovery links cannot be sent yet. No email has been sent. You can still sign in or submit a support request.</Notice>}
      {invalid && <ErrorBox message="This link is invalid or expired. Request a new link when email delivery is available." />}
      {error && <ErrorBox message={error} />}
      {message && <Notice>{message}</Notice>}
      <div className="formcard">
        {reset ? token && !invalid ? <form onSubmit={async e => {
          e.preventDefault(); setBusy(true); setError('');
          const f = new FormData(e.currentTarget);
          if (f.get('password') !== f.get('confirm')) { setError('Passwords must match.'); setBusy(false); return; }
          try {
            const r = await authClient.resetPassword({ token, newPassword: String(f.get('password')) });
            if (r.error) setError('This reset link is invalid or expired. Request a new link.');
            else setMessage('Password reset. Existing sessions have been revoked. Sign in with your new password.');
          } catch { setError('Unable to complete the reset. Please try again.'); }
          finally { setBusy(false); }
        }}>
          <label>New password<input aria-label="New password" name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
          <label>Confirm password<input aria-label="Confirm password" name="confirm" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
          <button className="btn" disabled={busy || Boolean(message)}>{busy ? 'Saving…' : 'Reset password'}</button>
        </form> : <p>No valid reset token is present. <Link href="/forgot-password">Request a new link</Link>.</p>
        : verify ? <>
          <p>{session.data?.user.emailVerified ? 'Your email address is verified.' : 'Sign in and request verification for your account email address.'}</p>
          <button className="btn" disabled={!available || busy || !session.data || session.data.user.emailVerified} onClick={async () => {
            setBusy(true); setError('');
            try {
              await authClient.sendVerificationEmail({ email: session.data!.user.email, callbackURL: `${window.location.origin}/verify-email` });
              setMessage('If verification is needed, check your email for a link.');
            } catch { setMessage('If verification is needed, check your email for a link.'); }
            finally { setBusy(false); }
          }}>Request verification email</button>
        </> : <form onSubmit={async e => {
          e.preventDefault(); setBusy(true); setError('');
          const f = new FormData(e.currentTarget);
          try { await authClient.requestPasswordReset({ email: String(f.get('email')), redirectTo: `${window.location.origin}/reset-password` }); }
          catch { /* Keep the same recovery response for every account identity. */ }
          finally { setMessage('If an account exists for that address, check your email for a reset link.'); setBusy(false); }
        }}>
          <label>Email address<input aria-label="Recovery email" name="email" type="email" maxLength={254} required autoComplete="email" /></label>
          <button className="btn" disabled={!available || busy}>{busy ? 'Requesting…' : 'Request reset link'}</button>
        </form>}
      </div>
      <p><Link href="/sign-in" className="blue textlink">Back to sign in</Link> · <Link href="/support">Contact support</Link></p>
    </section>
  </>;
}