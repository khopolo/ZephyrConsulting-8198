import { useState } from "react";
import { Link } from "wouter";
import {
  Seo,
  PageHero,
  Notice,
  ArrowUpRight,
  Headphones,
  ErrorBox,
  Loading,
} from "../components/site";
import { useCatalogue, useContact } from "../queries/store";
import { authClient } from "../lib/auth";
export default function Support() {
  const q = useCatalogue();
  const submit = useContact();
  const { data: session } = authClient.useSession();
  const [consent, setConsent] = useState(false);
  return (
    <>
      <Seo title="Contact & support" />
      <PageHero
        eyebrow="CONTACT & SUPPORT"
        title="Let’s find a way forward."
        text="Have a project in mind, a product question or a support request? You’re in the right place."
      />
      <section className="container section supportgrid">
        <div>
          <div className="iconbox">
            <Headphones size={28} />
          </div>
          <h2>
            Real questions.
            <br />A dedicated place for help.
          </h2>
          <p>
            Tell us what you need and include enough detail to help us understand your request.
            Please don’t send passwords, card details, medical records or live location data.
          </p>
          {q.isLoading ? (
            <Loading />
          ) : (
            <div className="contactdetails">
              {[
                ["Email", q.data?.company.contactEmail],
                ["Support", q.data?.company.supportEmail],
                ["Phone", q.data?.company.phone],
                ["Address", q.data?.company.address],
              ].map(([k, v]) => (
                <div key={k}>
                  <b>{k}</b>
                  <span>{v || "Configuration required"}</span>
                </div>
              ))}
            </div>
          )}
          <Notice>
            {session ? (
              "You’re signed in. This request will appear in your dashboard."
            ) : (
              <>
                Want to track your request? <Link href="/sign-in">Sign in before submitting.</Link>
              </>
            )}
          </Notice>
        </div>
        <div className="formcard">
          {submit.isSuccess ? (
            <div aria-live="polite">
              <div className="iconbox">
                <Headphones />
              </div>
              <h2>Request saved.</h2>
              <p>{submit.data.message}</p>
              <b className="reference">Reference: {submit.data.reference}</b>
              <Link href="/dashboard" className="btn">
                View your requests <ArrowUpRight size={18} />
              </Link>
              <button className="textlink blue" onClick={() => submit.reset()}>
                Send another request
              </button>
            </div>
          ) : (
            <>
              <h2>How can we help?</h2>
              <p className="small">All fields are required unless marked optional.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  submit.mutate({
                    name: String(f.get("name")),
                    email: String(f.get("email")),
                    subject: String(f.get("subject")),
                    message: String(f.get("message")),
                    website: String(f.get("website") || ""),
                    consent: true,
                  });
                }}
              >
                <div className="formrow">
                  <label>
                    Your name
                    <input aria-label="Name"
                      name="name"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      defaultValue={session?.user.name}
                    />
                  </label>
                  <label>
                    Email address
                    <input aria-label="Email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      defaultValue={session?.user.email}
                    />
                  </label>
                </div>
                <label>
                  Subject
                  <input aria-label="Subject"
                    name="subject"
                    required
                    minLength={3}
                    maxLength={150}
                    placeholder="A project, product question or support issue"
                  />
                </label>
                <label>
                  Your message
                  <textarea aria-label="Message"
                    name="message"
                    required
                    minLength={20}
                    maxLength={5000}
                    rows={5}
                    placeholder="Tell us a little about what you need…"
                  />
                </label>
                <div className="honeypot" aria-hidden="true">
                  <label>
                    Website
                    <input aria-label="Website" name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
                <label className="checkbox">
                  <input aria-label="Consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the processing of my details to handle this request. Read the{" "}
                    <Link href="/legal/privacy">privacy & POPIA draft</Link>.
                  </span>
                </label>
                {submit.error && <ErrorBox message={submit.error.message} />}
                <button className="btn" disabled={submit.isPending || !consent}>
                  {submit.isPending ? "Saving request…" : "Send request"}
                  <ArrowUpRight size={18} />
                </button>
                <p className="small">
                  Securely stored in this portal. Email notifications are not configured.
                </p>
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}
