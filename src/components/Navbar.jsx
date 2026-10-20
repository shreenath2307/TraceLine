import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Activity } from "lucide-react";
import Link from "./Link";

const NAV_LINKS = [
  { path: "/", label: "Home" },
  { path: "/business", label: "Business" },
  { path: "/pricing", label: "Plans" },
  { path: "/security", label: "Security" },
  { path: "/console", label: "Console" },
  { path: "/pricing#contact", label: "Contact" }
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = typeof window !== "undefined" ? window.location.pathname.replace(/\/$/, "") || "/" : "/";
  const currentHash = typeof window !== "undefined" ? window.location.hash : "";

  const isActive = (path) => {
    if (path.includes("#")) {
      const [base] = path.split("#");
      const cleanBase = base.replace(/\/$/, "") || "/";
      return (currentPath === cleanBase || currentPath === cleanBase + "/index.html") && currentHash === "#contact";
    }
    const cleanPath = path.replace(/\/$/, "") || "/";
    return (currentPath === cleanPath || currentPath === cleanPath + "/index.html") && !currentHash;
  };

  return (
    <header className="nav">
      <div className="wrap">
        <Link to="/" className="brand" aria-label="Traceline Home">
          <img src="/logo.svg" alt="Traceline logo" width={36} height={36} />
          <span>trace<em>line</em></span>
        </Link>

        <nav className="nav-links" aria-label="Main Navigation">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-item ${active ? "active" : ""}`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="nav-active-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="nav-actions">
          <div className="status-indicator">
            <span className="status-dot" />
            <span>AI Sparse Core</span>
          </div>

          <button
            className="menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{
              background: "rgba(10, 11, 16, 0.96)",
              borderBottom: "1px solid var(--line)",
              backdropFilter: "blur(16px)",
              overflow: "hidden"
            }}
          >
            <div className="wrap" style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    color: isActive(link.path) ? "var(--signal)" : "var(--text)",
                    background: isActive(link.path) ? "var(--signal-subtle)" : "transparent",
                    fontSize: "17px",
                    fontWeight: 500
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
