import { Link, useParams } from "wouter";
import {
  Seo,
  PageHero,
  services,
  ArrowUpRight,
  ProductIcon,
  Notice,
  Loading,
  ErrorBox,
  SupportCTA,
  Check,
} from "../components/site";
import { useCatalogue, useLegal } from "../queries/store";
export function Services() {
  return (
    <>
      <Seo title="Services" />
      <PageHero
        eyebrow="OUR SERVICES"
        title="Technology that fits your business."
        text="From a new application to a smoother daily workflow, we focus on practical tools and clear support."
      />
      <section className="container section servicegrid">
        {[
          ...services,
          {
            icon: services[2].icon,
            title: "Workflow automation",
            text: "Explore digital transformation and opportunities to reduce repetitive manual work.",
          },
          {
            icon: services[1].icon,
            title: "Software implementation",
            text: "Plan, introduce and support the systems your team needs.",
          },
        ].map((s) => (
          <article className="servicecard" key={s.title}>
            <s.icon size={32} />
            <h2>{s.title}</h2>
            <p>{s.text}</p>
            <span className="small">Project scope and availability confirmed on enquiry.</span>
            <Link href="/support" className="blue textlink">
              Discuss your needs <ArrowUpRight size={16} />
            </Link>
          </article>
        ))}
      </section>
      <SupportCTA />
    </>
  );
}
export function About() {
  return (
    <>
      <Seo title="About us" />
      <PageHero
        eyebrow="ABOUT ZEPHYR"
        title="Your goals. Our starting point."
        text="Zephyr Consulting is focused on helping businesses operate more efficiently through practical technology and ongoing support."
      />
      <section className="container section aboutgrid">
        <img src="/images/zephyr-logo.png" alt="Original Zephyr Consulting logo" />
        <div>
          <span className="eyebrow">A gentle breeze of wealth</span>
          <h2>
            A people-first approach
            <br />
            to business technology.
          </h2>
          <p>
            We bring application development, business software, IT consulting and digital business
            support together with one purpose: making technology more useful in everyday work.
          </p>
          <p>
            Our values are straightforward — listen carefully, keep solutions practical, communicate
            clearly and respect the people who use our products.
          </p>
          <Notice>
            Company registration number, contact details and legal business information still
            require confirmation. No certifications or independently verified achievements are
            claimed.
          </Notice>
          <Link href="/support" className="btn">
            Start a conversation <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
export function Products() {
  const q = useCatalogue();
  return (
    <>
      <Seo title="Products" />
      <PageHero
        eyebrow="OUR PRODUCTS"
        title="Made for the way you live and work."
        text="Explore SafeSpace and ShiftMate SA. Existing applications remain in Base44; verified access integration is still required."
      />
      <section className="container section">
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox message="Unable to load products. Please try again." />
        ) : (
          <div className="productgrid">
            {q.data?.products.map((p) => (
              <article className="servicecard" key={p.id}>
                <ProductIcon id={p.id} />
                <h2>{p.name}</h2>
                <p>{p.description}</p>
                <span className="pill">
                  {p.status === "disabled" ? "UNAVAILABLE" : "FEATURES UNDER REVIEW"}
                </span>
                <Link className="btn" href={`/products/${p.id}`}>
                  Explore {p.name}
                  <ArrowUpRight size={18} />
                </Link>
              </article>
            ))}
          </div>
        )}
        <Notice>
          Proposed prices are subject to confirmation. Payments, subscriptions, application handoff
          and APK downloads are not enabled.
        </Notice>
      </section>
    </>
  );
}
export function Product() {
  const { id = "" } = useParams();
  const q = useCatalogue();
  const p = q.data?.products.find((p) => p.id === id);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox message="Unable to load this product." />;
  if (!p) return <NotFound />;
  const safe = id === "safespace";
  let features: string[] = [];
  try {
    features = JSON.parse(p.features);
  } catch {}
  return (
    <>
      <Seo title={p.name} />
      <section className={`producthero ${safe ? "safecolor" : "shiftcolor"}`}>
        <div className="container productdetailgrid">
          <div>
            <ProductIcon id={id} />
            <span className="eyebrow">
              {safe ? "PERSONAL SAFETY" : "SHIFTS & ESTIMATED EARNINGS"}
            </span>
            <h1>{p.name}</h1>
            <h2>
              {safe
                ? "One press. Five seconds. Help on the way."
                : "Track. Calculate. Know your pay."}
            </h2>
            <p>{p.description}</p>
            <span className="pill">
              {p.status === "disabled" ? "PRODUCT DISABLED" : "EXISTING APP · VERIFICATION PENDING"}
            </span>
          </div>
          <div className="pricingpanel">
            <h3>Choose your proposed plan</h3>
            {q.data?.plans
              .filter((plan) => plan.productId === id)
              .map((plan) => (
                <div className="planrow" key={plan.id}>
                  <span>{plan.name}</span>
                  <strong>
                    R{(plan.price / 100).toFixed(2)}
                    <small>/{plan.interval === "once" ? "once-off" : plan.interval}</small>
                  </strong>
                  <Link href={`/checkout/${plan.id}`} className="btn outline">
                    View purchase details <ArrowUpRight size={16} />
                  </Link>
                </div>
              ))}
            <span className="small">Proposed pricing · subject to confirmation</span>
            <Notice>
              Checkout disabled pending payment testing and secure Base44 access integration.
            </Notice>
          </div>
        </div>
      </section>
      <section className="container section detailgrid">
        <div>
          <span className="eyebrow">PRODUCT OVERVIEW</span>
          <h2>Designed with your everyday needs in mind.</h2>
          <p>
            These capabilities are described in the product brief. They have not been independently
            tested in the existing application and are not advertised as operational.
          </p>
          {features.map((f) => (
            <div className="feature" key={f}>
              <Check size={19} />
              <b>{f}</b>
              <span>Under review</span>
            </div>
          ))}
          <h3>Installation & updates</h3>
          <p>{p.instructions}</p>
          <p>
            Base44 web-app URL: configuration required. Supported devices and Android versions:
            verification required. No APK download is available.
          </p>
        </div>
        <div>
          <h3>Important to know</h3>
          <Notice>
            {safe
              ? "SafeSpace does not guarantee alert delivery or automatic emergency-service response. Connectivity, permissions, device behaviour and recipients can affect outcomes."
              : "Pay figures are estimated gross earnings — not net pay, guaranteed payroll or a legal determination. Pay rules and plan limits must be verified."}
          </Notice>
          <h3>Frequently asked questions</h3>
          {[
            [
              "Can I purchase now?",
              "Not yet. Live checkout stays disabled until the provider and destination-app access checks are tested.",
            ],
            [
              "Is there a native Android app download?",
              "No verified signed APK has been supplied. A web app is not a native Android APK.",
            ],
            [
              "What does my plan include?",
              safe
                ? "The R100 once-off price is proposed. Licence duration, devices, support and included capabilities require confirmation before sale."
                : "Pro monthly and annual prices are proposed. Job limits, renewal terms and cancellation conditions require confirmation before billing.",
            ],
          ].map(([t, c]) => (
            <details key={t}>
              <summary>{t}</summary>
              <p>{c}</p>
            </details>
          ))}
          <Link className="blue textlink" href="/support">
            Ask about this product <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
export function Legal() {
  const { id = "" } = useParams();
  const q = useLegal(id);
  return (
    <>
      <Seo title={q.data?.title || "Legal draft"} />
      <PageHero
        eyebrow="LEGAL · DRAFT FOR REVIEW"
        title={q.data?.title || "Legal document"}
        text="This is an editable draft, not legal advice or a certification of compliance. Qualified South African legal review is required before publication."
      />
      <section className="container section legalbody">
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox message="Legal document not found or unavailable." />
        ) : (
          <>
            <Notice>
              Draft · Company details, policies and contact channels require confirmation.
            </Notice>
            {q.data?.content.split("\n\n").map((part, i) => (
              <div key={i}>
                <h3>{part.split("\n")[0]}</h3>
                <p>{part.split("\n").slice(1).join("\n")}</p>
              </div>
            ))}
            <p className="small">
              Relevant legislation:{" "}
              <a
                href="https://www.gov.za/documents/protection-personal-information-act"
                target="_blank"
                rel="noreferrer"
              >
                POPIA
              </a>
              , Consumer Protection Act and Electronic Communications and Transactions Act, where
              applicable.
            </p>
          </>
        )}
      </section>
    </>
  );
}
export function NotFound() {
  return (
    <>
      <Seo title="Page not found" />
      <PageHero
        eyebrow="404"
        title="A little off course."
        text="We couldn’t find this page. Let’s get you back to the right place."
      />
      <div className="container section">
        <Link href="/" className="btn">
          Back to home <ArrowUpRight size={18} />
        </Link>
      </div>
    </>
  );
}
export function Checkout() {
  const { id = "" } = useParams();
  const q = useCatalogue();
  const p = q.data?.plans.find((p) => p.id === id);
  return (
    <>
      <Seo title="Purchase details" />
      <PageHero
        eyebrow="SECURE PURCHASE · NOT YET AVAILABLE"
        title="A clear view before you buy."
        text="No payment details are collected and no charge can be made in this build."
      />
      <section className="container section legalbody">
        {q.isLoading ? (
          <Loading />
        ) : !p ? (
          <ErrorBox message="Plan unavailable." />
        ) : (
          <>
            <h2>{p.name}</h2>
            <h3>
              R{(p.price / 100).toFixed(2)} / {p.interval === "once" ? "once-off" : p.interval}
            </h3>
            <p>
              Proposed ZAR price.{" "}
              {p.interval !== "once"
                ? "This would be a recurring plan; renewal, cancellation and failed-payment terms must be finalised before activation."
                : "Licence scope and support inclusions must be finalised before purchase."}
            </p>
            <Notice>
              Payment provider verification, independent Base44 entitlement enforcement and reviewed
              terms are required before checkout can open.
            </Notice>
            <h3>What still needs verification</h3>
            <ul>
              {q.data?.readiness.products.find(product => product.productId === p.productId)?.blockers.map(blocker => <li key={blocker.code}>{blocker.message}</li>)}
            </ul>
            <button className="btn" disabled>
              Checkout not yet enabled
            </button>
            <p>
              <Link href="/legal/refunds">Refund & cancellation draft</Link> ·{" "}
              <Link href="/legal/subscriptions">Subscription terms draft</Link>
            </p>
            <Link href="/support" className="blue textlink">
              Contact us about availability <ArrowUpRight size={16} />
            </Link>
          </>
        )}
      </section>
    </>
  );
}
export function PaymentStatus() {
  const { status = "" } = useParams();
  return (
    <>
      <Seo title="Payment status" />
      <PageHero
        eyebrow="PAYMENT STATUS"
        title={
          status === "cancelled"
            ? "Checkout cancelled."
            : status === "failed"
              ? "Payment not confirmed."
              : "Payment verification required."
        }
        text="This URL is not proof of payment. No access is granted from a browser redirect, and payment processing is currently disabled."
      />
      <div className="container section">
        <Link href="/dashboard" className="btn">
          View your account <ArrowUpRight size={18} />
        </Link>
      </div>
    </>
  );
}
