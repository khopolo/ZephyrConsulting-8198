import { Link } from "wouter";
import {
  Seo,
  ArrowUpRight,
  ArrowRight,
  Check,
  services,
  ProductIcon,
  PhoneIllustration,
  SupportCTA,
} from "../components/site";
export default function Home() {
  return (
    <>
      <Seo
        title="Zephyr Consulting"
        description="Zephyr Consulting provides practical IT services, business software, application development, and support for South African businesses."
        keywords="Zephyr Consulting, IT services South Africa, application development, business software, tech support, Zephyr products, SafeSpace, ShiftMate SA, CVForge, Docuflow, Echolock"
      />
      <section className="hero">
        <div className="container herogrid">
          <div className="herocopy">
            <span className="eyebrow">
              <span className="tinyline" /> PRACTICAL TECHNOLOGY. HUMAN SUPPORT.
            </span>
            <h1>
              A gentle breeze
              <br />
              <span>of wealth</span>
            </h1>
            <p>
              Technology should make life simpler.
              <br className="desktopbreak" /> We help businesses build, manage and grow with
              <br className="desktopbreak" /> practical IT solutions and software that works for
              them.
            </p>
            <div className="heroactions">
              <Link href="/products" className="btn">
                Explore our products <ArrowUpRight size={18} />
              </Link>
              <Link href="/support" className="textlink">
                Let’s talk <ArrowRight size={18} />
              </Link>
            </div>
            <div className="herobottom">
              <span>
                <Check size={15} /> Built for real needs
              </span>
              <span>
                <Check size={15} /> South African focus
              </span>
              <span>
                <Check size={15} /> People-first support
              </span>
            </div>
          </div>
          <PhoneIllustration />
        </div>
        <div className="heroline">
          <div className="container">
            <span>THE RIGHT TOOLS. THE RIGHT SUPPORT.</span>
            <span>
              From your first idea to your everyday operations <ArrowRight size={15} />
            </span>
          </div>
        </div>
      </section>
      <section className="servicestrip container">
        {services.map((s) => (
          <Link href="/services" className="servicepreview" key={s.title}>
            <s.icon size={25} />
            <div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </section>
      <section className="section productssection">
        <div className="container">
          <div className="sectionheading">
            <div>
              <span className="eyebrow">OUR PRODUCTS</span>
              <h2>
                Real-life needs.
                <br />
                Thoughtful solutions.
              </h2>
            </div>
            <div>
              <p>
                Tools designed to bring more confidence to
                <br />
                your day — at work and beyond.
              </p>
              <Link href="/products" className="blue textlink">
                Discover our products <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <div className="productgrid">
            {[
              {
                id: "cvforge",
                title: "CVForge",
                tag: "CAREER TOOLS",
                summary: "Build a stronger CV in minutes.",
                text: "A streamlined way to create polished, professional CVs and job-ready documents.",
                status: "BETA",
                href: "/products/cvforge",
              },
              {
                id: "docuflow",
                title: "Docuflow",
                tag: "WORKFLOW AUTOMATION",
                summary: "Organise documents. Move work faster.",
                text: "A document-driven workflow platform designed for approvals, routing, and structured operations.",
                status: "PILOT",
                href: "/products/docuflow",
              },
              {
                id: "echolock",
                title: "Echolock",
                tag: "INTERACTIVE EXPERIENCE",
                summary: "Listen closely. Unlock the pattern.",
                text: "An immersive challenge experience built around sound, timing, and pattern recognition.",
                status: "PROTOTYPE",
                href: "/products/echolock",
              },
            ].map((product) => (
              <article className="productcard safe" key={product.id}>
                <div className="productcardtop">
                  <ProductIcon id={product.id} />
                  <span className="pill">{product.tag}</span>
                </div>
                <h3>{product.title}</h3>
                <h4>{product.summary}</h4>
                <p>{product.text}</p>
                <div className="productfoot">
                  <span>
                    Status <b>{product.status}</b>
                  </span>
                  <Link href={product.href} className="circlelink" aria-label={`Explore ${product.title}`}>
                    <ArrowUpRight />
                  </Link>
                </div>
                <span className="statusline">Portfolio showcase · Product availability subject to verification</span>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section why">
        <div className="container whygrid">
          <div>
            <span className="eyebrow">THE ZEPHYR APPROACH</span>
            <h2>
              Less complexity.
              <br />
              More possibility.
            </h2>
            <p>
              We believe useful technology starts with understanding people. Our focus is on
              practical solutions that fit your business — not the other way around.
            </p>
            <Link href="/about" className="blue textlink">
              Get to know Zephyr <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="whylist">
            {[
              ["Built around you", "Your needs guide the solution, from the first conversation."],
              ["Practical by design", "Clear, usable tools for real-world workflows."],
              ["Support that stays connected", "A dedicated place to ask questions and get help."],
            ].map(([title, text], i) => (
              <div key={title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <ArrowUpRight size={20} />
              </div>
            ))}
          </div>
        </div>
      </section>
      <SupportCTA />
    </>
  );
}
