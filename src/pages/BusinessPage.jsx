import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Layers, ArrowRight, BarChart3, Calculator, CheckCircle2 } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

export default function BusinessPage() {
  // Interactive Savings Calculator
  const [areaSqFt, setAreaSqFt] = useState(15000);
  const denseAnchors = Math.ceil(areaSqFt / 800);
  const tracelineAnchors = Math.ceil(areaSqFt / 2200);
  const anchorCost = 6500; // in INR (~$80) per installed anchor
  const denseCost = denseAnchors * anchorCost;
  const tracelineCost = tracelineAnchors * anchorCost;
  const savings = denseCost - tracelineCost;
  const savingsPct = Math.round((savings / denseCost) * 100);

  return (
    <div>
      <section className="hero sub">
        <div className="wrap">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="kicker">Market Potential &amp; Economics</div>
            <h1>Business analysis</h1>
            <p className="lede">
              Traceline reduces the number of anchors a facility needs for acceptable accuracy. Fewer anchors mean drastically lower hardware and cabling expenses, unlocking buildings where indoor RTLS was previously economically unfeasible.
            </p>
            <div className="btn-row">
              <Link to="/pricing" className="btn coral">
                View plans <ArrowRight size={16} />
              </Link>
              <a href="#calculator" className="btn ghost">
                Try savings calculator
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Market Size */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Market Size</span>
            <h2>TAM, SAM and SOM</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              These figures represent planning estimates for healthcare, warehousing and smart buildings in high-growth commercial corridors.
            </p>
          </motion.div>

          <div className="grid g3" style={{ gap: "24px", marginBottom: "36px" }}>
            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--signal)", fontSize: "14px", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                Total Addressable Market
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "48px", lineHeight: 1, marginBottom: "10px", color: "var(--text)" }}>
                ≈ $12B
              </div>
              <p className="muted" style={{ fontSize: "15px", margin: 0 }}>
                Global indoor positioning, asset tracking and RTLS spend across hospitals, logistics and commercial real estate.
              </p>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--blue)", fontSize: "14px", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                Serviceable Addressable Market
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "48px", lineHeight: 1, marginBottom: "10px", color: "var(--text)" }}>
                ≈ $1.5B
              </div>
              <p className="muted" style={{ fontSize: "15px", margin: 0 }}>
                Sites where sparse, low-cost anchor density is the deciding factor in India and South-East Asia.
              </p>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--ok)", fontSize: "14px", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                Serviceable Obtainable Market
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "48px", lineHeight: 1, marginBottom: "10px", color: "var(--text)" }}>
                ≈ $20M
              </div>
              <p className="muted" style={{ fontSize: "15px", margin: 0 }}>
                Realistic market share achievable through direct enterprise pilots and system-integrator partnerships in Years 1–3.
              </p>
            </motion.div>
          </div>

          <motion.div className="table-wrap" {...fadeInUp}>
            <table>
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Definition</th>
                  <th>Basis &amp; Validation Approach</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>TAM</b></td>
                  <td>Global indoor positioning &amp; RTLS market demand</td>
                  <td>Published industry research (Gartner, MarketsandMarkets); mid-range CAGR 22%</td>
                </tr>
                <tr>
                  <td><b>SAM</b></td>
                  <td>Facilities constrained by installation &amp; hardware budgets</td>
                  <td>Healthcare and supply-chain facilities seeking sub-3m accuracy with minimal infrastructure</td>
                </tr>
                <tr>
                  <td><b>SOM</b></td>
                  <td>Enterprise sites reachable through initial pilots</td>
                  <td>Targeting 120 facilities × average ₹1.4M ($17k) annual enterprise contract value</td>
                </tr>
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* Interactive Savings Calculator */}
      <section className="block" id="calculator">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">ROI Estimator</span>
            <h2>Compare infrastructure costs.</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              See how many anchors and capital expenditure Traceline spares compared to conventional dense fingerprinting or raw trilateration setups.
            </p>
          </motion.div>

          <motion.div className="card" {...fadeInUp}>
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <label style={{ fontWeight: 600, fontSize: "16px" }}>Facility Floor Area: {areaSqFt.toLocaleString()} sq ft</label>
                <span className="tag ok">{savingsPct}% estimated capex saved</span>
              </div>
              <input
                type="range"
                min="3000"
                max="60000"
                step="1000"
                value={areaSqFt}
                onChange={(e) => setAreaSqFt(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--signal)", cursor: "pointer" }}
              />
            </div>

            <div className="grid g3" style={{ gap: "20px" }}>
              <div style={{ padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid var(--line)" }}>
                <div className="small muted">Dense Anchor Baseline</div>
                <div style={{ fontSize: "30px", fontWeight: 600, margin: "8px 0" }}>{denseAnchors} anchors</div>
                <div className="small faint">Estimated cost: ₹{denseCost.toLocaleString()}</div>
              </div>

              <div style={{ padding: "20px", background: "rgba(255,90,71,0.08)", borderRadius: "10px", border: "1px solid rgba(255,90,71,0.3)" }}>
                <div className="small" style={{ color: "var(--signal)", fontWeight: 600 }}>Traceline Sparse Layout</div>
                <div style={{ fontSize: "30px", fontWeight: 600, margin: "8px 0", color: "var(--signal)" }}>{tracelineAnchors} anchors</div>
                <div className="small faint">Estimated cost: ₹{tracelineCost.toLocaleString()}</div>
              </div>

              <div style={{ padding: "20px", background: "rgba(122,217,165,0.08)", borderRadius: "10px", border: "1px solid rgba(122,217,165,0.3)" }}>
                <div className="small" style={{ color: "var(--ok)", fontWeight: 600 }}>Direct Hardware Savings</div>
                <div style={{ fontSize: "30px", fontWeight: 600, margin: "8px 0", color: "var(--ok)" }}>
                  ₹{savings.toLocaleString()}
                </div>
                <div className="small faint">{denseAnchors - tracelineAnchors} fewer anchor units to wire &amp; calibrate</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Outlook & Financial Charts */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Trajectory</span>
            <h2>Where the numbers could go.</h2>
          </motion.div>

          <div className="grid g3" style={{ gap: "28px" }}>
            {/* Chart 1: Ramp */}
            <motion.div className="card" {...fadeInUp}>
              <h3 style={{ marginBottom: "6px" }}>Ramp toward SOM</h3>
              <div className="small" style={{ marginBottom: "20px" }}>Cumulative contract value, US$ million</div>
              <svg viewBox="0 0 300 200" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                {/* Horizontal gridlines */}
                {[0, 10, 20].map((val) => {
                  const y = 170 - (val / 20) * 150;
                  return (
                    <g key={val}>
                      <line x1="34" x2="290" y1={y} y2={y} stroke="rgba(244,241,235,0.12)" strokeDasharray="3 3" />
                      <text x="26" y={y + 4} textAnchor="end" fill="rgba(244,241,235,0.45)" fontSize="11">
                        {val}
                      </text>
                    </g>
                  );
                })}
                {/* Bars */}
                {[
                  { label: "Year 1", val: 2, x: 78, color: "var(--muted)" },
                  { label: "Year 2", val: 8, x: 162, color: "var(--muted)" },
                  { label: "Year 3", val: 20, x: 246, color: "var(--signal)" }
                ].map((bar, i) => {
                  const h = (bar.val / 20) * 150;
                  const y = 170 - h;
                  return (
                    <g key={i}>
                      <motion.rect
                        x={bar.x - 26}
                        y={y}
                        width="52"
                        height={h}
                        rx="4"
                        fill={bar.color}
                        initial={{ height: 0, y: 170 }}
                        whileInView={{ height: h, y: y }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                      />
                      <text x={bar.x} y={y - 8} textAnchor="middle" fill="var(--text)" fontSize="13" fontWeight="600">
                        ${bar.val}M
                      </text>
                      <text x={bar.x} y="190" textAnchor="middle" fill="rgba(244,241,235,0.6)" fontSize="12">
                        {bar.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </motion.div>

            {/* Chart 2: Error Curve */}
            <motion.div className="card" {...fadeInUp}>
              <h3 style={{ marginBottom: "6px" }}>Error vs. Anchor Count</h3>
              <div className="small" style={{ marginBottom: "20px" }}>Position error in metres (lower is better)</div>
              <svg viewBox="0 0 300 200" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                {/* Gridlines */}
                {[0, 2, 4, 6].map((val) => {
                  const y = 170 - (val / 6) * 150;
                  return (
                    <g key={val}>
                      <line x1="34" x2="290" y1={y} y2={y} stroke="rgba(244,241,235,0.12)" strokeDasharray="3 3" />
                      <text x="26" y={y + 4} textAnchor="end" fill="rgba(244,241,235,0.45)" fontSize="11">
                        {val}m
                      </text>
                    </g>
                  );
                })}
                {/* Target line */}
                <line x1="34" x2="290" y1={170 - (2.5 / 6) * 150} y2={170 - (2.5 / 6) * 150} stroke="var(--ok)" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="286" y={170 - (2.5 / 6) * 150 - 6} textAnchor="end" fill="var(--ok)" fontSize="11" fontWeight="600">
                  Target 2.5m
                </text>

                {/* Base curve (dashed grey) */}
                <path
                  d="M 48 20 Q 130 90 276 112"
                  fill="none"
                  stroke="rgba(244,241,235,0.4)"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
                {/* Traceline curve (coral solid) */}
                <motion.path
                  d="M 48 90 Q 130 120 276 128"
                  fill="none"
                  stroke="var(--signal)"
                  strokeWidth="2.8"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
                <circle cx="48" cy="90" r="4" fill="var(--signal)" />
                <circle cx="162" cy="118" r="4" fill="var(--signal)" />
                <circle cx="276" cy="128" r="4" fill="var(--signal)" />

                <text x="162" y="190" textAnchor="middle" fill="rgba(244,241,235,0.6)" fontSize="12">
                  Anchors installed (4 → 20)
                </text>
              </svg>
              <div style={{ display: "flex", gap: "16px", marginTop: "14px", fontSize: "12px", justifyContent: "center" }}>
                <span style={{ color: "rgba(244,241,235,0.5)" }}>--- Dense baseline</span>
                <span style={{ color: "var(--signal)", fontWeight: 600 }}>— Traceline AI</span>
              </div>
            </motion.div>

            {/* Chart 3: Revenue mix */}
            <motion.div className="card" {...fadeInUp}>
              <h3 style={{ marginBottom: "6px" }}>Revenue mix</h3>
              <div className="small" style={{ marginBottom: "20px" }}>Share of annual revenue by stream</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { name: "Per-site subscription", pct: 50, color: "var(--signal)" },
                  { name: "Per-asset tracking tier", pct: 25, color: "var(--blue)" },
                  { name: "Placement & site survey", pct: 15, color: "var(--amber)" },
                  { name: "Integration & SLA support", pct: 10, color: "var(--ok)" }
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "6px" }}>
                      <span>{item.name}</span>
                      <b>{item.pct}%</b>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", overflow: "hidden" }}>
                      <motion.div
                        style={{ height: "100%", background: item.color, borderRadius: "99px" }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${item.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scalability */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Scalability</span>
            <h2>Why the business model scales smoothly.</h2>
          </motion.div>

          <div className="grid g3">
            <motion.div className="item" {...fadeInUp}>
              <h3>Software-first</h3>
              <p>The core IP is an inference engine, not expensive proprietary silicon. It works on off-the-shelf BLE beacons and UWB radios.</p>
            </motion.div>
            <motion.div className="item" {...fadeInUp}>
              <h3>Reduced capex</h3>
              <p>Achieving acceptable accuracy with fewer anchors cuts capital expense and installation friction, the #1 barrier to enterprise RTLS adoption.</p>
            </motion.div>
            <motion.div className="item" {...fadeInUp}>
              <h3>Fast onboarding</h3>
              <p>Floorplan ingestion, initial anchor layout optimization, and a single calibration walk set up a new building in days.</p>
            </motion.div>
            <motion.div className="item" {...fadeInUp}>
              <h3>Flexible deployment</h3>
              <p>Runs on local low-power gateways for sub-second zero-cloud latency, or centralized on cloud clusters for multi-campus reporting.</p>
            </motion.div>
            <motion.div className="item" {...fadeInUp}>
              <h3>Network effects</h3>
              <p>Each deployment enriches our obstruction residual database, continuously refining generalisation on unseen floor plans.</p>
            </motion.div>
            <motion.div className="item" {...fadeInUp}>
              <h3>Enterprise tools</h3>
              <p>Built-in placement planning and stress testing allow facility managers to self-diagnose coverage gaps and budget accurately.</p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="wrap btn-row" style={{ marginTop: 0, justifyContent: "center" }}>
          <Link to="/pricing" className="btn coral">
            Explore pricing &amp; plans
          </Link>
          <Link to="/console" className="btn ghost">
            Test the live model in console
          </Link>
        </div>
      </section>
    </div>
  );
}
