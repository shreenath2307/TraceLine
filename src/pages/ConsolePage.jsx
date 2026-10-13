import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAnimation } from "../context/AnimationContext";
import {
  Activity,
  Layers,
  MapPin,
  Flame,
  AlertTriangle,
  Cpu,
  Shield,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  CheckCircle2,
  Radio
} from "lucide-react";

// Floor dimensions
const S = 20; // 20px per metre
const W = 40; // 40 metres wide
const H = 24; // 24 metres high
const CORAL = "#ff5a47";
const OK = "#7ad9a5";
const INK = "#f2efe9";

const WALLS = [
  [0, 9, 6, 9], [9, 9, 17, 9], [20, 9, 31, 9], [34, 9, 40, 9],
  [0, 15, 3, 15], [6, 15, 13, 15], [16, 15, 23, 15], [26, 15, 33, 15], [36, 15, 40, 15],
  [13, 0, 13, 9], [27, 0, 27, 9],
  [10, 15, 10, 24], [20, 15, 20, 24], [30, 15, 30, 24]
];

const ROOMS = [
  ["Ward A", 0, 0, 13, 9],
  ["Ward B", 13, 0, 27, 9],
  ["Ward C", 27, 0, 40, 9],
  ["Staff room", 0, 15, 10, 24],
  ["Lab", 10, 15, 20, 24],
  ["Pharmacy", 20, 15, 30, 24],
  ["Imaging", 30, 15, 40, 24]
];

const ANCHORS = [
  { id: "A1", x: 3, y: 2 },
  { id: "A2", x: 20, y: 2 },
  { id: "A3", x: 37, y: 2 },
  { id: "A4", x: 1.5, y: 12 },
  { id: "A5", x: 20, y: 10.5 },
  { id: "A6", x: 38.5, y: 12 },
  { id: "A7", x: 5, y: 21.5 },
  { id: "A8", x: 25, y: 21.5 }
];

const ON_ORDER = ["A5", "A4", "A6", "A1", "A3", "A8", "A7", "A2"];
const CROWD_ZONES = [[12, 9, 18, 15], [28, 9, 36, 15]];
const OFF_ZONE = [0, 15, 10, 24]; // Staff room

const ASSETS_STATIC = [
  { id: "P-02", type: "Infusion pump", x: 24.5, y: 19, pri: true },
  { id: "M-07", type: "Monitor", x: 14, y: 3.5, pri: true },
  { id: "P-09", type: "Infusion pump", x: 35, y: 19, pri: false }
];

const WAYPOINTS = [
  [2, 12], [4.5, 12], [4.5, 20], [4.5, 12], [7.5, 12], [7.5, 5], [7.5, 12],
  [14.5, 12], [14.5, 19], [14.5, 12], [18.5, 12], [18.5, 4], [18.5, 12],
  [24.5, 12], [24.5, 20], [24.5, 12], [32.5, 12], [32.5, 4], [32.5, 12],
  [37.5, 12], [34.5, 12], [34.5, 20], [34.5, 12], [2, 12]
];

// Helper geometry
function segX(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function countWallCrossings(ax, ay, bx, by) {
  let n = 0;
  for (let i = 0; i < WALLS.length; i++) {
    const w = WALLS[i];
    if (segX(ax, ay, bx, by, w[0], w[1], w[2], w[3])) n++;
  }
  return n;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function randn() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function inRect(x, y, r) {
  return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
}

function getZoneName(x, y) {
  if (y >= 9 && y <= 15) return "Main corridor";
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    if (x >= r[1] && x < r[3] && y >= r[2] && y < r[4]) return r[0];
  }
  return "Main corridor";
}

function measure(px, py, a, sd, biasScale) {
  const k = countWallCrossings(px, py, a.x, a.y);
  const d = dist(px, py, a.x, a.y);
  const bias = k ? biasScale * (0.9 * k + 0.4 * Math.random()) : 0;
  return d + bias + sd * randn();
}

function solveGaussNewton(ms, w, start) {
  let px = start[0], py = start[1];
  for (let it = 0; it < 8; it++) {
    let a11 = 1e-3, a12 = 0, a22 = 1e-3, b1 = 0, b2 = 0;
    for (let i = 0; i < ms.length; i++) {
      if (!ms[i] || w[i] <= 0.001) continue;
      const an = ms[i].a;
      const dx = px - an.x;
      const dy = py - an.y;
      const d = Math.max(0.05, Math.hypot(dx, dy));
      const jx = dx / d;
      const jy = dy / d;
      const r = ms[i].m - d;
      const wi = w[i];
      a11 += wi * jx * jx;
      a12 += wi * jx * jy;
      a22 += wi * jy * jy;
      b1 += wi * jx * r;
      b2 += wi * jy * r;
    }
    const det = a11 * a22 - a12 * a12;
    if (Math.abs(det) < 1e-6) break;
    const sx = (a22 * b1 - a12 * b2) / det;
    const sy = (a11 * b2 - a12 * b1) / det;
    px = clamp(px + sx, 0, W);
    py = clamp(py + sy, 0, H);
    if (Math.abs(sx) + Math.abs(sy) < 1e-3) break;
  }
  return [px, py];
}

function centroid(ms) {
  let sx = 0, sy = 0, sw = 0;
  ms.forEach((m) => {
    if (!m) return;
    const w = 1 / (m.m * m.m + 1);
    sx += m.a.x * w;
    sy += m.a.y * w;
    sw += w;
  });
  return sw ? [sx / sw, sy / sw] : [W / 2, H / 2];
}

function estimateStatic(px, py, on, sd, biasScale, mode) {
  const ms = on.map((a) => ({ a, m: measure(px, py, a, sd, biasScale) }));
  if (ms.length < 2) return null;
  const w = ms.map(() => 1);
  let p = solveGaussNewton(ms, w, centroid(ms));
  if (mode === "trace") {
    const sig = Math.max(0.5, 2 * sd);
    for (let round = 0; round < 3; round++) {
      const adj = ms.map((m) => {
        const k = countWallCrossings(p[0], p[1], m.a.x, m.a.y);
        return { a: m.a, m: m.m - 0.8 * k * biasScale, k };
      });
      const ww = adj.map((m) => {
        const r = m.m - dist(p[0], p[1], m.a.x, m.a.y);
        return (1 / (1 + (r / sig) * (r / sig))) * (m.k ? 0.4 : 1);
      });
      p = solveGaussNewton(adj, ww, p);
    }
  }
  return p;
}

export default function ConsolePage() {
  const { isPaused } = useAnimation();
  const [activeTab, setActiveTab] = useState("live");

  // Live Map State & Controls
  const [layers, setLayers] = useState({
    rays: true,
    uncertainty: true,
    crowd: false,
    prediction: true
  });
  const [signalNoise, setSignalNoise] = useState(0.25);
  const [activeAnchorCount, setActiveAnchorCount] = useState(8);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [offZoneActive, setOffZoneActive] = useState(true);
  const [retention, setRetention] = useState("7 days");

  // Readout state
  const [telemetry, setTelemetry] = useState({
    target: "W-014",
    zone: "Main corridor",
    x: 2.0,
    y: 12.0,
    unc: 1.2,
    conf: 0.88,
    used: ["A5", "A4", "A6", "A1", "A3", "A8", "A7", "A2"],
    down: [],
    lost: [],
    reason: "clear line to the anchors in use",
    realError: 0.8
  });

  // Devices health
  const [anchorTrust, setAnchorTrust] = useState(() => {
    const initial = {};
    ANCHORS.forEach((a) => { initial[a.id] = 0.8; });
    return initial;
  });

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState([
    "08:02:11  admin signed in with MFA",
    "08:02:40  viewer opened live map",
    "08:15:03  operator exported zone report"
  ]);

  const addAuditLog = useCallback((text) => {
    const now = new Date();
    const stamp = [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0")
    ].join(":");
    setAuditLogs((prev) => [`${stamp}  ${text}`, ...prev.slice(0, 40)]);
  }, []);

  // Canvas Refs
  const liveCanvasRef = useRef(null);
  const placeCanvasRef = useRef(null);
  const errCanvasRef = useRef(null);

  // Simulation persistent data
  const simRef = useRef({
    dTrav: 0,
    st: {
      x: 2, y: 12, vx: 0, vy: 0, gap: 0, unc: 1.5, conf: 0.8, err: 1,
      used: [], down: [], lost: [], blocked: 0, trails: [], rays: []
    },
    trust: { ...anchorTrust },
    lastReadout: 0
  });

  // Placement optimizer state
  const [placeCount, setPlaceCount] = useState(5);
  const [placeResult, setPlaceResult] = useState(null);

  // Error map state
  const [errMapMode, setErrMapMode] = useState("after");
  const [errMapData, setErrMapData] = useState(null);

  // Stress test state
  const [stressOutput, setStressOutput] = useState(null);
  const [isStressRunning, setIsStressRunning] = useState(false);

  // Trajectory calculation
  const getTruePos = useCallback((d) => {
    let segLen = [], total = 0;
    for (let i = 1; i < WAYPOINTS.length; i++) {
      const l = dist(WAYPOINTS[i - 1][0], WAYPOINTS[i - 1][1], WAYPOINTS[i][0], WAYPOINTS[i][1]);
      segLen.push(l);
      total += l;
    }
    d = d % total;
    for (let i = 0; i < segLen.length; i++) {
      if (d <= segLen[i]) {
        const t = d / segLen[i];
        return [
          WAYPOINTS[i][0] + (WAYPOINTS[i + 1][0] - WAYPOINTS[i][0]) * t,
          WAYPOINTS[i][1] + (WAYPOINTS[i + 1][1] - WAYPOINTS[i][1]) * t
        ];
      }
      d -= segLen[i];
    }
    return WAYPOINTS[0].slice();
  }, []);

  // Floor drawing function
  const drawFloor = useCallback((ctx) => {
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, W * S, H * S);

    // Room labels
    ctx.font = "12px Hanken Grotesk, sans-serif";
    ctx.fillStyle = "rgba(244,241,235,0.3)";
    ctx.textAlign = "left";
    ROOMS.forEach((r) => {
      ctx.fillText(r[0], r[1] * S + 8, r[2] * S + 18);
    });
    ctx.fillText("Main corridor", 8 * S, 13.7 * S);

    // Walls
    ctx.strokeStyle = "#383a45";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeRect(1, 1, W * S - 2, H * S - 2);

    WALLS.forEach((w) => {
      ctx.beginPath();
      ctx.moveTo(w[0] * S, w[1] * S);
      ctx.lineTo(w[2] * S, w[3] * S);
      ctx.stroke();
    });
  }, []);

  // Anchor drawing
  const drawAnchor = useCallback((ctx, a, on, label) => {
    ctx.fillStyle = on ? INK : "#2c2d38";
    ctx.fillRect(a.x * S - 6, a.y * S - 6, 12, 12);
    ctx.fillStyle = on ? "rgba(244,241,235,0.85)" : "#5a5c68";
    ctx.font = "11px Hanken Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label || a.id, a.x * S, a.y * S - 10);
  }, []);

  // Step simulation loop for Live Map
  useEffect(() => {
    if (activeTab !== "live") return;
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animId;
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      const sim = simRef.current;
      const onList = ON_ORDER.slice(0, activeAnchorCount).map((id) =>
        ANCHORS.find((a) => a.id === id)
      );

      if (!isPaused) {
        sim.dTrav += 1.6 * dt;
        const tp = getTruePos(sim.dTrav);
        const crowded =
          inRect(tp[0], tp[1], CROWD_ZONES[0]) ||
          inRect(tp[0], tp[1], CROWD_ZONES[1]);
        const sdEff = signalNoise * (crowded ? 2.2 : 1);

        const px = sim.st.x + sim.st.vx * dt;
        const py = sim.st.y + sim.st.vy * dt;

        const ms = [];
        ANCHORS.forEach((a) => {
          if (!onList.includes(a)) {
            ms.push(null);
            return;
          }
          if (Math.random() < 0.035) {
            ms.push({ a, m: 0, lost: true });
            return;
          }
          ms.push({ a, m: measure(tp[0], tp[1], a, sdEff, 1) });
        });

        const good = ms.filter((m) => m && !m.lost);
        const rays = [], used = [], down = [], lost = [];

        if (good.length >= 3) {
          const adj = [], w = [];
          good.forEach((m) => {
            const k = countWallCrossings(px, py, m.a.x, m.a.y);
            const predR = dist(px, py, m.a.x, m.a.y);
            const mm = m.m - 0.8 * k;
            const r = mm - predR;
            const tr = Math.exp(-Math.pow(r / 2.4, 2)) * (k ? 0.45 : 1);
            adj.push({ a: m.a, m: mm });
            w.push(tr);
            sim.trust[m.a.id] = (sim.trust[m.a.id] || 0.8) + (tr - (sim.trust[m.a.id] || 0.8)) * 0.05;
            rays.push({ a: m.a, trusted: tr > 0.55, k });
            (tr > 0.55 ? used : down).push(m.a.id);
          });

          const z = solveGaussNewton(adj, w, [px, py]);
          const K = 0.52;
          const nx = px + K * (z[0] - px);
          const ny = py + K * (z[1] - py);

          sim.st.vx += ((nx - sim.st.x) / Math.max(dt, 0.016) - sim.st.vx) * 0.12;
          sim.st.vy += ((ny - sim.st.y) / Math.max(dt, 0.016) - sim.st.vy) * 0.12;
          sim.st.x = nx;
          sim.st.y = ny;
          sim.st.gap = 0;
        } else {
          sim.st.x = clamp(px, 0, W);
          sim.st.y = clamp(py, 0, H);
          sim.st.gap += dt;
        }

        ms.forEach((m) => {
          if (m && m.lost) lost.push(m.a.id);
        });

        sim.st.used = used;
        sim.st.down = down;
        sim.st.lost = lost;
        sim.st.rays = rays;
        sim.st.on = onList.length;
        sim.st.blocked = rays.filter((r) => r.k > 0).length;
        sim.st.unc = clamp(0.6 + 2.2 * sdEff + 0.35 * down.length + 0.8 * sim.st.gap, 0.5, 6);
        sim.st.conf = clamp(0.98 - sim.st.unc * 0.12, 0.2, 0.98);
        sim.st.err += (dist(sim.st.x, sim.st.y, tp[0], tp[1]) - sim.st.err) * 0.04;
        sim.st.tx = tp[0];
        sim.st.ty = tp[1];

        sim.st.trails.push([sim.st.x, sim.st.y]);
        if (sim.st.trails.length > 70) sim.st.trails.shift();

        // Update React telemetry periodically
        if (now - sim.lastReadout > 240) {
          sim.lastReadout = now;
          let reason = "clear line to the anchors in use";
          if (sim.st.gap > 0.3) reason = "signal gap, track predicted forward";
          else if (sim.st.blocked > 0)
            reason = `${sim.st.blocked} of ${sim.st.on} anchors blocked, track held by motion history`;

          setTelemetry({
            target: "W-014",
            zone: getZoneName(sim.st.x, sim.st.y),
            x: sim.st.x,
            y: sim.st.y,
            unc: sim.st.unc,
            conf: sim.st.conf,
            used: sim.st.used,
            down: sim.st.down,
            lost: sim.st.lost,
            reason,
            realError: sim.st.err
          });
          setAnchorTrust({ ...sim.trust });
        }
      }

      // Drawing Live View
      drawFloor(ctx);

      // Emergency coverage deficit cells
      if (emergencyMode) {
        for (let gy = 1; gy < H; gy += 2) {
          for (let gx = 1; gx < W; gx += 2) {
            let reach = 0;
            onList.forEach((a) => {
              if (countWallCrossings(gx, gy, a.x, a.y) <= 1 && dist(gx, gy, a.x, a.y) <= 20) reach++;
            });
            if (reach < 3) {
              ctx.fillStyle = "rgba(255,90,71,0.18)";
              ctx.fillRect((gx - 1) * S, (gy - 1) * S, 2 * S, 2 * S);
            }
          }
        }
        ctx.fillStyle = CORAL;
        ctx.font = "12px Hanken Grotesk, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Emergency active: red cells have <3 reachable anchors", 10, H * S - 12);
      }

      // Crowd zones
      if (layers.crowd) {
        CROWD_ZONES.forEach((r) => {
          ctx.fillStyle = "rgba(255,180,70,0.14)";
          ctx.fillRect(r[0] * S, r[1] * S, (r[2] - r[0]) * S, (r[3] - r[1]) * S);
          ctx.fillStyle = "rgba(255,180,70,0.85)";
          ctx.font = "12px Hanken Grotesk, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("Crowded: 2.2x noise", r[0] * S + 8, r[1] * S + 18);
        });
      }

      // Off-zone (Staff room)
      if (offZoneActive) {
        ctx.fillStyle = "rgba(120,120,130,0.35)";
        ctx.fillRect(OFF_ZONE[0] * S + 2, OFF_ZONE[1] * S + 2, (OFF_ZONE[2] - OFF_ZONE[0]) * S - 4, (OFF_ZONE[3] - OFF_ZONE[1]) * S - 4);
        ctx.fillStyle = "#bbb";
        ctx.font = "12px Hanken Grotesk, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Tracking Off (Privacy)", OFF_ZONE[0] * S + 8, OFF_ZONE[3] * S - 10);
      }

      // Static assets
      ASSETS_STATIC.forEach((a) => {
        const pr = emergencyMode && a.pri;
        ctx.strokeStyle = pr ? CORAL : "#777885";
        ctx.lineWidth = pr ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x * S, a.y * S - 7);
        ctx.lineTo(a.x * S + 7, a.y * S);
        ctx.lineTo(a.x * S, a.y * S + 7);
        ctx.lineTo(a.x * S - 7, a.y * S);
        ctx.closePath();
        ctx.stroke();
        if (pr) {
          ctx.beginPath();
          ctx.arc(a.x * S, a.y * S, 14, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = pr ? CORAL : "#8e909e";
        ctx.font = "11px Hanken Grotesk, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(a.id, a.x * S, a.y * S + 22);
      });

      // Anchors
      ANCHORS.forEach((a) => {
        drawAnchor(ctx, a, onList.includes(a));
      });

      // If hidden in off-zone
      const isHidden = offZoneActive && inRect(sim.st.x, sim.st.y, OFF_ZONE);
      if (!isHidden) {
        // Rays
        if (layers.rays) {
          sim.st.rays.forEach((r) => {
            ctx.strokeStyle = r.trusted ? "rgba(122,217,165,0.75)" : "rgba(255,90,71,0.85)";
            ctx.lineWidth = 1.4;
            ctx.setLineDash(r.trusted ? [] : [5, 5]);
            ctx.beginPath();
            ctx.moveTo(r.a.x * S, r.a.y * S);
            ctx.lineTo(sim.st.x * S, sim.st.y * S);
            ctx.stroke();
          });
          ctx.setLineDash([]);
        }

        // Trail
        ctx.strokeStyle = "rgba(244,241,235,0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        sim.st.trails.forEach((p, i) => {
          if (i) ctx.lineTo(p[0] * S, p[1] * S);
          else ctx.moveTo(p[0] * S, p[1] * S);
        });
        ctx.stroke();

        // Uncertainty
        if (layers.uncertainty) {
          ctx.fillStyle = "rgba(255,90,71,0.14)";
          ctx.strokeStyle = "rgba(255,90,71,0.75)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sim.st.x * S, sim.st.y * S, sim.st.unc * S, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // 2-second Prediction
        if (layers.prediction) {
          const fx = clamp(sim.st.x + sim.st.vx * 2, 0, W);
          const fy = clamp(sim.st.y + sim.st.vy * 2, 0, H);
          ctx.setLineDash([4, 5]);
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sim.st.x * S, sim.st.y * S);
          ctx.lineTo(fx * S, fy * S);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(fx * S, fy * S, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = INK;
          ctx.font = "11px Hanken Grotesk, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("+2s vector", fx * S + 10, fy * S + 4);
        }

        // Ground truth vs Estimate
        ctx.strokeStyle = "rgba(244,241,235,0.55)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(sim.st.tx * S, sim.st.ty * S, 4.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = CORAL;
        ctx.beginPath();
        ctx.arc(sim.st.x * S, sim.st.y * S, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = INK;
        ctx.font = "600 12px Hanken Grotesk, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("W-014", sim.st.x * S + 12, sim.st.y * S - 10);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    activeTab,
    isPaused,
    layers,
    signalNoise,
    activeAnchorCount,
    emergencyMode,
    offZoneActive,
    getTruePos,
    drawFloor,
    drawAnchor
  ]);

  // Tab 2: Placement Optimizer runner
  const runPlacementOptimizer = useCallback(() => {
    const samples = [];
    const cands = [];
    for (let sy = 1; sy < H; sy += 2) {
      for (let sx = 1; sx < W; sx += 2) {
        samples.push([sx, sy]);
        cands.push([sx, sy]);
      }
    }

    const losM = cands.map((c) =>
      samples.map(
        (s) =>
          countWallCrossings(c[0], c[1], s[0], s[1]) <= 1 &&
          dist(c[0], c[1], s[0], s[1]) <= 20
      )
    );

    const baseline = [
      [1, 1], [39, 1], [1, 23], [39, 23],
      [20, 12], [20, 1], [20, 23], [1, 12], [39, 12]
    ];

    const N = placeCount;
    const counts = samples.map(() => 0);
    const chosen = [];

    for (let k = 0; k < N; k++) {
      let best = -1, bi = 0;
      for (let c = 0; c < cands.length; c++) {
        if (chosen.includes(c)) continue;
        let g = 0;
        for (let s = 0; s < samples.length; s++) {
          if (losM[c][s]) g += counts[s] < 3 ? 1 : 0.0005;
        }
        let md = 20;
        chosen.forEach((q) => {
          md = Math.min(md, dist(cands[c][0], cands[c][1], cands[q][0], cands[q][1]));
        });
        g += 0.02 * md;
        if (g > best) {
          best = g;
          bi = c;
        }
      }
      chosen.push(bi);
      for (let s2 = 0; s2 < samples.length; s2++) {
        if (losM[bi][s2]) counts[s2]++;
      }
    }

    const sug = chosen.map((i) => cands[i]);
    const base = baseline.slice(0, N);

    const calcCoverage = (pts) => {
      let n = 0;
      samples.forEach((s) => {
        let c = 0;
        pts.forEach((p) => {
          if (countWallCrossings(p[0], p[1], s[0], s[1]) <= 1 && dist(p[0], p[1], s[0], s[1]) <= 20) c++;
        });
        if (c >= 3) n++;
      });
      return n / samples.length;
    };

    const covS = calcCoverage(sug);
    const covB = calcCoverage(base);
    const eB = 1.1 + 5.5 * Math.pow(1 - covB, 1.2);
    const eS = 1.1 + 5.5 * Math.pow(1 - covS, 1.2);

    const result = { sug, base, covS, covB, eB, eS, counts, samples };
    setPlaceResult(result);

    // Draw to canvas
    const canvas = placeCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      drawFloor(ctx);
      samples.forEach((s, i) => {
        ctx.fillStyle = counts[i] >= 3 ? "rgba(122,217,165,0.14)" : "rgba(255,90,71,0.16)";
        ctx.fillRect((s[0] - 1) * S, (s[1] - 1) * S, 2 * S, 2 * S);
      });
      base.forEach((p) => {
        ctx.strokeStyle = "#7a7c88";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p[0] * S - 7, p[1] * S - 7, 14, 14);
      });
      sug.forEach((p, i) => {
        drawAnchor(ctx, { x: p[0], y: p[1] }, true, `S${i + 1}`);
        ctx.fillStyle = CORAL;
        ctx.fillRect(p[0] * S - 6, p[1] * S - 6, 12, 12);
      });
      ctx.fillStyle = "rgba(244,241,235,0.75)";
      ctx.font = "12px Hanken Grotesk, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Solid coral: suggested   Outlined grey: baseline edges   Green tint: >=3 anchors reach", 10, H * S - 12);
    }
  }, [placeCount, drawFloor, drawAnchor]);

  // Tab 3: Error Map runner
  const buildErrorMap = useCallback(() => {
    const on = ANCHORS;
    const cells = [];
    let trB = 0, trA = 0, vaB = 0, vaA = 0, n = 0;

    for (let gy = 0; gy < H; gy += 2) {
      for (let gx = 0; gx < W; gx += 2) {
        let sx = 0, sy = 0, sb = 0, c = 0;
        for (let i = 0; i < 16; i++) {
          const px = gx + 0.2 + Math.random() * 1.6;
          const py = gy + 0.2 + Math.random() * 1.6;
          const e = estimateStatic(px, py, on, 0.25, 1, "trace");
          if (!e) continue;
          sx += e[0] - px;
          sy += e[1] - py;
          sb += dist(e[0], e[1], px, py);
          c++;
        }
        const mx = sx / c, my = sy / c, tb = sb / c;
        let vb = 0, va = 0;
        for (let j = 0; j < 16; j++) {
          const qx = gx + 0.2 + Math.random() * 1.6;
          const qy = gy + 0.2 + Math.random() * 1.6;
          const e2 = estimateStatic(qx, qy, on, 0.25, 1, "trace");
          if (!e2) continue;
          vb += dist(e2[0], e2[1], qx, qy);
          va += dist(e2[0] - mx, e2[1] - my, qx, qy);
        }
        let ta2 = 0;
        for (let m = 0; m < 16; m++) {
          const rx = gx + 0.2 + Math.random() * 1.6;
          const ry = gy + 0.2 + Math.random() * 1.6;
          const e3 = estimateStatic(rx, ry, on, 0.25, 1, "trace");
          if (!e3) continue;
          ta2 += dist(e3[0] - mx, e3[1] - my, rx, ry);
        }
        cells.push({ x: gx, y: gy, before: vb / 16, after: va / 16 });
        trB += tb;
        trA += ta2 / 16;
        vaB += vb / 16;
        vaA += va / 16;
        n++;
      }
    }

    const data = { cells, trB: trB / n, trA: trA / n, vB: vaB / n, vA: vaA / n };
    setErrMapData(data);

    // Draw
    const canvas = errCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      drawFloor(ctx);
      cells.forEach((cell) => {
        const v = errMapMode === "before" ? cell.before : cell.after;
        const t = clamp(v / 3, 0, 1);
        ctx.fillStyle = `rgba(255,90,71,${(0.08 + t * 0.75).toFixed(2)})`;
        ctx.fillRect(cell.x * S + 1, cell.y * S + 1, 2 * S - 2, 2 * S - 2);
        ctx.fillStyle = "rgba(244,241,235,0.78)";
        ctx.font = "11px Hanken Grotesk, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(v.toFixed(1), cell.x * S + S, cell.y * S + S + 4);
      });
      ANCHORS.forEach((a) => drawAnchor(ctx, a, true));
    }
  }, [errMapMode, drawFloor, drawAnchor]);

  // Tab 4: Stress Test runner
  const runStressTest = () => {
    setIsStressRunning(true);
    addAuditLog("operator started Monte Carlo stress test (2,000 cases)");

    setTimeout(() => {
      const N = 2000;
      const byMiss = [0, 1, 2, 3, 4, 5].map(() => ({ n: 0, nv: 0, tr: 0 }));
      const byNoise = [
        { l: "Under 0.2 m", n: 0, nv: 0, tr: 0 },
        { l: "0.2 to 0.4 m", n: 0, nv: 0, tr: 0 },
        { l: "Over 0.4 m", n: 0, nv: 0, tr: 0 }
      ];
      const tot = { nv: 0, tr: 0 };

      for (let i = 0; i < N; i++) {
        const sd = 0.05 + Math.random() * 0.55;
        const miss = Math.floor(Math.random() * 6);
        const bs = 0.3 + Math.random() * 1.3;
        const set = ANCHORS.slice()
          .sort(() => Math.random() - 0.5)
          .slice(0, ANCHORS.length - miss);
        const px = 1 + Math.random() * 38;
        const py = 1 + Math.random() * 22;

        const a = estimateStatic(px, py, set, sd, bs, "naive");
        const b = estimateStatic(px, py, set, sd, bs, "trace");

        const okN = a && dist(a[0], a[1], px, py) < 2.5;
        const okT = b && dist(b[0], b[1], px, py) < 2.5;

        const g = byMiss[miss];
        g.n++;
        if (okN) g.nv++;
        if (okT) g.tr++;

        const nb = byNoise[sd < 0.2 ? 0 : sd < 0.4 ? 1 : 2];
        nb.n++;
        if (okN) nb.nv++;
        if (okT) nb.tr++;

        if (okN) tot.nv++;
        if (okT) tot.tr++;
      }

      setStressOutput({ N, tot, byMiss, byNoise });
      setIsStressRunning(false);
      addAuditLog(`stress test completed: Traceline pass rate ${Math.round((100 * tot.tr) / N)}%`);
    }, 100);
  };

  // Re-run placement / err map on tab activation
  useEffect(() => {
    if (activeTab === "place") runPlacementOptimizer();
    if (activeTab === "errmap") buildErrorMap();
  }, [activeTab, runPlacementOptimizer, buildErrorMap]);

  return (
    <div>
      <section className="hero sub">
        <div className="wrap">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="kicker">Interactive Live Environment</div>
            <h1>The Traceline console</h1>
            <p className="lede">
              The operational workspace for building engineers: real-time live tracking, automated placement planning, self-learning error maps, stress testing and granular privacy controls in one unified interface.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          {/* Laptop frame */}
          <div className="laptop-frame">
            <div className="laptop-topbar">
              <div className="traffic-lights">
                <span className="traffic-light red" />
                <span className="traffic-light yellow" />
                <span className="traffic-light green" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--faint)", fontFamily: "var(--mono)" }}>
                <span>traceline-v2.6-edge</span>
                <span>•</span>
                <span style={{ color: emergencyMode ? "var(--signal)" : "var(--ok)" }}>
                  {emergencyMode ? "EMERGENCY PROTOCOL" : "ONLINE (60 FPS)"}
                </span>
              </div>
              <div style={{ width: "40px" }} />
            </div>

            <div className="console-app">
              {/* Sidebar */}
              <div className="console-sidebar">
                <div className="console-logo">
                  <img src="/logo.svg" alt="" />
                  <span>trace<em style={{ color: "var(--signal)" }}>line</em></span>
                </div>

                <button
                  className={`console-nav-btn ${activeTab === "live" ? "active" : ""}`}
                  onClick={() => { setActiveTab("live"); addAuditLog("viewer opened live map"); }}
                >
                  <Activity size={18} />
                  <span>Live Map</span>
                </button>

                <button
                  className={`console-nav-btn ${activeTab === "place" ? "active" : ""}`}
                  onClick={() => { setActiveTab("place"); addAuditLog("operator navigated to placement optimizer"); }}
                >
                  <MapPin size={18} />
                  <span>Placement</span>
                </button>

                <button
                  className={`console-nav-btn ${activeTab === "errmap" ? "active" : ""}`}
                  onClick={() => { setActiveTab("errmap"); addAuditLog("operator opened error heatmap"); }}
                >
                  <Flame size={18} />
                  <span>Error Map</span>
                </button>

                <button
                  className={`console-nav-btn ${activeTab === "stress" ? "active" : ""}`}
                  onClick={() => { setActiveTab("stress"); addAuditLog("operator opened stress test tab"); }}
                >
                  <AlertTriangle size={18} />
                  <span>Stress Test</span>
                </button>

                <button
                  className={`console-nav-btn ${activeTab === "dev" ? "active" : ""}`}
                  onClick={() => { setActiveTab("dev"); addAuditLog("viewer checked hardware devices & assets"); }}
                >
                  <Cpu size={18} />
                  <span>Devices</span>
                </button>

                <button
                  className={`console-nav-btn ${activeTab === "priv" ? "active" : ""}`}
                  onClick={() => { setActiveTab("priv"); addAuditLog("admin inspected privacy audit log"); }}
                >
                  <Shield size={18} />
                  <span>Privacy &amp; Access</span>
                </button>
              </div>

              {/* Main Panel Content */}
              <div className="console-main">
                {/* 1. LIVE MAP */}
                {activeTab === "live" && (
                  <div>
                    <h3>Live indoor map</h3>
                    <p className="console-hint">
                      Wheelchair <b>W-014</b> maneuvers along corridors and enters rooms. Solid green rays indicate trusted line-of-sight anchors; dashed coral rays are down-weighted due to wall obstruction.
                    </p>

                    <div className="console-grid-2">
                      <div className="canvas-container">
                        <canvas ref={liveCanvasRef} width={800} height={480} />
                      </div>

                      <div className="console-controls">
                        {/* Telemetry Card */}
                        <div className="telemetry-card">
                          <div><b>Target: {telemetry.target}</b></div>
                          <div>Zone: {offZoneActive && inRect(telemetry.x, telemetry.y, OFF_ZONE) ? "Staff room (MASKED)" : telemetry.zone}</div>
                          <div>X: {telemetry.x.toFixed(1)} m | Y: {telemetry.y.toFixed(1)} m</div>
                          <div>Uncertainty: {telemetry.unc.toFixed(1)} m (Conf: {telemetry.conf.toFixed(2)})</div>
                          <div style={{ color: "var(--ok)", marginTop: "4px" }}>
                            Used: {telemetry.used.join(" ") || "none"}
                          </div>
                          <div style={{ color: "var(--signal)" }}>
                            Down-weighted: {telemetry.down.join(" ") || "none"}
                          </div>
                          {telemetry.lost.length > 0 && (
                            <div style={{ color: "var(--amber)" }}>Dropped: {telemetry.lost.join(" ")}</div>
                          )}
                          <div style={{ fontSize: "11px", color: "var(--faint)", marginTop: "6px" }}>
                            Reason: {telemetry.reason}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--blue)" }}>
                            Real error: {telemetry.realError.toFixed(2)} m
                          </div>
                        </div>

                        {/* Layer Filters */}
                        <fieldset className="ctl-fieldset">
                          <legend>Layers</legend>
                          <label>
                            <input
                              type="checkbox"
                              checked={layers.rays}
                              onChange={(e) => setLayers({ ...layers, rays: e.target.checked })}
                            />
                            Anchor trust rays
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={layers.uncertainty}
                              onChange={(e) => setLayers({ ...layers, uncertainty: e.target.checked })}
                            />
                            Uncertainty circle
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={layers.crowd}
                              onChange={(e) => setLayers({ ...layers, crowd: e.target.checked })}
                            />
                            Crowd zones (2.2x noise)
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={layers.prediction}
                              onChange={(e) => setLayers({ ...layers, prediction: e.target.checked })}
                            />
                            2-second trajectory prediction
                          </label>
                        </fieldset>

                        {/* Noise Slider */}
                        <fieldset className="ctl-fieldset">
                          <legend>Signal Noise ({signalNoise.toFixed(2)} m)</legend>
                          <input
                            type="range"
                            min="0.05"
                            max="0.60"
                            step="0.05"
                            value={signalNoise}
                            onChange={(e) => setSignalNoise(parseFloat(e.target.value))}
                          />
                        </fieldset>

                        {/* Anchors Active Slider */}
                        <fieldset className="ctl-fieldset">
                          <legend>Active Anchors ({activeAnchorCount} of 8)</legend>
                          <input
                            type="range"
                            min="3"
                            max="8"
                            step="1"
                            value={activeAnchorCount}
                            onChange={(e) => {
                              setActiveAnchorCount(parseInt(e.target.value, 10));
                              addAuditLog(`operator set active anchors to ${e.target.value}`);
                            }}
                          />
                        </fieldset>

                        {/* Emergency Toggle */}
                        <button
                          type="button"
                          className={emergencyMode ? "btn coral" : "btn ghost"}
                          onClick={() => {
                            const next = !emergencyMode;
                            setEmergencyMode(next);
                            addAuditLog(`operator ${next ? "activated" : "deactivated"} emergency mode`);
                          }}
                        >
                          <AlertTriangle size={16} />
                          {emergencyMode ? "Emergency mode: ON" : "Emergency mode: OFF"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PLACEMENT OPTIMIZER */}
                {activeTab === "place" && (
                  <div>
                    <h3>AI anchor placement optimizer</h3>
                    <p className="console-hint">
                      Choose how many anchors the budget allows. The greedy optimizer selects positions that guarantee at least three anchors have line-of-sight visibility across the facility.
                    </p>

                    <div className="console-grid-2">
                      <div className="canvas-container">
                        <canvas ref={placeCanvasRef} width={800} height={480} />
                      </div>

                      <div className="console-controls">
                        <fieldset className="ctl-fieldset">
                          <legend>Anchors to place: {placeCount}</legend>
                          <input
                            type="range"
                            min="4"
                            max="9"
                            step="1"
                            value={placeCount}
                            onChange={(e) => setPlaceCount(parseInt(e.target.value, 10))}
                          />
                        </fieldset>

                        <button type="button" className="btn coral" onClick={runPlacementOptimizer}>
                          <Sparkles size={16} />
                          Suggest layout
                        </button>

                        {placeResult && (
                          <div className="telemetry-card" style={{ borderLeftColor: "var(--ok)" }}>
                            <div style={{ fontSize: "12px", marginBottom: "8px" }}>Coverage Comparison:</div>
                            
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                <span>Corners &amp; Edges Baseline:</span>
                                <b>{Math.round(placeResult.covB * 100)}%</b>
                              </div>
                              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", marginTop: "4px" }}>
                                <div style={{ width: `${Math.round(placeResult.covB * 100)}%`, height: "100%", background: "#777", borderRadius: "99px" }} />
                              </div>
                              <div className="small faint">Estimated error: ~{placeResult.eB.toFixed(1)} m</div>
                            </div>

                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                <span style={{ color: "var(--signal)" }}>Traceline Suggested Layout:</span>
                                <b style={{ color: "var(--signal)" }}>{Math.round(placeResult.covS * 100)}%</b>
                              </div>
                              <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", marginTop: "4px" }}>
                                <div style={{ width: `${Math.round(placeResult.covS * 100)}%`, height: "100%", background: "var(--signal)", borderRadius: "99px" }} />
                              </div>
                              <div className="small" style={{ color: "var(--signal)" }}>Estimated error: ~{placeResult.eS.toFixed(1)} m</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ERROR MAP */}
                {activeTab === "errmap" && (
                  <div>
                    <h3>Self-learning error map</h3>
                    <p className="console-hint">
                      Grid cells display average empirical position error in metres. Corrections are learned on one set of walking passes and evaluated against independent held-out paths.
                    </p>

                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                      <button
                        type="button"
                        className={errMapMode === "before" ? "btn coral" : "btn ghost"}
                        onClick={() => { setErrMapMode("before"); buildErrorMap(); }}
                      >
                        Before learning
                      </button>
                      <button
                        type="button"
                        className={errMapMode === "after" ? "btn coral" : "btn ghost"}
                        onClick={() => { setErrMapMode("after"); buildErrorMap(); }}
                      >
                        After learning
                      </button>
                    </div>

                    <div className="console-grid-2">
                      <div className="canvas-container">
                        <canvas ref={errCanvasRef} width={800} height={480} />
                      </div>

                      <div className="console-controls">
                        {errMapData && (
                          <div className="telemetry-card">
                            <div><b>Training paths:</b></div>
                            <div>Before: {errMapData.trB.toFixed(2)} m → After: <span style={{ color: "var(--ok)", fontWeight: 600 }}>{errMapData.trA.toFixed(2)} m</span></div>
                            <div style={{ marginTop: "10px" }}><b>Separate held-out paths:</b></div>
                            <div>Before: {errMapData.vB.toFixed(2)} m → After: <span style={{ color: "var(--ok)", fontWeight: 600 }}>{errMapData.vA.toFixed(2)} m</span></div>
                            <p className="small faint" style={{ marginTop: "12px", margin: 0 }}>
                              Darker red cells indicate areas with severe non-line-of-sight wall refraction.
                            </p>
                          </div>
                        )}
                        <button type="button" className="btn ghost" onClick={buildErrorMap}>
                          <RotateCcw size={16} /> Re-compute Error Matrix
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. STRESS TEST */}
                {activeTab === "stress" && (
                  <div>
                    <h3>Automatic stress testing (Monte Carlo simulation)</h3>
                    <p className="console-hint">
                      Random combinations of noise, missing anchors and obstruction biases, each evaluated against a naive trilateration solver and Traceline. A trial passes if error remains under 2.5 metres.
                    </p>

                    <button
                      type="button"
                      className="btn coral"
                      onClick={runStressTest}
                      disabled={isStressRunning}
                      style={{ marginBottom: "20px" }}
                    >
                      {isStressRunning ? "Simulating 2,000 cases..." : "Run 2,000 Monte Carlo cases"}
                    </button>

                    {stressOutput && (
                      <div>
                        <div className="telemetry-card" style={{ marginBottom: "20px" }}>
                          <div><b>Evaluation Summary ({stressOutput.N} cases):</b></div>
                          <div>Naive Solver Pass Rate: <span style={{ color: "var(--amber)" }}>{Math.round((100 * stressOutput.tot.nv) / stressOutput.N)}%</span></div>
                          <div>Traceline Pass Rate: <span style={{ color: "var(--ok)", fontWeight: 600 }}>{Math.round((100 * stressOutput.tot.tr) / stressOutput.N)}%</span></div>
                          <div style={{ marginTop: "8px", color: "var(--text)" }}>
                            {Math.round((100 * stressOutput.tot.tr) / stressOutput.N) > 80
                              ? "✓ Traceline maintains >80% pass reliability across extreme multi-wall scenarios."
                              : "! Performance drops when >3 anchors are simultaneously lost."}
                          </div>
                        </div>

                        <div className="grid g2" style={{ gap: "20px" }}>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Anchors Missing</th>
                                  <th>Cases</th>
                                  <th>Naive Pass</th>
                                  <th>Traceline Pass</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stressOutput.byMiss.map((item, idx) => (
                                  <tr key={idx}>
                                    <td>{idx} missing</td>
                                    <td>{item.n}</td>
                                    <td>{Math.round((100 * item.nv) / item.n)}%</td>
                                    <td style={{ color: "var(--ok)", fontWeight: 600 }}>{Math.round((100 * item.tr) / item.n)}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Noise Profile</th>
                                  <th>Cases</th>
                                  <th>Naive Pass</th>
                                  <th>Traceline Pass</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stressOutput.byNoise.map((item, idx) => (
                                  <tr key={idx}>
                                    <td>{item.l}</td>
                                    <td>{item.n}</td>
                                    <td>{Math.round((100 * item.nv) / item.n)}%</td>
                                    <td style={{ color: "var(--ok)", fontWeight: 600 }}>{Math.round((100 * item.tr) / item.n)}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. DEVICES */}
                {activeTab === "dev" && (
                  <div>
                    <h3>Anchor and asset health</h3>
                    <p className="console-hint">
                      Live trust is the weighted confidence score dynamically assigned to each anchor by our residual filter.
                    </p>

                    <div className="table-wrap" style={{ marginBottom: "28px" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Anchor ID</th>
                            <th>Coordinates</th>
                            <th>Status</th>
                            <th>Battery</th>
                            <th>Live Trust Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ANCHORS.map((a, i) => {
                            const isOn = ON_ORDER.slice(0, activeAnchorCount).includes(a.id);
                            const batt = [91, 84, 77, 95, 88, 62, 73, 80][i];
                            const tr = anchorTrust[a.id] || 0.8;
                            return (
                              <tr key={a.id}>
                                <td><b>{a.id}</b></td>
                                <td>{a.x.toFixed(1)}m, {a.y.toFixed(1)}m</td>
                                <td>
                                  <span className={`tag ${isOn ? "ok" : ""}`}>
                                    {isOn ? "Online" : "Disabled"}
                                  </span>
                                </td>
                                <td>{batt}%</td>
                                <td style={{ fontFamily: "var(--mono)", color: tr > 0.5 ? "var(--ok)" : "var(--signal)" }}>
                                  {isOn ? tr.toFixed(2) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <h3>Tracked mobile assets</h3>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Asset Tag</th>
                            <th>Type</th>
                            <th>Current Zone</th>
                            <th>Priority Tier</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><b>W-014</b></td>
                            <td>Wheelchair (Active)</td>
                            <td>{telemetry.zone}</td>
                            <td><span className="tag ok">High (Tracked)</span></td>
                          </tr>
                          {ASSETS_STATIC.map((asset) => (
                            <tr key={asset.id}>
                              <td><b>{asset.id}</b></td>
                              <td>{asset.type}</td>
                              <td>{getZoneName(asset.x, asset.y)}</td>
                              <td>
                                <span className={`tag ${asset.pri ? "coral" : ""}`}>
                                  {asset.pri ? "Priority" : "Normal"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. PRIVACY & ACCESS */}
                {activeTab === "priv" && (
                  <div>
                    <h3>Privacy &amp; access controls</h3>
                    <p className="console-hint">
                      Adjust retention periods and privacy geofences. All administrative modifications are permanently written to the append-only audit trail below.
                    </p>

                    <div className="grid g2" style={{ gap: "20px", marginBottom: "24px" }}>
                      <div className="card">
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                          Data Retention Window
                        </label>
                        <select
                          value={retention}
                          onChange={(e) => {
                            setRetention(e.target.value);
                            addAuditLog(`admin set retention policy to ${e.target.value.toLowerCase()}`);
                          }}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--line)" }}
                        >
                          <option value="Live only">Live only (Zero disk logging, memory-only)</option>
                          <option value="7 days">7 days rolling purge</option>
                          <option value="30 days">30 days rolling purge</option>
                        </select>
                      </div>

                      <div className="card">
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                          Privacy Geofence (Staff Room)
                        </label>
                        <button
                          type="button"
                          className={offZoneActive ? "btn coral" : "btn ghost"}
                          onClick={() => {
                            const next = !offZoneActive;
                            setOffZoneActive(next);
                            addAuditLog(`admin turned staff room tracking ${next ? "OFF" : "ON"}`);
                          }}
                        >
                          {offZoneActive ? "Staff room tracking: OFF (Masked)" : "Staff room tracking: ON"}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h3>Tamper-evident audit trail</h3>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          addAuditLog("operator exported audit trail to CSV");
                          const blob = new Blob([auditLogs.join("\n")], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `traceline-audit-${Date.now()}.log`;
                          a.click();
                        }}
                      >
                        <Download size={16} /> Export Audit Log
                      </button>
                    </div>

                    <div
                      style={{
                        background: "rgba(7, 8, 12, 0.95)",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontFamily: "var(--mono)",
                        fontSize: "13px",
                        color: "var(--muted)",
                        lineHeight: 1.7,
                        maxHeight: "260px",
                        overflowY: "auto"
                      }}
                    >
                      {auditLogs.map((log, i) => (
                        <div key={i}>{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
