import React from "react";
import { Link } from "react-router-dom";
import Wordmark from "./Wordmark";
import teamData from "../team.json";

export default function Footer() {
  return (
    <>
      <section className="closing" style={{ padding: "clamp(60px, 8vw, 100px) 0 30px", borderTop: "1px solid var(--line)", position: "relative" }}>
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
          <nav style={{ display: "flex", gap: "18px", flexWrap: "wrap" }} aria-label="Footer Navigation">
            <Link to="/" className="small muted">Home</Link>
            <Link to="/business" className="small muted">Business</Link>
            <Link to="/pricing" className="small muted">Plans</Link>
            <Link to="/security" className="small muted">Security</Link>
            <Link to="/console" className="small muted">Console</Link>
            <Link to="/pricing#contact" className="small muted">Contact</Link>
          </nav>
          <Link to="/" aria-label="Traceline home">
            <img src="/logo.svg" alt="" width={42} height={42} style={{ filter: "drop-shadow(0 0 12px rgba(255, 90, 71, 0.4))" }} />
          </Link>
        </div>
        <Wordmark />
      </section>

      <footer className="foot">
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-col">
              <Link to="/" className="brand" style={{ marginBottom: "16px", display: "inline-flex" }}>
                <img src="/logo.svg" alt="" width={32} height={32} />
                <span>trace<em>line</em></span>
              </Link>
              <p className="muted" style={{ maxWidth: "42ch", fontSize: "15px" }}>
                AI indoor positioning for sparse infrastructure. It estimates where a person or asset is from a few anchors and reports confidence bounds in real time.
              </p>
              <p className="small" style={{ color: "var(--signal)", marginTop: "12px" }}>
                {teamData.stage}
              </p>
            </div>

            <div className="foot-col">
              <h4>About the team</h4>
              <p className="muted" style={{ fontSize: "14.5px", marginBottom: "14px" }}>{teamData.blurb}</p>
              <ul>
                <li><b>{teamData.teamName}</b></li>
                <li className="muted">{teamData.institute}</li>
              </ul>
            </div>

            <div className="foot-col">
              <h4>Who builds what</h4>
              <ul>
                {teamData.members.map((m, idx) => (
                  <li key={idx}>
                    <b>{m.name}</b>: <span className="muted">{m.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="foot-legal">
            <div>
              &copy; {new Date().getFullYear()} {teamData.teamName}. Figures and demos on this site are simulated or illustrative until confirmed in a surveyed pilot.
            </div>
            <div style={{ display: "flex", gap: "16px" }}>
              <span className="small">Engineered with React + Framer Motion</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
