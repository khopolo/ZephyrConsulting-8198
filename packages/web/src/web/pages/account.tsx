import { useState } from "react";
import { Link, Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Seo,
  PageHero,
  Notice,
  Loading,
  ErrorBox,
  ProductIcon,
  ArrowUpRight,
  ShieldCheck,
} from "../components/site";
import { authClient } from "../lib/auth";
import { useDashboard, useAccess } from "../queries/store";
export function SignIn() {
  const { data: session, isPending } = authClient.useSession();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isPending) return <Loading />;
  if (session) return <Redirect to="/dashboard" />;
  return (
    <>
      <Seo title="Customer portal" />
      <section className="container section authgrid">
        <div>
          <span className="eyebrow">CUSTOMER PORTAL</span>
          <h1>
            Your products.
            <br />
            Your support.
            <br />
            <span className="blue">One place.</span>
          </h1>
          <p>
            Manage your account, view verified purchases and keep track of your support requests.
          </p>
          <Notice>
            Purchasing and product access remain disabled until payment and destination integrations
            are verified.
          </Notice>
        </div>
        <div className="formcard">
          <div className="tabs">
            <button className={!signup ? "selected" : ""} onClick={() => setSignup(false)}>
              Sign in
            </button>
            <button className={signup ? "selected" : ""} onClick={() => setSignup(true)}>
              Create account
            </button>
          </div>
          <h2>{signup ? "Welcome to Zephyr." : "Good to see you again."}</h2>
          <button
            className="btn outline full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const r = await authClient.managedAuth.signIn({ provider: "google" });
                if (r.error) setError(r.error.message || "Sign-in could not be completed.");
              } catch {
                setError("Google sign-in unavailable. Try email sign-in.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <span className="google">G</span>Continue with Google
          </button>
          <div className="divider">or use your email</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const f = new FormData(e.currentTarget);
              try {
                const args = { email: String(f.get("email")), password: String(f.get("password")) };
                const r = signup
                  ? await authClient.signUp.email({ ...args, name: String(f.get("name")) })
                  : await authClient.signIn.email(args);
                if (r.error) setError(r.error.message || "Unable to sign in.");
              } catch {
                setError("Unable to connect. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {signup && (
              <label>
                Full name
                <input aria-label="Name" name="name" autoComplete="name" required minLength={2} />
              </label>
            )}
            <label>
              Email address
              <input aria-label="Email" name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Password
              <input aria-label="Password"
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete={signup ? "new-password" : "current-password"}
                required
              />
              <span className="small">At least 12 characters.</span>
            </label>
            {signup && (
              <label className="checkbox">
                <input aria-label="Consent" type="checkbox" required />
                <span>
                  I have read the <Link href="/legal/terms">terms draft</Link> and{" "}
                  <Link href="/legal/privacy">privacy draft</Link>.
                </span>
              </label>
            )}
            {error && <ErrorBox message={error} />}
            <button className="btn full" disabled={busy}>
              {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="small">
            <Link href="/forgot-password" className="blue textlink">Forgot your password?</Link>
            {" "}Email delivery setup is required before new recovery links can be sent.
          </p>
        </div>
      </section>
    </>
  );
}
export function Dashboard() {
  const session = authClient.useSession();
  if (session.isPending) return <Loading />;
  if (!session.data) return <Redirect to="/sign-in" />;
  return <DashboardContent />;
}
function DashboardContent() {
  const q = useDashboard();
  const access = useAccess();
  const qc = useQueryClient();
  const [tab, setTab] = useState("Products");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox message={q.error.message} />;
  const d = q.data!;
  return (
    <>
      <Seo title="My account" />
      <PageHero
        eyebrow="CUSTOMER PORTAL"
        title={`Welcome, ${d.user.name.split(" ")[0]}.`}
        text="Your products, payment history and support — all in one place."
      />
      <section className="container section">
        <div className="dashboardtop">
          <div className="tabs">
            {["Products", "Orders", "Subscriptions", "Support", "Account"].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={tab === t ? "selected" : ""}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex">
            {d.admin && (
              <Link href="/admin" className="textlink blue">
                Administration
              </Link>
            )}
            <button
              className="textlink"
              onClick={async () => {
                await authClient.signOut();
                qc.clear();
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        {tab === "Products" && (
          <>
            <Notice>
              Payment integration and independent Base44 purchase enforcement are pending. APK
              downloads remain disabled.
            </Notice>
            <div className="productgrid">
              {["safespace", "shiftmate"].map((id) => {
                const entitled = d.entitlements.some(
                  (e) =>
                    e.productId === id &&
                    e.status === "active" &&
                    e.environment === 'live' &&
                    e.validFrom <= Date.now() &&
                    (e.validUntil === null || e.validUntil > Date.now()),
                );
                return (
                  <article className="servicecard" key={id}>
                    <ProductIcon id={id} />
                    <h2>{id === "safespace" ? "SafeSpace" : "ShiftMate SA"}</h2>
                    <p>
                      {entitled
                        ? "Entitlement on record · Destination integration unavailable"
                        : "No active purchase entitlement"}
                    </p>
                    <button
                      className="btn outline"
                      disabled={!entitled || access.isPending}
                      onClick={() => access.mutate({ productId: id as "safespace" | "shiftmate" })}
                    >
                      Product access unavailable
                    </button>
                    <p className="small">
                      Installation instructions and updates will be published after verified
                      integration.
                    </p>
                    <Link href={`/products/${id}`} className="blue textlink">
                      Product details <ArrowUpRight size={16} />
                    </Link>
                  </article>
                );
              })}
            </div>
            {access.error && <ErrorBox message={access.error.message} />}
          </>
        )}
        {tab === "Orders" && (
          <>
            <h2>Orders & payment history</h2>
            {!d.orders.length ? (
              <Empty text="No orders yet. Checkout is currently disabled." />
            ) : (
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.orders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.id}</td>
                        <td>{new Date(o.createdAt).toLocaleDateString("en-ZA")}</td>
                        <td>R{(o.amount / 100).toFixed(2)}</td>
                        <td>{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small">
              Provider-verified receipts and invoice downloads are not yet supported.
            </p>
          </>
        )}
        {tab === "Subscriptions" && (
          <>
            <h2>Subscriptions</h2>
            {!d.subscriptions.length ? (
              <Empty text="No subscriptions. Recurring billing is disabled." />
            ) : (
              d.subscriptions.map((s) => (
                <div className="notice" key={s.id}>
                  {s.planId} · {s.status} · Renewal:{" "}
                  {s.renewsAt ? new Date(s.renewsAt).toLocaleDateString("en-ZA") : "Not supplied"}
                </div>
              ))
            )}
          </>
        )}
        {tab === "Support" && (
          <>
            <div className="sectionheading">
              <h2>Your support requests</h2>
              <Link className="btn" href="/support">
                New request <ArrowUpRight size={17} />
              </Link>
            </div>
            {!d.tickets.length ? (
              <Empty text="No requests yet. Submit a request while signed in to track it here." />
            ) : (
              d.tickets.map((t) => (
                <article className="ticket" key={t.id}>
                  <span className="pill">{t.status.replace("_", " ")}</span>
                  <h3>{t.subject}</h3>
                  <p>{t.message}</p>
                  {t.response && (
                    <Notice>
                      <b>Support response</b>
                      <p>{t.response}</p>
                    </Notice>
                  )}
                  <span className="small">
                    {new Date(t.createdAt).toLocaleDateString("en-ZA")} · Reference {t.id}
                  </span>
                </article>
              ))
            )}
          </>
        )}
        {tab === "Account" && (
          <div className="formcard accountform">
            <h2>Account details</h2>
            <Notice>
              Email status: {d.user.emailVerified ? 'Verified' : 'Not verified'}.{' '}
              {!d.user.emailVerified && <Link href="/verify-email">View verification options</Link>}
            </Notice>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const f = new FormData(e.currentTarget);
                const r = await authClient.updateUser({ name: String(f.get("name")) });
                setMessage(r.error?.message || "Account name updated.");
                setBusy(false);
                qc.invalidateQueries();
              }}
            >
              <label>
                Your name
                <input aria-label="Name" name="name" required minLength={2} defaultValue={d.user.name} />
              </label>
              <label>
                Email
                <input aria-label="Email" type="email" value={d.user.email} readOnly />
              </label>
              <span className="small">
                Email changes require a verified delivery workflow and are unavailable.
              </span>
              <button className="btn" disabled={busy}>
                {busy ? "Saving…" : "Save name"}
              </button>
            </form>
            <h3>Change password</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const f = new FormData(e.currentTarget);
                const r = await authClient.changePassword({
                  currentPassword: String(f.get("current")),
                  newPassword: String(f.get("new")),
                  revokeOtherSessions: true,
                });
                setMessage(r.error?.message || "Password changed. Other sessions revoked.");
                setBusy(false);
              }}
            >
              <label>
                Current password
                <input aria-label="Current" name="current" type="password" required autoComplete="current-password" />
              </label>
              <label>
                New password
                <input aria-label="New"
                  name="new"
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                />
              </label>
              <button className="btn outline" disabled={busy}>
                Update password
              </button>
            </form>
            {message && <output>{message}</output>}
            <p className="small">
              For data access, correction or deletion requests, submit an authenticated support
              ticket. Automated deletion is not implemented.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <ShieldCheck size={32} />
      <p>{text}</p>
    </div>
  );
}
