// JS-vs-Python parity test for infer.js. Run: npm install && npm test   (or: make test-js)
import * as ort from "onnxruntime-web";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TracelineInfer, explain } from "../infer.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
ort.env.wasm.numThreads = 1;
const meta = JSON.parse(fs.readFileSync(path.join(root, "model_meta.json"), "utf8"));
const golden = JSON.parse(fs.readFileSync(path.join(root, "golden", "golden_vectors.json"), "utf8"));
const modelBytes = fs.readFileSync(path.join(root, "model.onnx"));

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error("FAIL:", msg); } };
const close = (a, b, tol) => Math.abs(a - b) <= tol;

const t = await TracelineInfer.create({ ort, meta, modelBytes, sessionOptions: { executionProviders: ["wasm"] } });

for (const seq of golden.sequences) {
  t.reset();
  let maxdiff = 0;
  for (const [i, s] of seq.steps.entries()) {
    const out = await t.step({ anchors: s.anchors, dt_s: s.dt_s, venue: seq.venue });
    const e = s.expected;
    const tol = seq.tolerance;
    const pairs = [[out.x_hat_m, e.position[0]], [out.y_hat_m, e.position[1]], [out.sigma_m, e.sigma]];
    out.nlos_probability_by_anchor.forEach((v, j) => pairs.push([v, e.nlos_prob[j]]));
    out.predicted_positions.forEach((p, k) => { pairs.push([p.x_m, e.forecast[2 * k]], [p.y_m, e.forecast[2 * k + 1]]); });
    for (const [a, b] of pairs) maxdiff = Math.max(maxdiff, Math.abs(a - b));
    check(pairs.every(([a, b]) => close(a, b, tol)), `${seq.name} step ${i}: numeric mismatch`);
    check(JSON.stringify(out.reason_codes) === JSON.stringify(e.reason_codes),
      `${seq.name} step ${i}: reason codes ${JSON.stringify(out.reason_codes)} vs ${JSON.stringify(e.reason_codes)}`);
    check(JSON.stringify(out.used_anchor_ids) === JSON.stringify(e.used_anchor_ids), `${seq.name} step ${i}: used ids`);
    check(JSON.stringify(out.downweighted_anchor_ids) === JSON.stringify(e.downweighted_anchor_ids), `${seq.name} step ${i}: down ids`);
    check(out.reason_text === e.reason_text, `${seq.name} step ${i}: reason text\n  ${out.reason_text}\n  ${e.reason_text}`);
  }
  console.log(`${seq.name}: ${seq.steps.length} steps, max |JS - Python| = ${maxdiff.toExponential(2)}`);
}

// state reset: first step after reset() must equal the first golden step again
{
  const s = golden.sequences[0];
  t.reset();
  const a = await t.step({ anchors: s.anchors === undefined ? s.steps[0].anchors : s.steps[0].anchors, venue: s.venue });
  await t.step({ anchors: s.steps[1].anchors, venue: s.venue });
  t.reset();
  const b = await t.step({ anchors: s.steps[0].anchors, venue: s.venue });
  check(a.x_hat_m === b.x_hat_m && a.y_hat_m === b.y_hat_m, "reset() must restore the initial state");
}

// repeated calls are stable and finite
{
  const s = golden.sequences[0].steps[0];
  t.reset();
  for (let i = 0; i < 300; i++) {
    const o = await t.step({ anchors: s.anchors, venue: golden.sequences[0].venue });
    if (!Number.isFinite(o.x_hat_m) || !Number.isFinite(o.sigma_m)) { check(false, `non-finite output at call ${i}`); break; }
  }
}

// invalid readings: null / NaN / undefined all mean missing, never a numeric code
{
  const base = golden.sequences[0].steps[0].anchors.map((a) => ({ ...a, range_m: null, rssi_dbm: null }));
  t.reset();
  const o = await t.step({ anchors: base });
  check(o.reason_codes.includes("DEAD_RECKONING"), "all-missing step must report DEAD_RECKONING");
  check(base.length === 0 || o.reason_codes.some((c) => c.startsWith("MISSING_READING")), "missing readings must be reported");
}

// out-of-bounds is flagged, never clamped
{
  const ex = explain({ anchorIds: [0, null, null, null, null, null, null, null], valid: [true, false, false, false, false, false, false, false],
    nlosProb: new Array(8).fill(0), weights: new Array(8).fill(1), rangeM: new Array(8).fill(5),
    anchorXY: new Array(8).fill([0, 0]), position: [60, -3], sigmaM: 0.5, bounds: [50, 30] });
  check(ex.reason_codes.includes("OUT_OF_BOUNDS"), "OUT_OF_BOUNDS must be flagged");
}

// more than 8 anchors is rejected
{
  let threw = false;
  try { await t.step({ anchors: new Array(9).fill({ anchor_id: 0, x_m: 0, y_m: 0, range_m: 1, rssi_dbm: -50 }) }); } catch { threw = true; }
  check(threw, "more than 8 anchors must throw");
}

if (failures) { console.error(`${failures} JS test failure(s)`); process.exit(1); }
console.log("all JS tests passed");
