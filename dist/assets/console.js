(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var S = 20, W = 40, H = 24;            // 20 px per metre, 40 x 24 m floor
  var CORAL = "#ff5a47", OK = "#7ad9a5", INK = "#f2efe9";

  // ---- floor plan -------------------------------------------------------
  var walls = [
    [0, 9, 6, 9], [9, 9, 17, 9], [20, 9, 31, 9], [34, 9, 40, 9],
    [0, 15, 3, 15], [6, 15, 13, 15], [16, 15, 23, 15], [26, 15, 33, 15], [36, 15, 40, 15],
    [13, 0, 13, 9], [27, 0, 27, 9],
    [10, 15, 10, 24], [20, 15, 20, 24], [30, 15, 30, 24]
  ];
  var rooms = [
    ["Ward A", 0, 0, 13, 9], ["Ward B", 13, 0, 27, 9], ["Ward C", 27, 0, 40, 9],
    ["Staff room", 0, 15, 10, 24], ["Lab", 10, 15, 20, 24], ["Pharmacy", 20, 15, 30, 24], ["Imaging", 30, 15, 40, 24]
  ];
  var anchors = [
    { id: "A1", x: 3, y: 2 }, { id: "A2", x: 20, y: 2 }, { id: "A3", x: 37, y: 2 },
    { id: "A4", x: 1.5, y: 12 }, { id: "A5", x: 20, y: 10.5 }, { id: "A6", x: 38.5, y: 12 },
    { id: "A7", x: 5, y: 21.5 }, { id: "A8", x: 25, y: 21.5 }
  ];
  var onOrder = ["A5", "A4", "A6", "A1", "A3", "A8", "A7", "A2"];
  var crowd = [[12, 9, 18, 15], [28, 9, 36, 15]];
  var offZone = [0, 15, 10, 24];
  var assetsStatic = [
    { id: "P-02", type: "Infusion pump", x: 24.5, y: 19, pri: true },
    { id: "M-07", type: "Monitor", x: 14, y: 3.5, pri: true },
    { id: "P-09", type: "Infusion pump", x: 35, y: 19, pri: false }
  ];
  var wp = [[2, 12], [4.5, 12], [4.5, 20], [4.5, 12], [7.5, 12], [7.5, 5], [7.5, 12], [14.5, 12], [14.5, 19], [14.5, 12],
    [18.5, 12], [18.5, 4], [18.5, 12], [24.5, 12], [24.5, 20], [24.5, 12], [32.5, 12], [32.5, 4], [32.5, 12],
    [37.5, 12], [34.5, 12], [34.5, 20], [34.5, 12], [2, 12]];

  // ---- geometry ---------------------------------------------------------
  function segX(ax, ay, bx, by, cx, cy, dx, dy) {
    var d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    var d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    var d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
    var d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }
  function cross(ax, ay, bx, by) {
    var n = 0;
    for (var i = 0; i < walls.length; i++) { var w = walls[i]; if (segX(ax, ay, bx, by, w[0], w[1], w[2], w[3])) n++; }
    return n;
  }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function randn() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function inRect(x, y, r) { return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]; }
  function zoneName(x, y) {
    if (y >= 9 && y <= 15) return "Main corridor";
    for (var i = 0; i < rooms.length; i++) { var r = rooms[i]; if (x >= r[1] && x < r[3] && y >= r[2] && y < r[4]) return r[0]; }
    return "Main corridor";
  }

  // ---- measurement + estimation ----------------------------------------
  // reading = true range + wall bias + noise. null = lost packet.
  function measure(px, py, a, sd, biasScale) {
    var k = cross(px, py, a.x, a.y);
    var d = dist(px, py, a.x, a.y);
    var bias = k ? biasScale * (0.9 * k + 0.4 * Math.random()) : 0;
    return d + bias + sd * randn();
  }

  // weighted Gauss-Newton on ranges
  function solve(ms, w, start) {
    var px = start[0], py = start[1];
    for (var it = 0; it < 8; it++) {
      var a11 = 1e-3, a12 = 0, a22 = 1e-3, b1 = 0, b2 = 0;
      for (var i = 0; i < ms.length; i++) {
        if (!ms[i] || w[i] <= 0.001) continue;
        var an = ms[i].a, dx = px - an.x, dy = py - an.y, d = Math.max(0.05, Math.hypot(dx, dy));
        var jx = dx / d, jy = dy / d, r = ms[i].m - d, wi = w[i];
        a11 += wi * jx * jx; a12 += wi * jx * jy; a22 += wi * jy * jy;
        b1 += wi * jx * r; b2 += wi * jy * r;
      }
      var det = a11 * a22 - a12 * a12;
      if (Math.abs(det) < 1e-6) break;
      var sx = (a22 * b1 - a12 * b2) / det, sy = (a11 * b2 - a12 * b1) / det;
      px = clamp(px + sx, 0, W); py = clamp(py + sy, 0, H);
      if (Math.abs(sx) + Math.abs(sy) < 1e-3) break;
    }
    return [px, py];
  }
  function centroid(ms) {
    var sx = 0, sy = 0, sw = 0;
    ms.forEach(function (m) { if (!m) return; var w = 1 / (m.m * m.m + 1); sx += m.a.x * w; sy += m.a.y * w; sw += w; });
    return sw ? [sx / sw, sy / sw] : [W / 2, H / 2];
  }
  // One-shot estimate, used by placement, error map and stress tests.
  // mode "naive": trust every reading. mode "trace": score readings against the plan and each other.
  function estimateStatic(px, py, on, sd, biasScale, mode) {
    var ms = on.map(function (a) { return { a: a, m: measure(px, py, a, sd, biasScale) }; });
    if (ms.length < 2) return null;
    var w = ms.map(function () { return 1; });
    var p = solve(ms, w, centroid(ms));
    if (mode === "trace") {
      var sig = Math.max(0.5, 2 * sd);
      for (var round = 0; round < 3; round++) {
        var adj = ms.map(function (m) {
          var k = cross(p[0], p[1], m.a.x, m.a.y);
          return { a: m.a, m: m.m - 0.8 * k * biasScale, k: k };
        });
        var ww = adj.map(function (m) {
          var r = m.m - dist(p[0], p[1], m.a.x, m.a.y);
          return (1 / (1 + (r / sig) * (r / sig))) * (m.k ? 0.4 : 1);
        });
        p = solve(adj, ww, p);
      }
    }
    return p;
  }
  function onAnchors(n) { return onOrder.slice(0, n).map(function (id) { return anchors.filter(function (a) { return a.id === id; })[0]; }); }

  // ---- tabs -------------------------------------------------------------
  var tabs = document.querySelectorAll(".side [data-tab]");
  var current = "live";
  var inited = {};
  function show(name) {
    current = name;
    tabs.forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === name)); });
    ["live", "place", "errmap", "stress", "dev", "priv"].forEach(function (n) {
      var id = n === "place" ? "p-place" : n === "errmap" ? "p-errmap" : n === "stress" ? "p-stress" : n === "dev" ? "p-dev" : n === "priv" ? "p-priv" : "p-live";
      $(id).classList.toggle("on", n === name);
    });
    if (!inited[name]) { inited[name] = true; if (name === "place") runPlace(); if (name === "errmap") buildErrMap(); }
    if (name === "place") drawPlace();
    if (name === "errmap") drawErr();
  }
  tabs.forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.tab); }); });

  // ---- drawing helpers --------------------------------------------------
  function drawFloor(ctx) {
    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W * S, H * S);
    ctx.font = "12px Hanken Grotesk, sans-serif"; ctx.fillStyle = "rgba(242,239,233,.28)"; ctx.textAlign = "left";
    rooms.forEach(function (r) { ctx.fillText(r[0], r[1] * S + 8, r[2] * S + 18); });
    ctx.fillText("Main corridor", 8 * S, 13.7 * S);
    ctx.strokeStyle = "#4a4a4a"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.strokeRect(1, 1, W * S - 2, H * S - 2);
    walls.forEach(function (w) { ctx.beginPath(); ctx.moveTo(w[0] * S, w[1] * S); ctx.lineTo(w[2] * S, w[3] * S); ctx.stroke(); });
  }
  function drawAnchor(ctx, a, on, label) {
    ctx.fillStyle = on ? INK : "#333"; ctx.fillRect(a.x * S - 6, a.y * S - 6, 12, 12);
    ctx.fillStyle = on ? "rgba(242,239,233,.8)" : "#555"; ctx.font = "11px Hanken Grotesk, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label || a.id, a.x * S, a.y * S - 10);
  }

  // ---- live tracker -----------------------------------------------------
  var cvL = $("cvLive"), cx = cvL.getContext("2d");
  var el = { rays: $("lyRays"), unc: $("lyUnc"), crowd: $("lyCrowd"), pred: $("lyPred"), noise: $("noise"), anc: $("anc"), emerg: $("emerg") };
  var segLen = [], total = 0;
  for (var i = 1; i < wp.length; i++) { var l = dist(wp[i - 1][0], wp[i - 1][1], wp[i][0], wp[i][1]); segLen.push(l); total += l; }
  var dTrav = 0;
  function truePos(d) {
    d = d % total;
    for (var i = 0; i < segLen.length; i++) {
      if (d <= segLen[i]) { var t = d / segLen[i]; return [wp[i][0] + (wp[i + 1][0] - wp[i][0]) * t, wp[i][1] + (wp[i + 1][1] - wp[i][1]) * t]; }
      d -= segLen[i];
    }
    return wp[0].slice();
  }
  var tp = truePos(0);
  var st = { x: tp[0], y: tp[1], vx: 0, vy: 0, gap: 0, unc: 1.5, conf: 0.8, err: 1, used: [], down: [], lost: [], blocked: 0, trails: [], rays: [] };
  var trust = {}; anchors.forEach(function (a) { trust[a.id] = 0.8; });
  var coverGrid = null, emergency = false;

  function step(dt) {
    dTrav += 1.5 * dt;
    var t = truePos(dTrav);
    var sd = parseFloat(el.noise.value);
    var nOn = parseInt(el.anc.value, 10);
    var on = onAnchors(nOn);
    var crowded = inRect(t[0], t[1], crowd[0]) || inRect(t[0], t[1], crowd[1]);
    var sdEff = sd * (crowded ? 2.2 : 1);
    var px = st.x + st.vx * dt, py = st.y + st.vy * dt;
    var ms = [];
    anchors.forEach(function (a) {
      if (on.indexOf(a) < 0) { ms.push(null); return; }
      if (Math.random() < 0.04) { ms.push({ a: a, m: 0, lost: true }); return; }
      ms.push({ a: a, m: measure(t[0], t[1], a, sdEff, 1) });
    });
    var good = ms.filter(function (m) { return m && !m.lost; });
    var rays = [], used = [], down = [], lost = [];
    if (good.length >= 3) {
      var adj = [], w = [];
      good.forEach(function (m) {
        var k = cross(px, py, m.a.x, m.a.y);
        var predR = dist(px, py, m.a.x, m.a.y);
        var mm = m.m - 0.8 * k;
        var r = mm - predR;
        var tr = Math.exp(-Math.pow(r / 2.4, 2)) * (k ? 0.45 : 1);
        adj.push({ a: m.a, m: mm }); w.push(tr);
        trust[m.a.id] += (tr - trust[m.a.id]) * 0.05;
        rays.push({ a: m.a, trusted: tr > 0.55, k: k });
        (tr > 0.55 ? used : down).push(m.a.id);
      });
      var z = solve(adj, w, [px, py]);
      var K = 0.5, nx = px + K * (z[0] - px), ny = py + K * (z[1] - py);
      st.vx += ((nx - st.x) / Math.max(dt, 0.016) - st.vx) * 0.12;
      st.vy += ((ny - st.y) / Math.max(dt, 0.016) - st.vy) * 0.12;
      st.x = nx; st.y = ny; st.gap = 0;
    } else {
      st.x = clamp(px, 0, W); st.y = clamp(py, 0, H); st.gap += dt;
    }
    ms.forEach(function (m) { if (m && m.lost) lost.push(m.a.id); });
    st.used = used; st.down = down; st.lost = lost; st.rays = rays; st.on = on.length;
    st.blocked = rays.filter(function (r) { return r.k > 0; }).length;
    st.unc = clamp(0.6 + 2.2 * sdEff + 0.35 * down.length + 0.8 * st.gap, 0.5, 6);
    st.conf = clamp(0.98 - st.unc * 0.12, 0.2, 0.98);
    st.err += (dist(st.x, st.y, t[0], t[1]) - st.err) * 0.03;
    st.tx = t[0]; st.ty = t[1];
    st.trails.push([st.x, st.y]); if (st.trails.length > 70) st.trails.shift();
  }

  function computeCover(on) {
    var g = [];
    for (var gy = 1; gy < H; gy += 2) for (var gx = 1; gx < W; gx += 2) {
      var c = 0; on.forEach(function (a) { if (cross(gx, gy, a.x, a.y) <= 1 && dist(gx, gy, a.x, a.y) <= 20) c++; });
      g.push([gx, gy, c]);
    }
    return g;
  }

  function drawLive() {
    var ctx = cx;
    drawFloor(ctx);
    var nOn = parseInt(el.anc.value, 10), on = onAnchors(nOn);
    if (emergency) {
      if (!coverGrid || coverGrid.n !== nOn) { coverGrid = computeCover(on); coverGrid.n = nOn; }
      coverGrid.forEach(function (c) { if (c[2] < 3) { ctx.fillStyle = "rgba(255,90,71,.16)"; ctx.fillRect((c[0] - 1) * S, (c[1] - 1) * S, 2 * S, 2 * S); } });
      ctx.fillStyle = CORAL; ctx.font = "12px Hanken Grotesk, sans-serif"; ctx.textAlign = "left";
      ctx.fillText("Red cells: fewer than 3 anchors reach here, so estimates are uncertain", 10, H * S - 10);
    }
    if (el.crowd.checked) crowd.forEach(function (r) {
      ctx.fillStyle = "rgba(255,180,70,.12)"; ctx.fillRect(r[0] * S, r[1] * S, (r[2] - r[0]) * S, (r[3] - r[1]) * S);
      ctx.fillStyle = "rgba(255,180,70,.8)"; ctx.font = "12px Hanken Grotesk, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Crowded: signal worse", r[0] * S + 8, r[1] * S + 18);
    });
    if ($("offZone").checked) {
      ctx.fillStyle = "rgba(120,120,120,.35)"; ctx.fillRect(offZone[0] * S + 2, offZone[1] * S + 2, (offZone[2] - offZone[0]) * S - 4, (offZone[3] - offZone[1]) * S - 4);
      ctx.fillStyle = "#bbb"; ctx.font = "12px Hanken Grotesk, sans-serif"; ctx.textAlign = "left"; ctx.fillText("Tracking off", offZone[0] * S + 8, offZone[3] * S - 10);
    }
    var hidden = $("offZone").checked && inRect(st.x, st.y, offZone);
    // other assets
    assetsStatic.forEach(function (a) {
      var pr = emergency && a.pri;
      ctx.strokeStyle = pr ? CORAL : "#777"; ctx.lineWidth = pr ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(a.x * S, a.y * S - 7); ctx.lineTo(a.x * S + 7, a.y * S); ctx.lineTo(a.x * S, a.y * S + 7); ctx.lineTo(a.x * S - 7, a.y * S); ctx.closePath(); ctx.stroke();
      if (pr) { ctx.beginPath(); ctx.arc(a.x * S, a.y * S, 14, 0, 6.3); ctx.stroke(); }
      ctx.fillStyle = pr ? CORAL : "#888"; ctx.font = "11px Hanken Grotesk, sans-serif"; ctx.textAlign = "center"; ctx.fillText(a.id, a.x * S, a.y * S + 22);
    });
    anchors.forEach(function (a) { drawAnchor(ctx, a, on.indexOf(a) >= 0); });
    if (hidden) return;
    // rays
    if (el.rays.checked) st.rays.forEach(function (r) {
      ctx.strokeStyle = r.trusted ? "rgba(122,217,165,.7)" : "rgba(255,90,71,.8)"; ctx.lineWidth = 1.4;
      ctx.setLineDash(r.trusted ? [] : [5, 5]);
      ctx.beginPath(); ctx.moveTo(r.a.x * S, r.a.y * S); ctx.lineTo(st.x * S, st.y * S); ctx.stroke();
    });
    ctx.setLineDash([]);
    // trail
    ctx.strokeStyle = "rgba(242,239,233,.25)"; ctx.lineWidth = 2; ctx.beginPath();
    st.trails.forEach(function (p, i) { if (i) ctx.lineTo(p[0] * S, p[1] * S); else ctx.moveTo(p[0] * S, p[1] * S); }); ctx.stroke();
    if (el.unc.checked) {
      ctx.fillStyle = "rgba(255,90,71,.13)"; ctx.strokeStyle = "rgba(255,90,71,.7)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(st.x * S, st.y * S, st.unc * S, 0, 6.3); ctx.fill(); ctx.stroke();
    }
    if (el.pred.checked) {
      var fx = clamp(st.x + st.vx * 2, 0, W), fy = clamp(st.y + st.vy * 2, 0, H);
      ctx.setLineDash([4, 5]); ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(st.x * S, st.y * S); ctx.lineTo(fx * S, fy * S); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(fx * S, fy * S, 7, 0, 6.3); ctx.stroke();
      ctx.fillStyle = INK; ctx.font = "11px Hanken Grotesk, sans-serif"; ctx.textAlign = "left"; ctx.fillText("in 2 s", fx * S + 11, fy * S + 4);
    }
    // true position (faint) and estimate
    ctx.strokeStyle = "rgba(242,239,233,.55)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(st.tx * S, st.ty * S, 4, 0, 6.3); ctx.stroke();
    ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(st.x * S, st.y * S, 7, 0, 6.3); ctx.fill();
    ctx.fillStyle = INK; ctx.font = "600 12px Hanken Grotesk, sans-serif"; ctx.textAlign = "left"; ctx.fillText("W-014", st.x * S + 12, st.y * S - 10);
  }

  var lastRead = 0;
  function readout() {
    var hide = $("offZone").checked && inRect(st.x, st.y, offZone);
    if (hide) { $("readout").innerHTML = "<b>W-014</b>\nTracking is off in this zone.\nNo position is shown or stored."; $("readout").style.whiteSpace = "pre-line"; return; }
    var reason;
    if (st.gap > 0.3) reason = "signal gap, track predicted forward";
    else if (st.blocked > 0) reason = st.blocked + " of " + st.on + " anchors blocked, track held by motion history";
    else reason = "clear line to the anchors in use";
    $("readout").style.whiteSpace = "pre-line";
    $("readout").innerHTML = "<b>W-014</b> · " + zoneName(st.x, st.y) +
      "\nx " + st.x.toFixed(1) + " m  y " + st.y.toFixed(1) + " m" +
      "\nuncertainty " + st.unc.toFixed(1) + " m  conf " + st.conf.toFixed(2) +
      "\nused " + (st.used.join(" ") || "none") +
      "\ndown-weighted " + (st.down.join(" ") || "none") +
      (st.lost.length ? "\ndropped " + st.lost.join(" ") : "") +
      "\nreason: " + reason +
      "\nreal error (demo) " + st.err.toFixed(1) + " m";
  }

  el.noise.addEventListener("input", function () { $("noiseV").textContent = parseFloat(el.noise.value).toFixed(2) + " m"; });
  el.anc.addEventListener("input", function () { $("ancV").textContent = el.anc.value; coverGrid = null; refreshDev(); });
  el.emerg.addEventListener("click", function () {
    emergency = !emergency;
    el.emerg.setAttribute("aria-pressed", String(emergency));
    el.emerg.textContent = "Emergency mode: " + (emergency ? "on" : "off");
    el.emerg.className = emergency ? "btn" : "btn ghost";
    audit("operator " + (emergency ? "started" : "ended") + " emergency tracking mode");
  });

  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (current === "live" && !document.hidden) {
      var paused = window.TL && window.TL.paused;
      if (!paused) step(dt);
      drawLive();
      if (now - lastRead > 250) { readout(); lastRead = now; }
    }
    if (current === "dev" && now - lastDev > 1000) { refreshDev(); lastDev = now; }
    requestAnimationFrame(loop);
  }
  var lastDev = 0;
  for (var k = 0; k < 20; k++) step(0.1);   // warm up so the first frame has a track
  requestAnimationFrame(loop);

  // ---- placement optimizer ---------------------------------------------
  var cvP = $("cvPlace"), cp = cvP.getContext("2d");
  var samples = [], cands = [];
  for (var sy = 1; sy < H; sy += 2) for (var sx = 1; sx < W; sx += 2) { samples.push([sx, sy]); cands.push([sx, sy]); }
  var losM = null;
  function buildLos() {
    losM = cands.map(function (c) { return samples.map(function (s) { return cross(c[0], c[1], s[0], s[1]) <= 1 && dist(c[0], c[1], s[0], s[1]) <= 20; }); });
  }
  var baseline = [[1, 1], [39, 1], [1, 23], [39, 23], [20, 12], [20, 1], [20, 23], [1, 12], [39, 12]];
  var place = { sug: [], base: [], covS: 0, covB: 0 };
  function coverage(pts) {
    var n = 0;
    samples.forEach(function (s) {
      var c = 0; pts.forEach(function (p) { if (cross(p[0], p[1], s[0], s[1]) <= 1 && dist(p[0], p[1], s[0], s[1]) <= 20) c++; });
      if (c >= 3) n++;
    });
    return n / samples.length;
  }
  function runPlace() {
    if (!losM) buildLos();
    var N = parseInt($("plRange").value, 10);
    var counts = samples.map(function () { return 0; }), chosen = [];
    for (var k = 0; k < N; k++) {
      var best = -1, bi = 0;
      for (var c = 0; c < cands.length; c++) {
        if (chosen.indexOf(c) >= 0) continue;
        var g = 0;
        for (var s = 0; s < samples.length; s++) if (losM[c][s]) g += counts[s] < 3 ? 1 : 0.0005;
        var md = 20; chosen.forEach(function (q) { md = Math.min(md, dist(cands[c][0], cands[c][1], cands[q][0], cands[q][1])); });
        g += 0.02 * md;
        if (g > best) { best = g; bi = c; }
      }
      chosen.push(bi);
      for (var s2 = 0; s2 < samples.length; s2++) if (losM[bi][s2]) counts[s2]++;
    }
    place.sug = chosen.map(function (i) { return cands[i]; });
    place.base = baseline.slice(0, N);
    place.covS = coverage(place.sug); place.covB = coverage(place.base);
    place.counts = counts;
    var eB = 1.1 + 5.5 * Math.pow(1 - place.covB, 1.2), eS = 1.1 + 5.5 * Math.pow(1 - place.covS, 1.2);
    function row(label, cov, err, col) {
      return '<div class="r"><span>' + label + '</span><div class="bar2"><i style="width:' + Math.round(cov * 100) + '%;background:' + col + '"></i></div><span>' + Math.round(cov * 100) + '%</span></div>' +
        '<div class="small" style="margin:-2px 0 4px">estimated error about ' + err.toFixed(1) + ' m</div>';
    }
    $("plCmp").innerHTML = '<div class="small" style="margin:0">Floor where 3+ anchors are in range through at most one wall</div>' + row("Corners and edges", place.covB, eB, "#777") + row("Suggested layout", place.covS, eS, CORAL);
    $("plNote").textContent = "Simulated with this demo floor plan. A pilot repeats it with your surveyed plan.";
    drawPlace();
  }
  function drawPlace() {
    if (!place.sug.length) return;
    drawFloor(cp);
    samples.forEach(function (s, i) {
      cp.fillStyle = place.counts[i] >= 3 ? "rgba(122,217,165,.12)" : "rgba(255,90,71,.14)";
      cp.fillRect((s[0] - 1) * S, (s[1] - 1) * S, 2 * S, 2 * S);
    });
    place.base.forEach(function (p, i) { cp.strokeStyle = "#777"; cp.lineWidth = 1.5; cp.strokeRect(p[0] * S - 7, p[1] * S - 7, 14, 14); });
    place.sug.forEach(function (p, i) { drawAnchor(cp, { x: p[0], y: p[1] }, true, "S" + (i + 1)); cp.fillStyle = CORAL; cp.fillRect(p[0] * S - 6, p[1] * S - 6, 12, 12); });
    cp.fillStyle = "rgba(242,239,233,.7)"; cp.font = "12px Hanken Grotesk, sans-serif"; cp.textAlign = "left";
    cp.fillText("Filled red: suggested   Outlined grey: corners and edges   Green tint: 3+ anchors in range", 10, H * S - 10);
  }
  $("plRange").addEventListener("input", function () { $("plN").textContent = $("plRange").value; runPlace(); });
  $("plRun").addEventListener("click", function () { runPlace(); audit("operator ran the placement optimizer for " + $("plRange").value + " anchors"); });

  // ---- error map --------------------------------------------------------
  var cvE = $("cvErr"), ce = cvE.getContext("2d");
  var errMode = "after", errData = null;
  function buildErrMap() {
    var on = anchors, cells = [], trB = 0, trA = 0, vaB = 0, vaA = 0, n = 0;
    for (var gy = 0; gy < H; gy += 2) for (var gx = 0; gx < W; gx += 2) {
      var sx = 0, sy = 0, sb = 0, c = 0;
      for (var i = 0; i < 16; i++) {
        var px = gx + 0.2 + Math.random() * 1.6, py = gy + 0.2 + Math.random() * 1.6;
        var e = estimateStatic(px, py, on, 0.25, 1, "trace");
        if (!e) continue; sx += e[0] - px; sy += e[1] - py; sb += dist(e[0], e[1], px, py); c++;
      }
      var mx = sx / c, my = sy / c, tb = sb / c, ta = 0, vb = 0, va = 0;
      for (var j = 0; j < 16; j++) {
        var qx = gx + 0.2 + Math.random() * 1.6, qy = gy + 0.2 + Math.random() * 1.6;
        var e2 = estimateStatic(qx, qy, on, 0.25, 1, "trace");
        if (!e2) continue;
        vb += dist(e2[0], e2[1], qx, qy); va += dist(e2[0] - mx, e2[1] - my, qx, qy);
      }
      // training "after": remove the cell's learned shift from the same kind of samples
      var ta2 = 0; for (var m = 0; m < 16; m++) {
        var rx = gx + 0.2 + Math.random() * 1.6, ry = gy + 0.2 + Math.random() * 1.6;
        var e3 = estimateStatic(rx, ry, on, 0.25, 1, "trace"); if (!e3) continue; ta2 += dist(e3[0] - mx, e3[1] - my, rx, ry);
      }
      cells.push({ x: gx, y: gy, before: vb / 16, after: va / 16 });
      trB += tb; trA += ta2 / 16; vaB += vb / 16; vaA += va / 16; n++;
    }
    errData = { cells: cells, trB: trB / n, trA: trA / n, vB: vaB / n, vA: vaA / n };
    $("emRead").style.whiteSpace = "pre-line";
    $("emRead").innerHTML = "<b>Learning paths</b>\nbefore " + errData.trB.toFixed(2) + " m → after " + errData.trA.toFixed(2) + " m\n\n<b>Separate held-out paths</b>\nbefore " + errData.vB.toFixed(2) + " m → after " + errData.vA.toFixed(2) + " m";
    drawErr();
  }
  function drawErr() {
    if (!errData) return;
    drawFloor(ce);
    errData.cells.forEach(function (c) {
      var v = errMode === "before" ? c.before : c.after, t = clamp(v / 3, 0, 1);
      ce.fillStyle = "rgba(255,90,71," + (0.08 + t * 0.75).toFixed(2) + ")"; ce.fillRect(c.x * S + 1, c.y * S + 1, 2 * S - 2, 2 * S - 2);
      ce.fillStyle = "rgba(242,239,233,.75)"; ce.font = "11px Hanken Grotesk, sans-serif"; ce.textAlign = "center"; ce.fillText(v.toFixed(1), c.x * S + S, c.y * S + S + 4);
    });
    anchors.forEach(function (a) { drawAnchor(ce, a, true); });
  }
  $("emSeg").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    errMode = b.dataset.m;
    $("emSeg").querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    drawErr();
  });

  // ---- stress test ------------------------------------------------------
  $("stRun").addEventListener("click", function () {
    var out = $("stOut"); out.textContent = "Running…";
    setTimeout(function () {
      var N = 2000, byMiss = [0, 1, 2, 3, 4, 5].map(function () { return { n: 0, nv: 0, tr: 0 }; });
      var byNoise = [{ l: "Under 0.2 m", n: 0, nv: 0, tr: 0 }, { l: "0.2 to 0.4 m", n: 0, nv: 0, tr: 0 }, { l: "Over 0.4 m", n: 0, nv: 0, tr: 0 }];
      var tot = { nv: 0, tr: 0 };
      for (var i = 0; i < N; i++) {
        var sd = 0.05 + Math.random() * 0.55, miss = Math.floor(Math.random() * 6), bs = 0.3 + Math.random() * 1.3;
        var set = anchors.slice().sort(function () { return Math.random() - 0.5; }).slice(0, anchors.length - miss);
        var px = 1 + Math.random() * 38, py = 1 + Math.random() * 22;
        var a = estimateStatic(px, py, set, sd, bs, "naive"), b = estimateStatic(px, py, set, sd, bs, "trace");
        var okN = a && dist(a[0], a[1], px, py) < 2.5, okT = b && dist(b[0], b[1], px, py) < 2.5;
        var g = byMiss[miss]; g.n++; if (okN) g.nv++; if (okT) g.tr++;
        var nb = byNoise[sd < 0.2 ? 0 : sd < 0.4 ? 1 : 2]; nb.n++; if (okN) nb.nv++; if (okT) nb.tr++;
        if (okN) tot.nv++; if (okT) tot.tr++;
      }
      function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
      function rows(arr, lab) {
        return arr.map(function (g, i) {
          return "<tr><td>" + lab(g, i) + "</td><td>" + g.n + "</td><td>" + pct(g.nv, g.n) + "%</td><td>" + pct(g.tr, g.n) + "%</td></tr>";
        }).join("");
      }
      var breakAt = -1; byMiss.forEach(function (g, i) { if (breakAt < 0 && pct(g.tr, g.n) < 80) breakAt = i; });
      var msg = breakAt < 0 ? "Traceline stayed above 80% in every group tested." : "Traceline drops below 80% once " + breakAt + " of 8 anchors are missing. Plan for at least " + (8 - breakAt + 1) + " working anchors.";
      out.innerHTML = '<div class="read" style="white-space:pre-line"><b>' + N + " cases</b>\nnaive solver passes " + pct(tot.nv, N) + "%\nTraceline passes " + pct(tot.tr, N) + "%\n" + msg + "</div>" +
        '<div class="table-wrap mini" style="margin-top:12px"><table><thead><tr><th>Anchors missing</th><th>Cases</th><th>Naive</th><th>Traceline</th></tr></thead><tbody>' + rows(byMiss, function (g, i) { return i; }) + "</tbody></table></div>" +
        '<div class="table-wrap mini" style="margin-top:12px"><table><thead><tr><th>Noise</th><th>Cases</th><th>Naive</th><th>Traceline</th></tr></thead><tbody>' + rows(byNoise, function (g) { return g.l; }) + "</tbody></table></div>";
      audit("operator ran a stress test of " + N + " cases");
    }, 40);
  });

  // ---- devices ----------------------------------------------------------
  var batt = { A1: 91, A2: 84, A3: 77, A4: 95, A5: 88, A6: 62, A7: 73, A8: 80 };
  function refreshDev() {
    var on = onAnchors(parseInt(el.anc.value, 10));
    $("devBody").innerHTML = anchors.map(function (a) {
      var isOn = on.indexOf(a) >= 0;
      return "<tr><td>" + a.id + "</td><td>" + a.x + ", " + a.y + " m</td><td>" + (isOn ? "Online" : "Switched off") + "</td><td>" + batt[a.id] + "%</td><td>" + (isOn ? trust[a.id].toFixed(2) : "–") + "</td></tr>";
    }).join("");
    $("assetBody").innerHTML = "<tr><td>W-014</td><td>Wheelchair</td><td>" + zoneName(st.x, st.y) + "</td><td>Normal</td></tr>" +
      assetsStatic.map(function (a) { return "<tr><td>" + a.id + "</td><td>" + a.type + "</td><td>" + zoneName(a.x, a.y) + "</td><td>" + (a.pri ? "Priority" : "Normal") + "</td></tr>"; }).join("");
  }
  refreshDev();

  // ---- privacy + audit --------------------------------------------------
  var logEl = $("audit");
  function stamp() { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2); }
  function audit(t) { logEl.innerHTML = stamp() + "  " + t + "\n" + logEl.innerHTML; }
  logEl.style.whiteSpace = "pre-line";
  logEl.innerHTML = "08:02:11  admin signed in with MFA\n08:02:40  viewer opened live map\n08:15:03  operator exported zone report";
  $("ret").addEventListener("change", function () { audit("admin set retention to " + $("ret").value.toLowerCase()); });
  $("offZone").addEventListener("change", function () { audit("admin turned tracking " + ($("offZone").checked ? "off" : "on") + " in the staff room"); });
  $("noise").addEventListener("change", function () { /* noise is a simulation control, not logged */ });
})();
