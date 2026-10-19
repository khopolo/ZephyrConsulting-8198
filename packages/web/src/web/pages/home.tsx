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
import { useCatalogue } from "../queries/store";
export default function Home() {
  const catalogue = useCatalogue();
  return (
    <>
      <Seo title="A gentle breeze of wealth" />
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
            <article className="productcard safe">
              <div className="productcardtop">
                <ProductIcon id="safespace" />
                <span className="pill">PERSONAL SAFETY</span>
              </div>
              <h3>SafeSpace</h3>
              <h4>
                One press. Five seconds.
                <br />
                Help on the way.
              </h4>
              <p>
                Designed to help you reach your chosen emergency contacts when you need support.
              </p>
              <div className="productfoot">
                <span>
                  Proposed once-off price{" "}
                  <b>
                    {catalogue.data
                      ? `R${((catalogue.data.plans.find((p) => p.productId === "safespace")?.price ?? 10000) / 100).toFixed(0)}`
                      : "Loading…"}
                  </b>
                </span>
                <Link
                  href="/products/safespace"
                  className="circlelink"
                  aria-label="Explore SafeSpace"
                >
                  <ArrowUpRight />
                </Link>
              </div>
              <span className="statusline">Features under review · Checkout not yet enabled</span>
            </article>
            <article className="productcard shift">
              <div className="productcardtop">
                <ProductIcon id="shiftmate" />
                <span className="pill">SHIFTS & ESTIMATED PAY</span>
              </div>
              <h3>
                ShiftMate <span>SA</span>
              </h3>
              <h4>
                Track. Calculate.
                <br />
                Know your pay.
              </h4>
              <p>
                A clearer view of your working hours and estimated gross earnings, designed for
                South African workers.
              </p>
              <div className="productfoot">
                <span>
                  Proposed Pro monthly{" "}
                  <b>
                    {catalogue.data
                      ? `R${((catalogue.data.plans.find((p) => p.id === "shiftmate-month")?.price ?? 3999) / 100).toFixed(2)}`
                      : "Loading…"}
                    <small>/month</small>
                  </b>
                </span>
                <Link
                  href="/products/shiftmate"
                  className="circlelink"
                  aria-label="Explore ShiftMate SA"
                >
                  <ArrowUpRight />
                </Link>
              </div>
              <span className="statusline">Features under review · Recurring billing disabled</span>
            </article>
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
