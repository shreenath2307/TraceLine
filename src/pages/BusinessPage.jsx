import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Layers,
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Truck,
  Briefcase,
  Stethoscope,
  ShieldCheck,
  Compass
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

export default function BusinessPage() {
  // Interactive Savings Calculator State (fully editable)
  const [areaSqFt, setAreaSqFt] = useState(15000);
  const [anchorCost, setAnchorCost] = useState(6500); // in INR per anchor (~$80)
  const [denseCoverage, setDenseCoverage] = useState(800); // sq ft per anchor in dense grid
  const [sparseCoverage, setSparseCoverage] = useState(2200); // sq ft per anchor in Traceline sparse layout

  const denseAnchors = Math.ceil(areaSqFt / Math.max(100, denseCoverage));
  const tracelineAnchors = Math.ceil(areaSqFt / Math.max(100, sparseCoverage));
  const denseCost = denseAnchors * anchorCost;
  const tracelineCost = tracelineAnchors * anchorCost;
  const savings = Math.max(0, denseCost - tracelineCost);
  const savingsPct = denseCost > 0 ? Math.round((savings / denseCost) * 100) : 0;

  // Interactive Unit Economics State
  const [acv, setAcv] = useState(1200000); // Annual Contract Value (INR)
  const [cac, setCac] = useState(300000); // Customer Acquisition Cost (INR)
  const [grossMargin, setGrossMargin] = useState(78); // Gross Margin %
  const [churnRate, setChurnRate] = useState(5); // Annual Churn Rate %

  const paybackMonths = Math.max(0.1, ((cac / Math.max(1, acv * (grossMargin / 100))) * 12)).toFixed(1);
  const ltv = Math.round((acv * (grossMargin / 100)) / Math.max(0.01, churnRate / 100));
  const ltvCacRatio = (ltv / Math.max(1, cac)).toFixed(1);

  return (
    <div>
      <section className="hero sub" data-guide="business-hero">
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

      {/* Market Size (TAM, SAM, SOM) */}
      <section className="block" data-guide="tam-sam-som">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Market Size</span>
            <h2>TAM, SAM and SOM</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              These figures represent illustrative planning estimates for healthcare, warehousing and smart buildings in high-growth commercial corridors.
            </p>
          </motion.div>

          <div className="grid g3" style={{ gap: "24px", marginBottom: "36px" }}>
            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--signal)", fontSize: "14px", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                Total Addressable Market
              </div>
              <div style={{ fontFamily: "var(--font)", fontVariantNumeric: "tabular-nums", fontSize: "48px", lineHeight: 1, marginBottom: "10px", color: "var(--text)" }}>
                ≈ $12B
              </div>
              <p className="muted" style={{ fontSize: "15px", margin: 0 }}>
                Global indoor positioning, asset tracking and RTLS spend across hospitals, logistics and commercial real estate.
              </p>
              <div className="small faint" style={{ marginTop: "12px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--signal-secondary)", fontSize: "14px", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                Serviceable Addressable Market
              </div>
              <div style={{ fontFamily: "var(--font)", fontVariantNumeric: "tabular-nums", fontSize: "48px", lineHeight: 1, marginBottom: "10px", color: "var(--text)" }}>
                ≈ $1.5B
              </div>
              <p className="muted" style={{ fontSize: "15px", margin: 0 }}>
                Sites where sparse, low-cost anchor density is the deciding factor in India and South-East Asia.
              </p>
              <div className="small faint" style={{ marginTop: "12px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--ok)", fontSize: "14px", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                Serviceable Obtainable Market
              </div>
              <div style={{ fontFamily: "var(--font)", fontVariantNumeric: "tabular-nums", fontSize: "48px", lineHeight: 1, marginBottom: "10px", color: "var(--text)" }}>
                ≈ $20M
              </div>
              <p className="muted" style={{ fontSize: "15px", margin: 0 }}>
                Realistic market share achievable through direct enterprise pilots and system-integrator partnerships in Years 1–3.
              </p>
              <div className="small faint" style={{ marginTop: "12px" }}>Illustrative planning estimate</div>
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
                  <td>Illustrative planning estimate; mid-range projected industry CAGR ~22%</td>
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
      <section className="block" id="calculator" data-guide="savings-calculator">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">ROI Estimator</span>
            <h2>Compare infrastructure costs.</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              See how many anchors and capital expenditure Traceline spares compared to conventional dense fingerprinting or raw trilateration setups. Adjust floor area, hardware pricing, and anchor coverage densities below.
            </p>
          </motion.div>

          <motion.div className="card" {...fadeInUp}>
            {/* Primary Area Range */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontWeight: 600, fontSize: "15px" }}>Facility Floor Area: {areaSqFt.toLocaleString()} sq ft</label>
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

            {/* Editable Assumptions Grid */}
            <div className="grid g3" style={{ gap: "16px", marginBottom: "28px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--line)" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--faint)", marginBottom: "6px" }}>
                  Installed Cost / Anchor (₹)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="50000"
                  step="500"
                  value={anchorCost}
                  onChange={(e) => setAnchorCost(Math.max(1, Number(e.target.value)))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--faint)", marginBottom: "6px" }}>
                  Dense Grid Coverage (sq ft/anchor)
                </label>
                <input
                  type="number"
                  min="200"
                  max="2000"
                  step="50"
                  value={denseCoverage}
                  onChange={(e) => setDenseCoverage(Math.max(100, Number(e.target.value)))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--faint)", marginBottom: "6px" }}>
                  Sparse Coverage (sq ft/anchor)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="5000"
                  step="100"
                  value={sparseCoverage}
                  onChange={(e) => setSparseCoverage(Math.max(200, Number(e.target.value)))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
                />
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid g3" style={{ gap: "20px" }}>
              <div style={{ padding: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid var(--line)" }}>
                <div className="small muted">Dense Anchor Baseline</div>
                <div style={{ fontSize: "30px", fontWeight: 600, margin: "8px 0", fontVariantNumeric: "tabular-nums" }}>{denseAnchors} anchors</div>
                <div className="small faint" style={{ fontVariantNumeric: "tabular-nums" }}>Estimated cost: ₹{denseCost.toLocaleString()}</div>
              </div>

              <div style={{ padding: "20px", background: "var(--signal-subtle)", borderRadius: "10px", border: "1px solid rgba(127, 178, 214, 0.3)" }}>
                <div className="small" style={{ color: "var(--signal)", fontWeight: 600 }}>Traceline Sparse Layout</div>
                <div style={{ fontSize: "30px", fontWeight: 600, margin: "8px 0", color: "var(--signal)", fontVariantNumeric: "tabular-nums" }}>{tracelineAnchors} anchors</div>
                <div className="small faint" style={{ fontVariantNumeric: "tabular-nums" }}>Estimated cost: ₹{tracelineCost.toLocaleString()}</div>
              </div>

              <div style={{ padding: "20px", background: "rgba(122,217,165,0.08)", borderRadius: "10px", border: "1px solid rgba(122,217,165,0.3)" }}>
                <div className="small" style={{ color: "var(--ok)", fontWeight: 600 }}>Direct Hardware Savings</div>
                <div style={{ fontSize: "30px", fontWeight: 600, margin: "8px 0", color: "var(--ok)", fontVariantNumeric: "tabular-nums" }}>
                  ₹{savings.toLocaleString()}
                </div>
                <div className="small faint">{Math.max(0, denseAnchors - tracelineAnchors)} fewer anchor units to wire &amp; calibrate</div>
              </div>
            </div>

            <p className="small faint" style={{ marginTop: "18px", margin: "18px 0 0" }}>
              * Illustrative planning estimate for typical commercial deployments. Cable drop rates and labor vary by region and union certification.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Outlook & Financial Charts */}
      <section className="block" data-guide="financial-charts">
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
              <div className="small faint" style={{ marginTop: "10px", textAlign: "center" }}>Illustrative planning estimate</div>
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
                {/* Traceline curve (sky blue solid) */}
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
              <div className="small faint" style={{ marginTop: "6px", textAlign: "center" }}>Illustrative planning estimate</div>
            </motion.div>

            {/* Chart 3: Revenue mix */}
            <motion.div className="card" {...fadeInUp}>
              <h3 style={{ marginBottom: "6px" }}>Revenue mix</h3>
              <div className="small" style={{ marginBottom: "20px" }}>Share of annual revenue by stream</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { name: "Per-site subscription", pct: 50, color: "var(--signal)" },
                  { name: "Per-asset tracking tier", pct: 25, color: "var(--signal-secondary)" },
                  { name: "Placement & site survey", pct: 15, color: "rgba(127,178,214,0.6)" },
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
                        whileInView={{ width: item.pct + "%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="small faint" style={{ marginTop: "16px", textAlign: "center" }}>Illustrative planning estimate</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scalability */}
      <section className="block" data-guide="scalability">
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

      {/* NEW SECTION 1: The Problem: What dense anchor deployments cost today */}
      <section className="block" data-guide="problem-analysis">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">The Problem</span>
            <h2>What dense anchor deployments cost today.</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              Traditional indoor positioning systems require an anchor node every 12–18 metres in every direction to guarantee line-of-sight. Across large facilities, the resulting infrastructure overhead makes widespread adoption economically unviable.
            </p>
          </motion.div>

          <div className="grid g4" style={{ gap: "20px" }}>
            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--signal)", marginBottom: "12px" }}>
                <DollarSign size={24} />
              </div>
              <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Cabling &amp; Conduit Runaway</h3>
              <p className="muted" style={{ fontSize: "14.5px" }}>
                The radio sensor is often only 25% of total capital expenditure. Pulling certified plenum-rated Ethernet and conduit through walls, ceilings, and fire barriers regularly costs ₹12,000–₹18,000 per drop in labor and contractor certification.
              </p>
              <div className="small faint" style={{ marginTop: "12px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--signal)", marginBottom: "12px" }}>
                <Layers size={24} />
              </div>
              <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Survey &amp; Calibration Drag</h3>
              <p className="muted" style={{ fontSize: "14.5px" }}>
                Dense setups require painstaking multi-week radio fingerprint surveys and millimeter-accurate anchor coordinate registration. Whenever partitions move or racks are reconfigured, the entire fingerprint grid degrades.
              </p>
              <div className="small faint" style={{ marginTop: "12px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--signal)", marginBottom: "12px" }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Maintenance Multipliers</h3>
              <p className="muted" style={{ fontSize: "14.5px" }}>
                More hardware units mean proportional failure rates. Facilities with hundreds of ceiling units face constant lift rentals, maintenance disruption windows, and frequent battery replacement cycles for unpowered beacons.
              </p>
              <div className="small faint" style={{ marginTop: "12px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--signal)", marginBottom: "12px" }}>
                <TrendingUp size={24} />
              </div>
              <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Pilot-to-Rollout Freeze</h3>
              <p className="muted" style={{ fontSize: "14.5px" }}>
                Because dense grids cost millions upfront, enterprise pilot projects frequently stall in procurement approvals. 85% of pilot sites fail to reach full-campus production because the hardware economics simply do not close.
              </p>
              <div className="small faint" style={{ marginTop: "12px" }}>Illustrative planning estimate</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NEW SECTION 2: Customer Segments */}
      <section className="block" data-guide="customer-segments">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Customer Segments</span>
            <h2>Tailored solutions for operational environments.</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              How sparse-infrastructure indoor tracking addresses specific operational pain points and delivers measurable ROI across four primary enterprise sectors.
            </p>
          </motion.div>

          <div className="grid g2" style={{ gap: "24px" }}>
            <motion.div className="card" {...fadeInUp}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <Stethoscope size={22} color="var(--signal)" />
                <h3 style={{ fontSize: "20px", margin: 0 }}>Hospitals &amp; Healthcare Systems</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14.5px", marginTop: "12px" }}>
                <div><b style={{ color: "var(--text)" }}>Economic Buyer:</b> <span className="muted">VP of Clinical Operations / Chief Biomedical Engineering Officer</span></div>
                <div><b style={{ color: "var(--text)" }}>Core Pain Point:</b> <span className="muted">Expensive diagnostic equipment (infusion pumps, ultrasound carts, wheelchairs) hoarded or lost between shifts; nurses waste 20+ minutes per shift locating devices.</span></div>
                <div><b style={{ color: "var(--text)" }}>Primary Use Case:</b> <span className="muted">Real-time clinical asset tracking, bed turnaround management, and rapid emergency crash cart localization across multi-ward floors.</span></div>
                <div><b style={{ color: "var(--text)" }}>Delivered Value:</b> <span className="muted">Eliminates search delays, avoids redundant equipment rental leases, and enhances regulatory compliance.</span></div>
              </div>
              <div className="small faint" style={{ marginTop: "14px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <Truck size={22} color="var(--signal)" />
                <h3 style={{ fontSize: "20px", margin: 0 }}>Warehouses &amp; 3PL Logistics</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14.5px", marginTop: "12px" }}>
                <div><b style={{ color: "var(--text)" }}>Economic Buyer:</b> <span className="muted">VP of Supply Chain / Logistics Engineering Director</span></div>
                <div><b style={{ color: "var(--text)" }}>Core Pain Point:</b> <span className="muted">Heavy metal racking and dynamic freight stacks cause severe RF multipath scattering and line-of-sight blockage, making conventional trilateration unusable.</span></div>
                <div><b style={{ color: "var(--text)" }}>Primary Use Case:</b> <span className="muted">Pallet position verification, forklift route optimization, inventory dwell-time monitoring, and shipping bay turnaround analytics.</span></div>
                <div><b style={{ color: "var(--text)" }}>Delivered Value:</b> <span className="muted">Reduces lost pallet search time by 70%, optimizes dock turnaround, and avoids costly high-density ceiling wiring.</span></div>
              </div>
              <div className="small faint" style={{ marginTop: "14px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <Building2 size={22} color="var(--signal)" />
                <h3 style={{ fontSize: "20px", margin: 0 }}>Corporate Offices &amp; Smart Campuses</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14.5px", marginTop: "12px" }}>
                <div><b style={{ color: "var(--text)" }}>Economic Buyer:</b> <span className="muted">Head of Workplace Experience / Corporate Real Estate Director</span></div>
                <div><b style={{ color: "var(--text)" }}>Core Pain Point:</b> <span className="muted">Hybrid working models leave desk utilization unpredictable; traditional per-desk PIR sensors cost too much to install and maintain across hundreds of desks.</span></div>
                <div><b style={{ color: "var(--text)" }}>Primary Use Case:</b> <span className="muted">Aggregated zone occupancy, meeting room utilization patterns, hot-desk availability, and smart HVAC setback automation.</span></div>
                <div><b style={{ color: "var(--text)" }}>Delivered Value:</b> <span className="muted">Optimizes real estate leasing footprints and lowers HVAC energy spend with zero invasive optical cameras.</span></div>
              </div>
              <div className="small faint" style={{ marginTop: "14px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <Briefcase size={22} color="var(--signal)" />
                <h3 style={{ fontSize: "20px", margin: 0 }}>Outpatient Clinics &amp; Urgent Care</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14.5px", marginTop: "12px" }}>
                <div><b style={{ color: "var(--text)" }}>Economic Buyer:</b> <span className="muted">Clinic Managing Director / Practice Operations Administrator</span></div>
                <div><b style={{ color: "var(--text)" }}>Core Pain Point:</b> <span className="muted">Short lease periods and modest IT budgets prevent ceiling drilling; patient wait times and exam room bottlenecks are hard to diagnose without telemetry.</span></div>
                <div><b style={{ color: "var(--text)" }}>Primary Use Case:</b> <span className="muted">Patient flow auditing, exam room turnaround monitoring, and mobile diagnostic tablet tracking.</span></div>
                <div><b style={{ color: "var(--text)" }}>Delivered Value:</b> <span className="muted">Rapid weekend deployment with 4–6 anchors, immediate throughput insights, and zero permanent architectural damage.</span></div>
              </div>
              <div className="small faint" style={{ marginTop: "14px" }}>Illustrative planning estimate</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NEW SECTION 3: Competitor & Alternative Comparison Table */}
      <section className="block" data-guide="competitor-table">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Competitive Comparison</span>
            <h2>How Traceline compares to alternative technologies.</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              A qualitative comparison across hardware requirements, infrastructure capital expenditures, and tracking resilience in obstructed real-world buildings.
            </p>
          </motion.div>

          <motion.div className="table-wrap" {...fadeInUp}>
            <table>
              <thead>
                <tr>
                  <th>Technology / Approach</th>
                  <th>Anchor Density Required</th>
                  <th>Infrastructure Capex</th>
                  <th>NLOS Obstruction Resilience</th>
                  <th>Typical Real-World Accuracy</th>
                  <th>Deployment Complexity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Dense Ultra-Wideband (UWB)</b></td>
                  <td>High (1 anchor / 400–800 sq ft)</td>
                  <td>Very High (specialized silicon + daisy-chained clock sync)</td>
                  <td>Moderate (signals severely attenuated by drywall/concrete)</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>0.2m – 0.5m</td>
                  <td>High (sub-nanosecond calibration &amp; site surveying)</td>
                </tr>
                <tr>
                  <td><b>Conventional BLE Beacons</b></td>
                  <td>High (dense grid for RSSI fingerprinting)</td>
                  <td>Moderate (cheap radios, but frequent battery servicing)</td>
                  <td>Poor (severe multipath flutter &amp; human body attenuation)</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>3.0m – 8.0m</td>
                  <td>Labor-intensive manual RSSI fingerprint mapping</td>
                </tr>
                <tr>
                  <td><b>Wi-Fi RTT / FTM (802.11mc)</b></td>
                  <td>Moderate (tied to access point spacing)</td>
                  <td>High (requires full enterprise access point upgrades)</td>
                  <td>Moderate (reflections distort fine timing measurements)</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>2.0m – 4.5m</td>
                  <td>Dependent on enterprise IT network topology</td>
                </tr>
                <tr>
                  <td><b>Camera / Computer Vision</b></td>
                  <td>High (unobstructed line-of-sight everywhere)</td>
                  <td>Very High (expensive 4K optics + edge GPU servers)</td>
                  <td>Very Poor (completely blind behind partitions &amp; doors)</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>0.1m – 0.3m</td>
                  <td>Extreme (strict HIPAA/GDPR employee privacy hurdles)</td>
                </tr>
                <tr style={{ background: "var(--signal-subtle)", borderLeft: "3px solid var(--signal)" }}>
                  <td><b style={{ color: "var(--signal)" }}>Traceline (Sparse AI RTLS)</b></td>
                  <td><b style={{ color: "var(--signal)" }}>Sparse (1 anchor / 2,000–2,500 sq ft)</b></td>
                  <td><b style={{ color: "var(--ok)" }}>Low (minimal hardware, standard cabling)</b></td>
                  <td><b style={{ color: "var(--ok)" }}>High (neural NLOS downweighting &amp; uncertainty)</b></td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}><b style={{ color: "var(--text)" }}>1.5m – 2.5m (sub-room grade)</b></td>
                  <td><b style={{ color: "var(--signal)" }}>Rapid (auto-placement optimizer + 1 walk)</b></td>
                </tr>
              </tbody>
            </table>
          </motion.div>
          <div className="small faint" style={{ marginTop: "12px" }}>
            * Qualitative assessment based on published architecture baselines and illustrative planning estimates.
          </div>
        </div>
      </section>

      {/* NEW SECTION 4: Business Model & Unit Economics */}
      <section className="block" data-guide="unit-economics">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Unit Economics</span>
            <h2>Business model and unit economics.</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              Our software-first recurring subscription model decouples revenue growth from hardware manufacturing risks. Adjust the assumptions below to inspect unit economics interactively.
            </p>
          </motion.div>

          <motion.div className="card" {...fadeInUp}>
            <h3 style={{ fontSize: "20px", marginBottom: "18px" }}>Interactive Unit Economics Simulator</h3>

            {/* Editable Assumptions */}
            <div className="grid g4" style={{ gap: "16px", marginBottom: "28px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--faint)", marginBottom: "6px" }}>
                  Annual Contract Value (₹)
                </label>
                <input
                  type="number"
                  min="200000"
                  max="5000000"
                  step="50000"
                  value={acv}
                  onChange={(e) => setAcv(Math.max(10000, Number(e.target.value)))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--faint)", marginBottom: "6px" }}>
                  Customer Acquisition Cost (₹)
                </label>
                <input
                  type="number"
                  min="50000"
                  max="2000000"
                  step="25000"
                  value={cac}
                  onChange={(e) => setCac(Math.max(1000, Number(e.target.value)))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--line)", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--faint)", marginBottom: "6px" }}>
                  Gross Margin ({grossMargin}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="1"
                  value={grossMargin}
                  onChange={(e) => setGrossMargin(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--signal)", cursor: "pointer", marginTop: "10px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", color: "var(--faint)", marginBottom: "6px" }}>
                  Annual Churn Rate ({churnRate}%)
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={churnRate}
                  onChange={(e) => setChurnRate(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--signal)", cursor: "pointer", marginTop: "10px" }}
                />
              </div>
            </div>

            {/* Calculated Metrics */}
            <div className="grid g3" style={{ gap: "20px", marginBottom: "28px" }}>
              <div style={{ padding: "18px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid var(--line)" }}>
                <div className="small muted">CAC Payback Period</div>
                <div style={{ fontSize: "32px", fontWeight: 700, margin: "6px 0", color: "var(--signal)", fontVariantNumeric: "tabular-nums" }}>
                  {paybackMonths} mo
                </div>
                <div className="small faint">Time to recover full sales &amp; marketing spend</div>
              </div>

              <div style={{ padding: "18px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid var(--line)" }}>
                <div className="small muted">Customer Lifetime Value (LTV)</div>
                <div style={{ fontSize: "32px", fontWeight: 700, margin: "6px 0", color: "var(--ok)", fontVariantNumeric: "tabular-nums" }}>
                  ₹{(ltv / 100000).toFixed(1)}L
                </div>
                <div className="small faint">Gross profit over average customer lifespan</div>
              </div>

              <div style={{ padding: "18px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid var(--line)" }}>
                <div className="small muted">LTV : CAC Ratio</div>
                <div style={{ fontSize: "32px", fontWeight: 700, margin: "6px 0", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                  {ltvCacRatio}x
                </div>
                <div className="small faint">&gt;3x target for scalable enterprise SaaS</div>
              </div>
            </div>

            {/* Revenue Streams Overview */}
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, textTransform: "uppercase", color: "var(--signal)", marginBottom: "12px" }}>
                Commercial Pricing Logic &amp; Revenue Streams
              </div>
              <div className="grid g2" style={{ gap: "16px", fontSize: "14px" }}>
                <div>
                  <b style={{ color: "var(--text)" }}>1. Per-Site Annual Software License:</b>
                  <p className="muted" style={{ margin: "4px 0 0" }}>Base tier scaled by monitored square footage, covering edge model updates, automated placement optimizer, and map rendering.</p>
                </div>
                <div>
                  <b style={{ color: "var(--text)" }}>2. Active Tag Tiering:</b>
                  <p className="muted" style={{ margin: "4px 0 0" }}>Volume pricing per simultaneously tracked badge, wheelchair or mobile cart, with sub-second positioning guarantees.</p>
                </div>
                <div>
                  <b style={{ color: "var(--text)" }}>3. Site Onboarding &amp; Digital Twin Setup:</b>
                  <p className="muted" style={{ margin: "4px 0 0" }}>One-time assisted survey walk, CAD floorplan ingestion, and initial RF obstruction calibration fee.</p>
                </div>
                <div>
                  <b style={{ color: "var(--text)" }}>4. Enterprise Intranet Appliance &amp; SLA:</b>
                  <p className="muted" style={{ margin: "4px 0 0" }}>Dedicated zero-cloud edge gateway firmware licensing, 99.9% uptime SLA, and custom hospital EHR / logistics ERP connectors.</p>
                </div>
              </div>
            </div>
            <div className="small faint" style={{ marginTop: "16px" }}>* All financial simulations are illustrative planning estimates for enterprise SaaS modeling.</div>
          </motion.div>
        </div>
      </section>

      {/* NEW SECTION 5: Go-to-Market & 3-Year Roadmap */}
      <section className="block" data-guide="gtm-roadmap">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Go-To-Market</span>
            <h2>3-year commercialization roadmap.</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              A disciplined expansion strategy progressing from direct healthcare proof-of-concepts to system-integrator distribution and self-serve global rollouts.
            </p>
          </motion.div>

          <div className="grid g3" style={{ gap: "24px" }}>
            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--signal)", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                Year 1: Direct Enterprise Pilots
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>Foundation &amp; Validation</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                <li style={{ display: "flex", gap: "8px" }}><CheckCircle2 size={16} color="var(--signal)" style={{ flexShrink: 0, marginTop: "2px" }} /><span className="muted">Execute 10–15 high-touch hospital and warehouse pilots in India.</span></li>
                <li style={{ display: "flex", gap: "8px" }}><CheckCircle2 size={16} color="var(--signal)" style={{ flexShrink: 0, marginTop: "2px" }} /><span className="muted">Build comprehensive obstruction residual database across 50,000 m² of varied floorplans.</span></li>
                <li style={{ display: "flex", gap: "8px" }}><CheckCircle2 size={16} color="var(--signal)" style={{ flexShrink: 0, marginTop: "2px" }} /><span className="muted">Release open evaluation console with live WebAssembly ONNX inference.</span></li>
              </ul>
              <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
                <span className="small faint">Milestone Target: </span>
                <b style={{ color: "var(--text)" }}>$1.5M – $2.0M ARR</b>
              </div>
              <div className="small faint" style={{ marginTop: "6px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--signal-secondary)", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                Year 2: Channel Partner Scale
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>System Integrators &amp; OEMs</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                <li style={{ display: "flex", gap: "8px" }}><CheckCircle2 size={16} color="var(--signal-secondary)" style={{ flexShrink: 0, marginTop: "2px" }} /><span className="muted">Certify regional healthcare IT integrators and warehouse automation providers.</span></li>
                <li style={{ display: "flex", gap: "8px" }}><CheckCircle2 size={16} color="var(--signal-secondary)" style={{ flexShrink: 0, marginTop: "2px" }} /><span className="muted">Bundle pre-loaded gateway firmware with leading BLE beacon hardware vendors.</span></li>
                <li style={{ display: "flex", gap: "8px" }}><CheckCircle2 size={16} color="var(--signal-secondary)" style={{ flexShrink: 0, marginTop: "2px" }} /><span className="muted">Ship mobile self-calibration app to reduce onsite onboarding time to under 4 hours.</span></li>
              </ul>
              <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
                <span className="small faint">Milestone Target: </span>
                <b style={{ color: "var(--text)" }}>$6.0M – $8.0M ARR</b>
              </div>
              <div className="small faint" style={{ marginTop: "6px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ color: "var(--ok)", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>
                Year 3: Global Platform
              </div>
              <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>Multi-Campus Self-Serve</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                <li style={{ display: "flex", gap: "8px" }}><CheckCircle2 size={16} color="var(--ok)" style={{ flexShrink: 0, marginTop: "2px" }} /><span className="muted">Expand commercial operations to South-East Asia and Middle-East healthcare networks.</span></li>
                <li style={{ display: "flex", gap: "8px" }}><CheckCircle2 size={16} color="var(--ok)" style={{ flexShrink: 0, marginTop: "2px" }} /><span className="muted">Introduce hybrid sensor fusion (BLE RSSI + UWB ranging + IMU pedometry).</span></li>
                <li style={{ display: "flex", gap: "8px" }}><CheckCircle2 size={16} color="var(--ok)" style={{ flexShrink: 0, marginTop: "2px" }} /><span className="muted">Self-service floorplan CAD upload and automated anchor placement optimizer cloud portal.</span></li>
              </ul>
              <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
                <span className="small faint">Milestone Target: </span>
                <b style={{ color: "var(--text)" }}>$18.0M – $20.0M ARR (SOM Target)</b>
              </div>
              <div className="small faint" style={{ marginTop: "6px" }}>Illustrative planning estimate</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NEW SECTION 6: Risks & Mitigations */}
      <section className="block" data-guide="risks-mitigations">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Risk Governance</span>
            <h2>Risks and engineering mitigations.</h2>
            <p className="muted" style={{ marginTop: "16px", maxWidth: "66ch" }}>
              Identified operational, technical, and compliance risks paired with concrete engineering architecture mitigations.
            </p>
          </motion.div>

          <div className="grid g2" style={{ gap: "24px" }}>
            <motion.div className="card" {...fadeInUp}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <AlertTriangle size={20} color="var(--signal)" />
                <h3 style={{ fontSize: "18px", margin: 0 }}>RF Path Drift in Dynamic Environments</h3>
              </div>
              <p className="muted" style={{ fontSize: "14.5px", marginBottom: "12px" }}>
                <b>Risk:</b> Bulk freight, temporary drywall, or shifting crowds alter radio wave propagation over time, degrading baseline neural predictions.
              </p>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "14px" }}>
                <b style={{ color: "var(--ok)" }}>Mitigation:</b> Continuous background Bayesian residual tracking flags anchors whose live measurements drift from expected distributions, dynamically widening uncertainty bounds and re-weighting clean secondary anchors without manual intervention.
              </div>
              <div className="small faint" style={{ marginTop: "10px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <AlertTriangle size={20} color="var(--signal)" />
                <h3 style={{ fontSize: "18px", margin: 0 }}>Hardware Fragmentation &amp; Antenna Variance</h3>
              </div>
              <p className="muted" style={{ fontSize: "14.5px", marginBottom: "12px" }}>
                <b>Risk:</b> Variations across third-party beacon manufacturers, antenna radiation patterns, and clock oscillator drift complicate uniform inference.
              </p>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "14px" }}>
                <b style={{ color: "var(--ok)" }}>Mitigation:</b> Abstract input normalization layer standardizes raw RSSI and ToF vectors into unified feature representations, isolating the core neural model from manufacturer quirks.
              </div>
              <div className="small faint" style={{ marginTop: "10px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <AlertTriangle size={20} color="var(--signal)" />
                <h3 style={{ fontSize: "18px", margin: 0 }}>Enterprise Proof-of-Concept Fatigue</h3>
              </div>
              <p className="muted" style={{ fontSize: "14.5px", marginBottom: "12px" }}>
                <b>Risk:</b> Healthcare and industrial enterprise sales cycles stalling in multi-month evaluation pilots before commercial rollout.
              </p>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "14px" }}>
                <b style={{ color: "var(--ok)" }}>Mitigation:</b> Rapid 14-day evaluation program using simulated floorplan digital twins, automated layout optimization, and benchmark verification against legacy trilateration to demonstrate ROI before physical installation.
              </div>
              <div className="small faint" style={{ marginTop: "10px" }}>Illustrative planning estimate</div>
            </motion.div>

            <motion.div className="card" {...fadeInUp}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <AlertTriangle size={20} color="var(--signal)" />
                <h3 style={{ fontSize: "18px", margin: 0 }}>Employee Privacy &amp; Regulatory Compliance</h3>
              </div>
              <p className="muted" style={{ fontSize: "14.5px", marginBottom: "12px" }}>
                <b>Risk:</b> Union or worker concerns regarding persistent personal movement surveillance in commercial and clinical facilities.
              </p>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "14px" }}>
                <b style={{ color: "var(--ok)" }}>Mitigation:</b> Zero-cloud intranet deployment option, pseudonymous tag identifiers, role-based access logs, and mathematical &ldquo;off-zones&rdquo; (break rooms, restrooms) where position estimation is completely disabled.
              </div>
              <div className="small faint" style={{ marginTop: "10px" }}>Illustrative planning estimate</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="cta-band" data-guide="business-cta">
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
