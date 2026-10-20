import React, { useState, useEffect, useRef, useCallback } from "react";
import { Compass, X, ArrowLeft, ArrowRight, Check } from "lucide-react";

const GUIDE_CONFIG = {
  "/business": [
    {
      selector: '[data-guide="business-hero"]',
      title: "Business Analysis",
      desc: "Traceline's commercial premise: reducing the number of physical anchors required per building, unlocking deployments where dense hardware costs were previously prohibitive."
    },
    {
      selector: '[data-guide="tam-sam-som"]',
      title: "Market Sizing (TAM / SAM / SOM)",
      desc: "Illustrative planning projections across global RTLS spend ($12B TAM), sparse-infrastructure opportunities ($1.5B SAM), and reachable enterprise pilots ($20M SOM)."
    },
    {
      selector: '#calculator',
      title: "Interactive Savings Calculator",
      desc: "Simulate hardware and cabling cost savings. Adjust facility area, installed anchor costs, and baseline vs sparse coverage densities to view real-time estimates."
    },
    {
      selector: '[data-guide="financial-charts"]',
      title: "Financial & Accuracy Trajectory",
      desc: "Projected revenue ramp toward SOM, empirical error curves comparing Traceline AI against dense baselines, and revenue mix across subscription tiers."
    },
    {
      selector: '[data-guide="scalability"]',
      title: "Scalability Pillars",
      desc: "Architectural advantages that power rapid expansion: software-first inference, zero-cloud local edge deployment, and cross-facility network effects."
    },
    {
      selector: '[data-guide="problem-analysis"]',
      title: "The Dense Deployment Problem",
      desc: "Why traditional indoor RTLS fails in practice: cabling labor costs often exceed hardware, and frequent manual RF re-fingerprinting creates deployment drag."
    },
    {
      selector: '[data-guide="customer-segments"]',
      title: "Customer Segments",
      desc: "Operational value propositions tailored for healthcare clinical ops, 3PL warehouse logistics, corporate smart campuses, and outpatient diagnostic clinics."
    },
    {
      selector: '[data-guide="competitor-table"]',
      title: "Competitive Landscape",
      desc: "Qualitative comparison contrasting dense UWB, conventional BLE beacons, Wi-Fi RTT, and optical cameras against Traceline's sparse AI architecture."
    },
    {
      selector: '[data-guide="unit-economics"]',
      title: "Unit Economics Simulator",
      desc: "Test recurring SaaS economics with customizable assumptions for Annual Contract Value (ACV), Customer Acquisition Cost (CAC), gross margins, and churn rates."
    },
    {
      selector: '[data-guide="gtm-roadmap"]',
      title: "3-Year Commercialization Roadmap",
      desc: "Strategic execution milestones progressing from direct proof-of-concept pilots to system integrator channels and multi-campus self-serve scale."
    },
    {
      selector: '[data-guide="risks-mitigations"]',
      title: "Risk Governance & Mitigations",
      desc: "Engineered solutions for dynamic RF path drift, hardware fragmentation, prolonged enterprise procurement cycles, and employee privacy compliance."
    }
  ],
  "/pricing": [
    {
      selector: '.hero.sub',
      title: "Plans & Estimates",
      desc: "Transparent price models and architectural assumptions designed to provide clear budgeting estimates before surveyed pilot confirmation."
    },
    {
      selector: '#plans',
      title: "Flat Size Switcher & Tiers",
      desc: "Interactive flat size estimator comparing 2 BHK and 3 BHK infrastructure requirements, hardware counts, and software subscription tiers."
    },
    {
      selector: '#contact',
      title: "Enterprise Enquiry Form",
      desc: "Direct contact channel to schedule a surveyed pilot walk, request custom CAD floorplan ingestion, or obtain an SLA quote."
    },
    {
      selector: '.faq-item',
      title: "Knowledge Base & FAQ",
      desc: "Answers to common technical questions covering anchor hardware compatibility, non-line-of-sight compensation, and local edge deployment."
    }
  ],
  "/security": [
    {
      selector: '.hero.sub',
      title: "Zero-Trust Architecture",
      desc: "Comprehensive security framework ensuring physical localization operates with enterprise-grade data isolation and zero telemetry leakage."
    },
    {
      selector: 'section:nth-of-type(2)',
      title: "Core Guarantees",
      desc: "Architectural assurances: edge-only inference with zero mandatory cloud connectivity, ephemeral memory processing, and rotating pseudonymous IDs."
    },
    {
      selector: 'section:nth-of-type(3)',
      title: "Active Threat Defenses",
      desc: "Granular safeguards protecting against replay attacks, rogue anchor spoofing, RF jamming, and unauthorized lateral network movement."
    },
    {
      selector: 'section:nth-of-type(4)',
      title: "Telemetry Lifecycle",
      desc: "End-to-end lifecycle detailing raw sensor ingestion, in-flight TLS encryption, memory-only state vectors, and automatic audit purging."
    },
    {
      selector: 'section:nth-of-type(5)',
      title: "Privacy & Off-Zone Compliance",
      desc: "Configurable mathematical exclusion boundaries where positioning calculations are disabled to respect staff privacy in break rooms and restrooms."
    }
  ],
  "/console": [
    {
      selector: '[data-guide="tab-live"]',
      tabKey: "live",
      title: "Live Map Tab",
      desc: "Real-time indoor positioning visualization: tracked wheelchair trajectory, line-of-sight rays, dynamic uncertainty bounds, and forward kinematic arcs."
    },
    {
      selector: '[data-guide="tab-place"]',
      tabKey: "place",
      title: "Placement Optimizer Tab",
      desc: "Automated geometric anchor layout planner. Analyzes wall boundaries, detects coverage deficits, and proposes minimal anchor additions."
    },
    {
      selector: '[data-guide="tab-errmap"]',
      tabKey: "errmap",
      title: "Error Heatmap Tab",
      desc: "Spatial positioning error distribution across the floorplan, demonstrating error reduction when switching from legacy trilateration to Traceline neural inference."
    },
    {
      selector: '[data-guide="tab-stress"]',
      tabKey: "stress",
      title: "Stress Test Tab",
      desc: "Monte Carlo simulation testbed evaluating tracking robustness under severe anchor packet dropout, excessive sensor noise, and wall reflections."
    },
    {
      selector: '[data-guide="tab-dev"]',
      tabKey: "dev",
      title: "Devices & Assets Tab",
      desc: "Hardware inventory telemetry monitoring battery levels, RF signal strength, tag status, and configurable privacy off-zones."
    }
  ]
};

export default function PageGuide() {
  const pathname = typeof window !== "undefined" ? (window.location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "") || "/") : "/";
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [cardPosition, setCardPosition] = useState({ top: 100, left: 24 });
  const cardRef = useRef(null);

  const steps = GUIDE_CONFIG[pathname] || [];

  // Reset step on route change or close
  useEffect(() => {
    setCurrentStep(0);
    setIsOpen(false);
  }, [pathname]);

  // Update spotlight bounding rect and card placement
  const updatePositions = useCallback(() => {
    if (!isOpen || !steps[currentStep]) return;
    const step = steps[currentStep];

    // If step targets a tab in console, click it
    if (pathname === "/console" && step.tabKey) {
      const tabBtn = document.querySelector(`[data-guide="tab-${step.tabKey}"]`);
      if (tabBtn && !tabBtn.classList.contains("active")) {
        tabBtn.click();
      }
    }

    const targetEl = document.querySelector(step.selector);
    if (!targetEl) {
      setSpotlightRect(null);
      return;
    }

    targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

    // Give a brief tick for scroll and layout
    setTimeout(() => {
      const rect = targetEl.getBoundingClientRect();
      const pad = 8;
      const spot = {
        top: Math.max(0, rect.top - pad),
        left: Math.max(0, rect.left - pad),
        width: Math.min(window.innerWidth, rect.width + pad * 2),
        height: Math.min(window.innerHeight, rect.height + pad * 2)
      };
      setSpotlightRect(spot);

      // Card placement: below target if space permits, else above or fixed bottom
      const cardWidth = Math.min(440, window.innerWidth - 32);
      const cardHeight = 220;
      let left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, spot.left));
      let top;

      if (spot.top + spot.height + cardHeight + 20 < window.innerHeight) {
        top = spot.top + spot.height + 16;
      } else if (spot.top - cardHeight - 16 > 0) {
        top = spot.top - cardHeight - 16;
      } else {
        top = Math.max(20, window.innerHeight - cardHeight - 24);
      }

      setCardPosition({ top, left });
    }, 150);
  }, [isOpen, currentStep, steps, pathname]);

  useEffect(() => {
    if (isOpen) {
      updatePositions();
      window.addEventListener("resize", updatePositions);
      window.addEventListener("scroll", updatePositions, { passive: true });
      return () => {
        window.removeEventListener("resize", updatePositions);
        window.removeEventListener("scroll", updatePositions);
      };
    }
  }, [isOpen, updatePositions]);

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowRight") {
        if (currentStep < steps.length - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          setIsOpen(false);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1);
        }
      } else if (e.key === "Tab") {
        // Focus trap inside card
        if (cardRef.current) {
          const focusable = cardRef.current.querySelectorAll("button, [tabindex]:not([tabindex='-1'])");
          if (focusable.length > 0) {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              last.focus();
              e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, steps.length]);

  if (!steps.length || pathname === "/") return null;

  const current = steps[currentStep];

  return (
    <>
      {/* Floating launcher button */}
      <button
        type="button"
        className="page-guide-fab"
        onClick={() => {
          setIsOpen(true);
          setCurrentStep(0);
        }}
        aria-label="Open interactive page guide walkthrough"
        title="Explore page guide"
      >
        <Compass size={16} />
        <span>Page guide</span>
      </button>

      {/* Walkthrough modal */}
      {isOpen && current && (
        <>
          {/* Backdrop (tap outside closes) */}
          <div
            className="page-guide-backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Spotlight cutout */}
          {spotlightRect && (
            <div
              className="page-guide-spotlight"
              style={{
                top: `${spotlightRect.top}px`,
                left: `${spotlightRect.left}px`,
                width: `${spotlightRect.width}px`,
                height: `${spotlightRect.height}px`
              }}
              aria-hidden="true"
            />
          )}

          {/* Explanation Card */}
          <div
            ref={cardRef}
            className="page-guide-card"
            style={{
              top: `${cardPosition.top}px`,
              left: `${cardPosition.left}px`
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-guide-title"
          >
            <div className="page-guide-card-header">
              <span className="page-guide-step-badge">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                type="button"
                className="page-guide-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close page guide (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            <h3 id="page-guide-title" className="page-guide-title">
              {current.title}
            </h3>

            <p className="page-guide-desc">
              {current.desc}
            </p>

            <div className="page-guide-footer">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setIsOpen(false)}
                style={{ fontSize: "13px", padding: "6px 12px" }}
              >
                Skip
              </button>

              <div className="page-guide-actions">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  style={{
                    fontSize: "13px",
                    padding: "6px 14px",
                    opacity: currentStep === 0 ? 0.35 : 1,
                    cursor: currentStep === 0 ? "not-allowed" : "pointer"
                  }}
                  aria-label="Previous step"
                >
                  <ArrowLeft size={14} style={{ marginRight: "4px" }} /> Back
                </button>

                <button
                  type="button"
                  className="btn coral"
                  onClick={() => {
                    if (currentStep < steps.length - 1) {
                      setCurrentStep((prev) => prev + 1);
                    } else {
                      setIsOpen(false);
                    }
                  }}
                  style={{ fontSize: "13px", padding: "6px 16px" }}
                  aria-label={currentStep === steps.length - 1 ? "Finish guide" : "Next step"}
                >
                  {currentStep === steps.length - 1 ? (
                    <>Finish <Check size={14} style={{ marginLeft: "4px" }} /></>
                  ) : (
                    <>Next <ArrowRight size={14} style={{ marginLeft: "4px" }} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
