import { useState } from "react";
import { Seo, PageHero, Loading, ErrorBox, Notice } from "../components/site";
import { useAdmin, useAdminActions, useAdminReadiness } from "../queries/store";
export default function Admin() {
  const q = useAdmin();
  const a = useAdminActions();
  const readiness = useAdminReadiness();
  const [tab, setTab] = useState("Overview");
  const [status, setStatus] = useState("");
  if (q.isLoading) return <Loading />;
  if (q.error)
    return (
      <>
        <PageHero
          eyebrow="PROTECTED AREA"
          title="Administrator access required."
          text="Permissions are checked on the server. No administrator has been assigned by default."
        />
        <div className="container section">
          <ErrorBox message={q.error.message} />
        </div>
      </>
    );
  const d = q.data!;
  const busy = Object.values(a).some((m) => m.isPending);
  const err = Object.values(a).find((m) => m.error)?.error;
  return (
    <>
      <Seo title="Administration" />
      <PageHero
        eyebrow="ADMINISTRATION"
        title="Manage your storefront."
        text="All changes are server-authorized. Billing and external application access remain locked regardless of catalogue settings."
      />
      <section className="container section">
        <div className="tabs">
          {["Overview", "Readiness", "Products", "Plans", "Support", "Legal", "Company", "Records"].map((t) => (
            <button key={t} className={tab === t ? "selected" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        {err && <ErrorBox message={err.message} />}
        <output>{status}</output>
        {tab === 'Readiness' && <>
          <h2>Release readiness</h2>
          <p>Configured mode: {readiness.data?.mode || 'disabled'}. Evidence must match the deployment version and be less than 30 days old. Credentials are never shown.</p>
          {readiness.error && <ErrorBox message={readiness.error.message} />}
          {readiness.data?.products.map(p => <article className="formcard adminform" key={p.productId}>
            <h3>{p.productId === 'safespace' ? 'SafeSpace' : 'ShiftMate SA'}</h3>
            {[p.sandbox, p.live].map(environment => <div key={environment.environment}>
              <h4>{environment.environment.toUpperCase()} · {environment.enabled ? 'Ready' : 'Blocked'}</h4>
              <p className="small">Credential presence — ID: {environment.credentialPresence.merchantId ? 'Set' : 'Missing'}; key: {environment.credentialPresence.merchantKey ? 'Set' : 'Missing'}; passphrase: {environment.credentialPresence.passphrase ? 'Set' : 'Missing'}.</p>
              <ul>{environment.blockers.map(b => <li key={b.code}>{b.message}</li>)}</ul>
            </div>)}
          </article>)}
          <Notice>There is no launch toggle. Payment implementation, trusted ingress and real mail remain blocked. APK downloads stay off. Ordinary plan edits cannot bypass release gates.</Notice>
        </>}
        {tab === "Overview" && (
          <>
            <div className="stats">
              <div>
                <b>{d.orders.length}</b>
                <span>Orders</span>
              </div>
              <div>
                <b>{d.tickets.filter((t) => t.status !== "resolved").length}</b>
                <span>Open support requests</span>
              </div>
              <div>
                <b>{d.entitlements.filter((e) => e.status === "active").length}</b>
                <span>Active records</span>
              </div>
            </div>
            <Notice>
              Production launch blockers:
              <ul>
                {d.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Notice>
          </>
        )}
        {tab === "Products" &&
          d.products.map((p) => (
            <form
              className="formcard adminform"
              key={p.id}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                a.product.mutate(
                  {
                    id: p.id as "safespace" | "shiftmate",
                    description: String(f.get("description")),
                    features: String(f.get("features")),
                    instructions: String(f.get("instructions")),
                    status: String(f.get("status")) as "in_review" | "disabled",
                  },
                  { onSuccess: () => setStatus("Product saved.") },
                );
              }}
            >
              <h2>{p.name}</h2>
              <label>
                Description
                <textarea aria-label="Description" name="description" defaultValue={p.description} required />
              </label>
              <label>
                Feature notes (JSON array; all remain under review)
                <textarea aria-label="Features" name="features" defaultValue={p.features} />
              </label>
              <label>
                Installation instructions & update notes
                <textarea aria-label="Instructions" name="instructions" defaultValue={p.instructions} />
              </label>
              <label>
                Availability
                <select name="status" defaultValue={p.status}>
                  <option value="in_review">In review</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <button className="btn" disabled={busy}>
                Save product
              </button>
            </form>
          ))}
        {tab === "Plans" && (
          <>
            {[
              ...d.plans,
              {
                id: "",
                productId: "shiftmate",
                name: "",
                price: 3999,
                interval: "month",
                active: false,
              },
            ].map((p, i) => (
              <form
                className="formcard adminform"
                key={p.id || i}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  a.plan.mutate(
                    {
                      id: String(f.get("id")),
                      productId: String(f.get("productId")) as "safespace" | "shiftmate",
                      name: String(f.get("name")),
                      price: Math.round(Number(f.get("price")) * 100),
                      interval: String(f.get("interval")) as "once" | "month" | "year",
                      active: f.get("active") === "on",
                    },
                    { onSuccess: () => setStatus("Plan saved. Checkout remains disabled.") },
                  );
                }}
              >
                <h3>{p.name || "Create plan"}</h3>
                <div className="formrow">
                  <label>
                    Plan ID
                    <input aria-label="Id" name="id" defaultValue={p.id} required readOnly={!!p.id} />
                  </label>
                  <label>
                    Product
                    <select name="productId" defaultValue={p.productId}>
                      <option value="safespace">SafeSpace</option>
                      <option value="shiftmate">ShiftMate SA</option>
                    </select>
                  </label>
                </div>
                <div className="formrow">
                  <label>
                    Plan name
                    <input aria-label="Name" name="name" defaultValue={p.name} required />
                  </label>
                  <label>
                    Price (ZAR)
                    <input aria-label="Price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      defaultValue={p.price / 100}
                      required
                    />
                  </label>
                </div>
                <label>
                  Billing interval
                  <select name="interval" defaultValue={p.interval}>
                    <option value="once">Once-off</option>
                    <option value="month">Monthly</option>
                    <option value="year">Annually</option>
                  </select>
                </label>
                <label className="checkbox">
                  <input aria-label="Active" name="active" type="checkbox" defaultChecked={p.active} />
                  Visible plan
                </label>
                <button className="btn" disabled={busy}>
                  Save proposed plan
                </button>
              </form>
            ))}
          </>
        )}
        {tab === "Support" && (
          <>
            {d.tickets.length === 0 && <p>No support tickets.</p>}
            {d.tickets.map((t) => (
              <form
                className="formcard adminform"
                key={t.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  a.ticket.mutate(
                    {
                      id: t.id,
                      response: String(f.get("response")),
                      status: String(f.get("status")) as "open" | "in_progress" | "resolved",
                    },
                    {
                      onSuccess: () =>
                        setStatus(
                          "Ticket updated. Response is visible in the customer portal, not emailed.",
                        ),
                    },
                  );
                }}
              >
                <h3>{t.subject}</h3>
                <p>
                  {t.name} · {t.email}
                </p>
                <p>{t.message}</p>
                <label>
                  Portal response
                  <textarea aria-label="Response" name="response" defaultValue={t.response || ""} />
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={t.status}>
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
                <button className="btn" disabled={busy}>
                  Save response
                </button>
              </form>
            ))}
          </>
        )}
        {tab === "Legal" &&
          d.legal.map((l) => (
            <form
              className="formcard adminform"
              key={l.id}
              onSubmit={(e) => {
                e.preventDefault();
                a.legal.mutate(
                  { id: l.id, content: String(new FormData(e.currentTarget).get("content")) },
                  {
                    onSuccess: () =>
                      setStatus("Legal draft saved; review warning remains visible."),
                  },
                );
              }}
            >
              <h3>{l.title}</h3>
              <label>
                Draft text
                <textarea aria-label="Content" name="content" rows={10} defaultValue={l.content} required />
              </label>
              <button className="btn" disabled={busy}>
                Save draft
              </button>
            </form>
          ))}
        {tab === "Company" && (
          <>
            {d.settings.map((s) => (
              <form
                className="formcard adminform"
                key={s.key}
                onSubmit={(e) => {
                  e.preventDefault();
                  a.setting.mutate(
                    {
                      key: s.key as "contactEmail",
                      value: String(new FormData(e.currentTarget).get("value")),
                    },
                    { onSuccess: () => setStatus("Company detail saved.") },
                  );
                }}
              >
                <label>
                  {s.key}
                  <input aria-label="Value" name="value" defaultValue={s.value} placeholder="Configuration required" />
                </label>
                <button className="btn" disabled={busy}>
                  Save
                </button>
              </form>
            ))}
            <Notice>
              Base44 URLs, administrator IDs and provider secrets are server environment settings.
              Do not enter credentials into public company fields.
            </Notice>
          </>
        )}
        {tab === "Records" && (
          <>
            <h2>Orders</h2>
            <pre>{JSON.stringify(d.orders, null, 2)}</pre>
            <h2>Subscriptions</h2>
            <pre>{JSON.stringify(d.subscriptions, null, 2)}</pre>
            <h2>Entitlements</h2>
            {d.entitlements.map((e) => (
              <form
                key={e.id}
                className="formcard"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  a.revoke.mutate(
                    { id: e.id, reason: String(new FormData(ev.currentTarget).get("reason")) },
                    {
                      onSuccess: () =>
                        setStatus(
                          "Entitlement revoked on this website. Destination enforcement remains unverified.",
                        ),
                    },
                  );
                }}
              >
                <p>
                  {e.customerId} · {e.productId} · {e.status}
                </p>
                <label>
                  Revocation reason
                  <input aria-label="Reason" name="reason" required minLength={10} />
                </label>
                <button className="btn" disabled={busy || e.status === "revoked"}>
                  Revoke entitlement
                </button>
              </form>
            ))}
            <h2>Audit log</h2>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Record</th>
                  </tr>
                </thead>
                <tbody>
                  {d.audit.map((l) => (
                    <tr key={l.id}>
                      <td>{new Date(l.createdAt).toLocaleString("en-ZA")}</td>
                      <td>{l.actorId}</td>
                      <td>{l.action}</td>
                      <td>{l.targetId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
