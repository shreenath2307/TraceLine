import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Cpu, Radio, Sparkles, Navigation, Layers, Compass, CheckCircle2 } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: {
      staggerChildren: 0.12
    }
  },
  viewport: { once: true, margin: "-40px" }
};

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="wrap">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="kicker">
              <span>Next-Generation Indoor RTLS</span>
            </div>
            <h1>Positioning that holds up indoors</h1>
            <p className="lede">
              Estimate a moving target’s X–Y position from a few fixed anchors, and stay accurate when signals are noisy, missing or blocked by physical walls.
            </p>
            <div className="btn-row">
              <Link to="/pricing#contact" className="btn coral">
                Get started <ArrowRight size={16} />
              </Link>
              <Link to="/console" className="btn ghost">
                Try the interactive console
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="block">
        <div className="wrap split top-align">
          <motion.div {...fadeInUp}>
            <span className="kicker">The problem</span>
            <h2>Indoor location works well in demos and less well in real buildings.</h2>
            <p style={{ marginTop: "24px" }}>
              Bluetooth and ultra-wideband can locate people, wheelchairs, infusion pumps and pallets inside a building. In practice, deployments rarely look like the lab: budgets limit how many anchors can be installed, corridors fill with people, and walls bend or block radio paths.
            </p>
            <p>
              When a measurement passes through a wall, the distance it reports is longer than the real one. A model that trusts every reading will place the target in the wrong room. When an anchor drops out, many legacy trilateration systems lose the track entirely.
            </p>
          </motion.div>

          <motion.figure {...fadeInUp}>
            <img
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=900&q=70"
              alt="A long hospital corridor"
              loading="lazy"
            />
            <figcaption>
              Hospital corridors are long, obstructed and busy: a typical setting for sparse anchor layouts.
            </figcaption>
          </motion.figure>
        </div>

        <motion.div
          className="wrap grid g4"
          style={{ marginTop: "clamp(36px, 5vw, 64px)" }}
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
        >
          <motion.div className="item" variants={fadeInUp}>
            <h3>Limited anchors</h3>
            <p>Fewer reference points means less redundancy. One bad reading has an outsized effect on the position estimate.</p>
          </motion.div>
          <motion.div className="item" variants={fadeInUp}>
            <h3>Noisy signals</h3>
            <p>Range and RSSI values fluctuate with body position, furniture and interference, even when the target is completely still.</p>
          </motion.div>
          <motion.div className="item" variants={fadeInUp}>
            <h3>NLOS bias</h3>
            <p>Non-line-of-sight obstructed paths add a consistent positive error to measured range, silently pulling estimates off course.</p>
          </motion.div>
          <motion.div className="item" variants={fadeInUp}>
            <h3>Intermittent drops</h3>
            <p>Packets drop and anchors briefly disappear. The system must continue smoothly instead of resetting or lagging.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* What we are solving */}
      <section className="block">
        <div className="wrap">
          <motion.div {...fadeInUp}>
            <span className="kicker">What we are solving</span>
            <h2>Lowest practical error on unseen data, with limited and unreliable anchors.</h2>
            <p className="lede" style={{ marginTop: "24px" }}>
              Our solution estimates X–Y position from range and/or signal-strength measurements, operates with a reduced number of reference points, reduces the influence of probable non-line-of-sight readings, uses motion history to improve stability, and reports every position together with an uncertainty value. Accuracy is compared across different anchor densities and noise levels, so a facility can see what it gains from each additional anchor before buying it.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Pipeline</span>
            <h2>From raw measurements to a confident position.</h2>
          </motion.div>

          <div className="steps">
            <motion.div className="step-item" {...fadeInUp}>
              <div className="step-badge">1</div>
              <h3>Ingest</h3>
              <p>Timestamped range/RSSI from whichever anchors are reachable, plus known anchor coordinates.</p>
            </motion.div>
            <motion.div className="step-item" {...fadeInUp}>
              <div className="step-badge">2</div>
              <h3>Qualify</h3>
              <p>Each reading is scored for likely obstruction or bias, using residuals against neighbouring anchors and recent motion.</p>
            </motion.div>
            <motion.div className="step-item" {...fadeInUp}>
              <div className="step-badge">3</div>
              <h3>Estimate</h3>
              <p>A learned model combines trusted readings with temporal filtering and weighted Gauss-Newton to produce an X–Y position.</p>
            </motion.div>
            <motion.div className="step-item" {...fadeInUp}>
              <div className="step-badge">4</div>
              <h3>Report</h3>
              <p>The position is returned with confidence radius, active anchor influences, and a plain-language reason.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Core Innovations</span>
            <h2>Seven additions built on top of the positioning challenge.</h2>
          </motion.div>

          <div className="grid g2 caps">
            <motion.div className="cap-item" {...fadeInUp}>
              <span className="num">01</span>
              <div>
                <h3>
                  AI anchor placement optimizer
                  <span className="tag">High impact</span>
                </h3>
                <p>Recommends the best locations for fixed anchors to maximize coverage and reduce positioning error. Simulate different placements and compare results before drilling walls.</p>
              </div>
            </motion.div>

            <motion.div className="cap-item" {...fadeInUp}>
              <span className="num">02</span>
              <div>
                <h3>Obstacle-aware position recovery</h3>
                <p>Detects when walls make measurements unreliable, then down-weights them, leverages alternative anchors, and uses movement history to recover location.</p>
              </div>
            </motion.div>

            <motion.div className="cap-item" {...fadeInUp}>
              <span className="num">03</span>
              <div>
                <h3>Crowd-aware tracking</h3>
                <p>Simulates crowded corridors where radio quality deteriorates, dynamically identifies dense zones, and shows where accuracy may degrade.</p>
              </div>
            </motion.div>

            <motion.div className="cap-item" {...fadeInUp}>
              <span className="num">04</span>
              <div>
                <h3>Predictive positioning</h3>
                <p>Estimates where a target is likely to move next over a 2-second horizon, maintaining a smooth track during brief radio blackouts.</p>
              </div>
            </motion.div>

            <motion.div className="cap-item" {...fadeInUp}>
              <span className="num">05</span>
              <div>
                <h3>
                  Self-learning error map
                  <span className="tag">High impact</span>
                </h3>
                <p>Records where the system repeatedly makes errors, learns location-specific bias offsets, then cross-validates them on separate unseen trajectories.</p>
              </div>
            </motion.div>

            <motion.div className="cap-item" {...fadeInUp}>
              <span className="num">06</span>
              <div>
                <h3>Emergency tracking mode</h3>
                <p>Simulates an emergency in a hospital or warehouse, prioritizes critical assets, and highlights regions with fewer than 3 reachable anchors.</p>
              </div>
            </motion.div>

            <motion.div className="cap-item" {...fadeInUp}>
              <span className="num">07</span>
              <div>
                <h3>Automatic stress testing</h3>
                <p>Generates thousands of Monte Carlo combinations of noise, missing anchors and obstructions to establish the method's mathematical breaking point.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Where it is useful */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Real-World Settings</span>
            <h2>Places where a few metres matter.</h2>
          </motion.div>

          <div className="use-grid">
            <motion.div className="use-item" {...fadeInUp}>
              <figure>
                <img
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=70"
                  alt="Warehouse aisles"
                  loading="lazy"
                />
                <figcaption>Warehouses: locating pallets and forklifts across long aisles</figcaption>
              </figure>
              <p>Locate equipment and staff across long racked aisles where tall metal shelving distorts signals.</p>
            </motion.div>

            <motion.div className="use-item" {...fadeInUp}>
              <figure>
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=70"
                  alt="Modern office interior"
                  loading="lazy"
                />
                <figcaption>Offices & public buildings: wayfinding and space utilisation</figcaption>
              </figure>
              <p>Support wayfinding and space planning in offices, academic campuses and transport hubs.</p>
            </motion.div>

            <motion.div className="use-item" {...fadeInUp}>
              <figure>
                <img
                  src="https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=70"
                  alt="Hospital ward"
                  loading="lazy"
                />
                <figcaption>Hospitals: assets, assistive devices and patients</figcaption>
              </figure>
              <p>Find wheelchairs, infusion pumps and telemetry monitors quickly, saving precious staff minutes.</p>
            </motion.div>
          </div>

          <div className="strip">
            <figure>
              <img
                src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=70"
                alt="Network hardware"
                loading="lazy"
              />
              <figcaption>Edge gateways & anchor hardware</figcaption>
            </figure>
            <figure>
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=70"
                alt="Analytics on a laptop"
                loading="lazy"
              />
              <figcaption>Spatial analytics & heatmaps</figcaption>
            </figure>
            <figure>
              <img
                src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=900&q=70"
                alt="Team on site"
                loading="lazy"
              />
              <figcaption>Engineers & pilot deployment</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Validation */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Verification</span>
            <h2>Built to be judged on hidden data, not on a favourable test set.</h2>
          </motion.div>

          <ul className="checks">
            <motion.li {...fadeInUp}>Synthetic venues with known anchor coordinates, simulated trajectories, controlled noise, packet loss and non-line-of-sight bias.</motion.li>
            <motion.li {...fadeInUp}>Evaluation on separate paths, noise levels and obstruction patterns from those used during learning.</motion.li>
            <motion.li {...fadeInUp}>Side-by-side comparison across infrastructure densities, reporting naive baseline vs Traceline openly.</motion.li>
            <motion.li {...fadeInUp}>Automated stress-test reports that state the mathematical assumptions and operational limits of the method clearly.</motion.li>
          </ul>
        </div>
      </section>

      {/* CTA Band */}
      <section className="cta-band">
        <div className="wrap btn-row" style={{ marginTop: 0, justifyContent: "center" }}>
          <Link to="/console" className="btn coral">
            Explore the console
          </Link>
          <Link to="/business" className="btn ghost">
            See the business case
          </Link>
          <Link to="/security" className="btn ghost">
            How we protect data
          </Link>
        </div>
      </section>
    </div>
  );
}
