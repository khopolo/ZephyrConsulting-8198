import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowUpRight,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  CalendarClock,
  Code2,
  Workflow,
  Headphones,
  MonitorCog,
  Check,
  ChevronRight,
} from "lucide-react";
import { authClient } from "../lib/auth";
export {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  CalendarClock,
  Code2,
  Workflow,
  Headphones,
  MonitorCog,
  Check,
  ChevronRight,
};
export const services = [
  {
    icon: Code2,
    title: "Application development",
    text: "Custom applications shaped around the way your business works.",
  },
  {
    icon: MonitorCog,
    title: "Business software",
    text: "Practical systems to bring your operations into focus.",
  },
  {
    icon: Workflow,
    title: "Technology consulting",
    text: "Clear guidance. Better workflows. Technology with a purpose.",
  },
  {
    icon: Headphones,
    title: "IT & ongoing support",
    text: "Implementation and technical support beyond the first launch.",
  },
];
export function Seo({
  title,
  description = "Zephyr Consulting — A gentle breeze of wealth. Practical IT solutions, application development and business technology in South Africa.",
}: {
  title: string;
  description?: string;
}) {
  useEffect(() => {
    document.title = `${title} | Zephyr Consulting`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    window.scrollTo(0, 0);
  }, [title, description]);
  return null;
}
export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [path] = useLocation();
  const { data } = authClient.useSession();
  useEffect(() => setOpen(false), [path]);
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="header">
        <div className="container nav">
          <Link href="/" className="brand">
            <img src="/images/zephyr-logo.png" alt="Zephyr Consulting official logo" />
            <span>
              ZEPHYR<span>CONSULTING</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className={open ? "navlinks open" : "navlinks"}>
            {[
              ["Home", "/"],
              ["Services", "/services"],
              ["Products", "/products"],
              ["About us", "/about"],
              ["Contact & support", "/support"],
            ].map(([name, url]) => (
              <Link className={path === url ? "active" : ""} href={url} key={url}>
                {name}
              </Link>
            ))}
          </nav>
          <Link className="account" href={data ? "/dashboard" : "/sign-in"}>
            {data ? "My account" : "Customer portal"}
            <ArrowUpRight size={16} />
          </Link>
          <button
            className="menu"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer>
        <div className="container footergrid">
          <div>
            <Link href="/" className="brand footerbrand">
              <img src="/images/zephyr-logo.png" alt="Zephyr logo" />
              <span>
                ZEPHYR<span>CONSULTING</span>
              </span>
            </Link>
            <p>A gentle breeze of wealth</p>
            <span className="small">South Africa · Practical technology. Human support.</span>
          </div>
          <div>
            <h4>Explore</h4>
            <Link href="/services">Our services</Link>
            <Link href="/products">Our products</Link>
            <Link href="/about">About Zephyr</Link>
          </div>
          <div>
            <h4>Here to help</h4>
            <Link href="/support">Contact & support</Link>
            <Link href="/dashboard">Customer portal</Link>
            <Link href="/legal/refunds">Refunds & cancellation</Link>
          </div>
          <div>
            <h4>Legal drafts</h4>
            <Link href="/legal/privacy">Privacy & POPIA</Link>
            <Link href="/legal/terms">Terms & conditions</Link>
            <Link href="/legal/subscriptions">Subscription terms</Link>
            <Link href="/legal/disclaimer">Disclaimer</Link>
            <Link href="/legal/eula">Software licence</Link>
          </div>
        </div>
        <div className="container footbottom">
          <span>
            © {new Date().getFullYear()} Zephyr Consulting. Company details awaiting confirmation.
          </span>
          <span>Built around your business.</span>
        </div>
      </footer>
    </>
  );
}
export function ProductIcon({ id }: { id: string }) {
  return (
    <img
      className="producticon"
      src={`/images/${id}-icon.png`}
      alt={`${id === "safespace" ? "SafeSpace" : "ShiftMate SA"} product icon`}
    />
  );
}
export function PageHero({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="pagehero">
      <div className="container">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </section>
  );
}
export function SupportCTA() {
  return (
    <section className="container cta">
      <div>
        <span className="eyebrow">LET’S MOVE YOUR BUSINESS FORWARD</span>
        <h2>
          Good technology starts
          <br />
          with a conversation.
        </h2>
        <p>Tell us what you need. We’ll help you find a practical way forward.</p>
      </div>
      <Link className="btn white" href="/support">
        Let’s talk <ArrowUpRight size={18} />
      </Link>
    </section>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="notice">
      <ShieldCheck size={20} />
      <div>{children}</div>
    </div>
  );
}
export function Loading() {
  return (
    <output className="loading">
      Loading…
    </output>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="error" role="alert">
      {message}
    </div>
  );
}
export function PhoneIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "illustration compact" : "illustration"}>
      <div className="orbit orbit1" />
      <div className="orbit orbit2" />
      <div className="floatnote">
        <span className="statusdot" /> Technology that puts people first
      </div>
      <div className="phone phone-safe">
        <div className="phonecamera" />
        <div className="phonebody">
          <div className="appname">
            <ProductIcon id="safespace" />
            SafeSpace
          </div>
          <h4>
            Your circle.
            <br />
            Closer when it matters.
          </h4>
          <p className="phonehint">An emergency-alert concept</p>
          <div className="panic">
            <ShieldCheck size={34} />
            <strong>HELP</strong>
          </div>
          <div className="phoneitem">
            <ShieldCheck size={18} /> Emergency contacts <ChevronRight size={14} />
          </div>
          <div className="phoneitem">
            <Check size={18} /> Check-in concept <ChevronRight size={14} />
          </div>
          <div className="concept">Illustrative interface · not a live app</div>
        </div>
      </div>
      <div className="phone phone-shift">
        <div className="phonecamera" />
        <div className="phonebody">
          <div className="appname">
            <ProductIcon id="shiftmate" />
            ShiftMate <span>SA</span>
          </div>
          <p className="phonehint">Your time, made clearer.</p>
          <h4>
            A better view
            <br />
            of your working day.
          </h4>
          <div className="paybox">
            <span>Estimated gross earnings</span>
            <strong>
              R 2,480<small>.00</small>
            </strong>
            <span className="green">Illustrative example only</span>
          </div>
          <div className="phonehours">
            <div>
              <span>Recorded hours</span>
              <strong>
                40.0 <small>hrs</small>
              </strong>
            </div>
            <CalendarClock size={26} />
          </div>
          <div className="shiftrow">
            <span className="minical">
              MON
              <br />
              <b>12</b>
            </span>
            <div>
              <b>Your next shift</b>
              <span>08:00 – 17:00</span>
            </div>
          </div>
          <div className="phonebutton">Your shifts. Your overview.</div>
          <div className="concept">Illustrative interface · not a live app</div>
        </div>
      </div>
      <div className="floatinglabel">
        <div>
          <ShieldCheck size={20} />
        </div>
        <span>
          Made for everyday life.<b>Designed with purpose.</b>
        </span>
      </div>
    </div>
  );
}
