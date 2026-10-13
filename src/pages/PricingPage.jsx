import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Send, CheckCircle2, Sparkles } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

const FAQ_ITEMS = [
  {
    q: "How many anchors do I need?",
    a: "It depends on floor area and layout. The placement optimizer simulates options and shows expected positioning error for each count, so you can select the most economical layout that meets your accuracy target."
  },
  {
    q: "Which anchor hardware is supported?",
    a: "The positioning engine works on range or signal-strength (RSSI) telemetry, making it fully compatible with off-the-shelf Bluetooth Low Energy (BLE) anchors and Ultra-Wideband (UWB) radios through standard protocol adapters."
  },
  {
    q: "What accuracy can I expect?",
    a: "Accuracy typically ranges from 1.2m to 2.4m in typical obstructed environments with sparse anchors. We report results transparently on unseen test paths and validate in your building during the initial survey walk."
  },
  {
    q: "What happens when a wall blocks the signal?",
    a: "Measurements with probable non-line-of-sight delay are down-weighted by our qualifier algorithm. The model prioritizes clean secondary anchors and combines them with temporal motion filtering to preserve a stable trajectory."
  },
  {
    q: "Can it run completely without internet access?",
    a: "Yes. The entire inference pipeline can run locally on an edge gateway or private server within your local intranet. No telemetry needs to leave your facility."
  },
  {
    q: "Is personal location data stored?",
    a: "Tracked devices use rotating pseudonymous identifiers. Location records are separated from human identity registers, with configurable retention limits down to live-only in-memory processing."
  },
  {
    q: "How long does an enterprise pilot take?",
    a: "Typically 2 to 3 weeks: site survey, temporary anchor placement, calibration walk, and an empirical evaluation comparing our model against standard trilateration."
  },
  {
    q: "How were the estimated prices calculated?",
    a: "They assume a 2 BHK (~900 sq ft with 4 anchors and 2 tags) or a 3 BHK (~1,350 sq ft with 6 anchors and 3 tags), including anchor hardware, setup, and software. Your final quote replaces them based on your actual floor plan."
  }
];

export default function PricingPage() {
  const [bhk, setBhk] = useState("2");
  const [openFaq, setOpenFaq] = useState(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    org: "",
    interest: "Pilot",
    message: ""
  });

  const is2BHK = bhk === "2";

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero sub">
        <div className="wrap">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="kicker">Transparent Estimates</div>
            <h1>Plans &amp; contact</h1>
            <p className="lede">
              Prices below are estimates for a typical home-sized site, so you can compare plans quickly. We confirm a customized quote after reviewing your floor plan, anchor count and tracked assets.
            </p>
            <div className="btn-row">
              <a href="#contact" className="btn coral">
                Send an enquiry
              </a>
              <a href="#plans" className="btn ghost">
                Compare flat sizes
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="block" id="plans">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Estimated Prices</span>
            <h2>Pick your flat size to see the estimate.</h2>
          </motion.div>

          <motion.div {...fadeInUp}>
            <div className="sizer" role="group" aria-label="Flat size switcher">
              <button
                type="button"
                aria-pressed={is2BHK}
                onClick={() => setBhk("2")}
              >
                2 BHK (~900 sq ft)
              </button>
              <button
                type="button"
                aria-pressed={!is2BHK}
                onClick={() => setBhk("3")}
              >
                3 BHK (~1,350 sq ft)
              </button>
            </div>

            <div className="assume">
              <span>Assumed area: <b>{is2BHK ? "about 900 sq ft" : "about 1,350 sq ft"}</b></span>
              <span>Sparse layout: <b>{is2BHK ? "4 anchors, 2 tags" : "6 anchors, 3 tags"}</b></span>
              <span className="small">A dense layout would require <b>{is2BHK ? "6" : "9"}</b> anchors.</span>
            </div>
          </motion.div>

          {/* Plan Cards */}
          <div className="plans-grid">
            {/* Pilot */}
            <motion.div className="plan-card" {...fadeInUp}>
              <div>
                <h3>Pilot Evaluation</h3>
                <div className="plan-price">₹0</div>
                <div className="plan-per">free 14-day evaluation</div>
                <div className="plan-brk">
                  {is2BHK
                    ? "Covers all 4 anchors of the flat. Hardware is on loan during the pilot."
                    : "Covers 5 of the 6 anchors, focused on one primary zone. Hardware on loan."}
                </div>
                <ul>
                  <li>One zone, up to 5 anchors</li>
                  <li>Simulation &amp; stress-test report</li>
                  <li>Anchor placement recommendation</li>
                  <li>Direct technical team support</li>
                </ul>
              </div>
              <a href="#contact" className="btn ghost" style={{ width: "100%" }}>
                Request a pilot
              </a>
            </motion.div>

            {/* Facility (Best) */}
            <motion.div className="plan-card best" {...fadeInUp}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>Facility Plan</h3>
                  <span className="tag">Most chosen</span>
                </div>
                <div className="plan-price" style={{ color: "var(--signal)" }}>
                  {is2BHK ? "₹29,999" : "₹44,999"}
                </div>
                <div className="plan-per">
                  {is2BHK ? "one-time setup, then ₹4,999/yr" : "one-time setup, then ₹6,999/yr"}
                </div>
                <div className="plan-brk">
                  {is2BHK
                    ? "4 anchors, 2 tags, complete installation and calibration walk."
                    : "6 anchors, 3 tags, complete installation and calibration walk."}
                </div>
                <ul>
                  <li>Full floor &amp; room coverage</li>
                  <li>Obstacle-aware recovery &amp; predictive tracking</li>
                  <li>Self-learning error map algorithm</li>
                  <li>Crowd-aware zones &amp; live web console</li>
                  <li>Business-hours SLA support</li>
                </ul>
              </div>
              <a href="#contact" className="btn coral" style={{ width: "100%" }}>
                Get a custom quote
              </a>
            </motion.div>

            {/* Enterprise */}
            <motion.div className="plan-card" {...fadeInUp}>
              <div>
                <h3>Enterprise</h3>
                <div className="plan-price">
                  {is2BHK ? "₹19,999" : "₹29,999"}
                </div>
                <div className="plan-per">
                  {is2BHK ? "per flat/site, then ₹3,499/yr" : "per flat/site, then ₹4,999/yr"}
                </div>
                <div className="plan-brk">
                  For 10 or more flats or multi-floor buildings. Central gateway and fleet management.
                </div>
                <ul>
                  <li>Everything included in Facility</li>
                  <li>Emergency tracking mode &amp; asset priority</li>
                  <li>On-premise edge gateway deployment</li>
                  <li>SSO, append-only audit export &amp; custom retention</li>
                  <li>Dedicated account engineer</li>
                </ul>
              </div>
              <a href="#contact" className="btn ghost" style={{ width: "100%" }}>
                Talk to the team
              </a>
            </motion.div>
          </div>

          <p className="small" style={{ marginTop: "24px", maxWidth: "80ch" }}>
            * Estimates are in Indian rupees, exclusive of applicable GST. Custom installations with thick reinforced concrete, high ceilings or extreme interference will be surveyed prior to confirmation.
          </p>
        </div>
      </section>

      {/* Enquiry Form */}
      <section className="block" id="contact">
        <div className="wrap split top-align">
          <motion.div {...fadeInUp}>
            <span className="kicker">Enquiry</span>
            <h2>Talk to the team.</h2>
            <p className="muted" style={{ marginTop: "14px" }}>
              Tell us your facility type, approximate square footage, and what items or personnel you need to track.
            </p>

            {formSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card"
                style={{ marginTop: "28px", borderLeft: "4px solid var(--ok)", padding: "28px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--ok)", marginBottom: "12px" }}>
                  <CheckCircle2 size={24} />
                  <h3 style={{ margin: 0, color: "var(--ok)" }}>Enquiry Received</h3>
                </div>
                <p className="muted">
                  Thank you, <b>{formData.name || "friend"}</b>. Our team at Vishwakarma Institute will review your requirements for <b>{formData.interest}</b> and reach out to <b>{formData.email}</b> within 24 hours.
                </p>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginTop: "14px" }}
                  onClick={() => setFormSubmitted(false)}
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ marginTop: "28px" }}>
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Sharma"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Work Email *</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@hospital.org"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="org">Organisation / Institution</label>
                  <input
                    id="org"
                    value={formData.org}
                    onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                    placeholder="e.g. Pune City Hospital"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="interest">Interested in</label>
                  <select
                    id="interest"
                    value={formData.interest}
                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                  >
                    <option value="Pilot">Pilot Evaluation (Free 14 days)</option>
                    <option value="Facility Plan">Facility Plan</option>
                    <option value="Enterprise Plan">Enterprise Multi-Site Plan</option>
                    <option value="Academic Partnership">Academic / Research Partnership</option>
                    <option value="Custom Integration">Custom Hardware Integration</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Facility Details &amp; Objectives</label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Floor area, number of floors, wall materials (drywall/brick), and tracked assets (wheelchairs, pumps, pallets)..."
                  />
                </div>

                <button type="submit" className="btn coral">
                  Send enquiry <Send size={16} />
                </button>
              </form>
            )}
          </motion.div>

          <motion.div {...fadeInUp}>
            <figure>
              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900&q=70"
                alt="Team reviewing indoor map blueprints"
                loading="lazy"
              />
              <figcaption>The core engineering team reads every enquiry and coordinates direct on-site calibration.</figcaption>
            </figure>
            <div className="card" style={{ marginTop: "24px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px" }}>Direct Pilot Checklist</div>
              <p className="small muted" style={{ margin: 0 }}>
                1. Floor plan digital file (.png, .dxf or CAD)<br />
                2. Target asset list &amp; battery lifetime requirements<br />
                3. On-site survey walk (half day with anchor placement preview)
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Knowledge Base</span>
            <h2>Common questions</h2>
          </motion.div>

          <div style={{ maxWidth: "860px" }}>
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <motion.div key={idx} className="faq-item" {...fadeInUp}>
                  <button
                    className="faq-trigger"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={18} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="faq-content"
                      >
                        {item.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
