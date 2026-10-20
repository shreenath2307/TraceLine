import React from "react";
import Link from "../components/Link";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Key, Server, EyeOff, FileText, CheckCircle, ArrowRight } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

export default function SecurityPage() {
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
            <div className="kicker">Zero-Trust Indoor Architecture</div>
            <h1>Security &amp; privacy</h1>
            <p className="lede">
              This page describes the technical architecture and operational controls we build to, and the engineering rationale for each. No system is risk-free; our philosophy is to reduce risk by design and maintain radical transparency.
            </p>
            <div className="btn-row">
              <Link to="/pricing#contact" className="btn coral">
                Ask a security question <ArrowRight size={16} />
              </Link>
              <Link to="/console" className="btn ghost">
                Review privacy controls in console
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Principles */}
      <section className="block">
        <div className="wrap split top-align">
          <motion.div {...fadeInUp}>
            <span className="kicker">Core Foundation</span>
            <h2>Security by design principles.</h2>
            <ul className="checks" style={{ marginTop: "28px" }}>
              <li><strong>Minimise telemetry:</strong> We collect only anchor range/RSSI measurements and a pseudonymous tag ID. No names, personal photos, or device storage contents are ever touched.</li>
              <li><strong>Process locally:</strong> Position inference can execute entirely inside your firewall on an on-premise gateway, preventing location coordinates from leaving your building.</li>
              <li><strong>Zero cleartext:</strong> TLS 1.3 for all inter-device communications; AES-256 at rest with hardware-backed key rotation.</li>
              <li><strong>Strict principle of least privilege:</strong> Separate role boundaries for Administrators, Floor Operators, and Audit Viewers.</li>
              <li><strong>Tamper-evident audit trail:</strong> Every retention change, zone toggle, or export is permanently logged with timestamps.</li>
            </ul>
          </motion.div>

          <motion.figure {...fadeInUp}>
            <img
              src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=900&q=70"
              alt="Cryptographic hardware lock"
              loading="lazy"
            />
            <figcaption>Security is built directly into the mathematical pipeline, not patched on afterward.</figcaption>
          </motion.figure>
        </div>
      </section>

      {/* 9 Pillars of Technology */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Defenses</span>
            <h2>What is used, and why.</h2>
          </motion.div>

          <div className="grid g3">
            <motion.div className="item" {...fadeInUp}>
              <h3>Encryption in transit</h3>
              <p>TLS 1.3 between BLE/UWB gateways, edge inference nodes, and cloud dashboards with certificate pinning, preventing eavesdropping or rogue packet injection.</p>
            </motion.div>

            <motion.div className="item" {...fadeInUp}>
              <h3>Encryption at rest</h3>
              <p>AES-256 for all persistent stores, with encryption keys managed via dedicated KMS. A stolen disk yields no intelligible trajectory records.</p>
            </motion.div>

            <motion.div className="item" {...fadeInUp}>
              <h3>Pseudonymous IDs</h3>
              <p>Assets and badges emit rotating ephemerals. The registry associating an ID with a patient or high-value asset is segregated in an isolated database.</p>
            </motion.div>

            <motion.div className="item" {...fadeInUp}>
              <h3>Edge-only inference</h3>
              <p>Our weighted Gauss-Newton positioning engine is compact enough to run on an industrial Raspberry Pi or edge microserver with zero cloud dependency.</p>
            </motion.div>

            <motion.div className="item" {...fadeInUp}>
              <h3>Role-based access (RBAC)</h3>
              <p>Granular permissions with multi-factor authentication (MFA) enforcement for administrators, and session timeouts for floor staff.</p>
            </motion.div>

            <motion.div className="item" {...fadeInUp}>
              <h3>Append-only audit logs</h3>
              <p>Immutable logging records who viewed real-time coordinates, exported zone reports, or adjusted privacy geofences.</p>
            </motion.div>

            <motion.div className="item" {...fadeInUp}>
              <h3>Signed anchors &amp; radios</h3>
              <p>Each anchor proves authenticity using X.509 device certificates. Our anchor qualifier flags physically impossible readings or spoofed telemetry.</p>
            </motion.div>

            <motion.div className="item" {...fadeInUp}>
              <h3>Configurable retention</h3>
              <p>Select live-only (memory-only tracking), 7-day, or 30-day automated rolling purges to satisfy compliance and internal guidelines.</p>
            </motion.div>

            <motion.div className="item" {...fadeInUp}>
              <h3>Secure development</h3>
              <p>Continuous dependency scanning, code reviews, secret scanning, and automated fuzzing on all mathematical parser routines.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Data Flow Table */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Telemetry Lifecycle</span>
            <h2>What travels where.</h2>
          </motion.div>

          <motion.div className="table-wrap" {...fadeInUp}>
            <table>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Payload Data</th>
                  <th>Cryptographic Protection</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Anchor → Gateway</b></td>
                  <td>Raw range/RSSI, anchor ID, monotonic timestamp</td>
                  <td>Device mutual TLS or AES-CCM link encryption</td>
                </tr>
                <tr>
                  <td><b>Gateway (Edge)</b></td>
                  <td>Filtered X–Y coordinates with confidence radius</td>
                  <td>Volatile memory buffer; zero disk logging in live-only mode</td>
                </tr>
                <tr>
                  <td><b>Gateway → Central Server</b></td>
                  <td>Pseudonymous tag UUID, estimated (x, y, unc)</td>
                  <td>TLS 1.3 with JWT authentication token</td>
                </tr>
                <tr>
                  <td><b>Storage Layer</b></td>
                  <td>Historical trajectories &amp; error residual maps</td>
                  <td>AES-256 database volume encryption, automated rolling purge</td>
                </tr>
                <tr>
                  <td><b>Operator Console</b></td>
                  <td>Live floor plan map, coverage status, alerts</td>
                  <td>WebSockets over TLS, RBAC, session timeout</td>
                </tr>
              </tbody>
            </table>
          </motion.div>

          <div className="strip">
            <figure>
              <img
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=900&q=70"
                alt="Encrypted network connections"
                loading="lazy"
              />
              <figcaption>Encrypted TLS 1.3 interconnects</figcaption>
            </figure>
            <figure>
              <img
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=70"
                alt="Global encrypted communications network"
                loading="lazy"
              />
              <figcaption>Network-wide telemetry health &amp; monitoring</figcaption>
            </figure>
            <figure>
              <img
                src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=900&q=70"
                alt="Laptop with code terminal"
                loading="lazy"
              />
              <figcaption>Role-based access &amp; append-only audit trail</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Compliance & DPDP Act */}
      <section className="block">
        <div className="wrap">
          <motion.div className="sec-head" {...fadeInUp}>
            <span className="kicker">Privacy &amp; Compliance</span>
            <h2>Respecting the individuals being located.</h2>
          </motion.div>

          <ul className="checks">
            <motion.li {...fadeInUp}>Designed to align with India’s <b>Digital Personal Data Protection (DPDP) Act, 2023</b>: strict purpose specification, consent mechanisms for badge carriers, and automated principal data erasure.</motion.li>
            <motion.li {...fadeInUp}>Facilities can configure designated <b>Privacy Geofences (Tracking-Off Zones)</b>, such as restrooms, break rooms, and staff lounges, where all coordinate calculation is immediately suppressed in memory.</motion.li>
            <motion.li {...fadeInUp}>For hospitals, patient tracking is asset-first, ensuring high-value equipment like ventilators and infusion pumps are visible without continuous individual surveillance.</motion.li>
            <motion.li {...fadeInUp}>Empirical validation: Our accuracy and security benchmarks are verified on independent datasets rather than theoretical assertions.</motion.li>
          </ul>

          <div className="btn-row" style={{ marginTop: "40px" }}>
            <Link to="/pricing#contact" className="btn coral">
              Request a security &amp; architecture review
            </Link>
            <Link to="/console" className="btn ghost">
              Test privacy controls in the console
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
