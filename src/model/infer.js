// Traceline browser/Node inference wrapper (Workstream B).
//
//   import { TracelineInfer } from "./infer.js";
//   const t = await TracelineInfer.create({ ort, modelUrl: "model.onnx", metaUrl: "model_meta.json" });
//   const out = await t.step({ anchors: [...], dt_s: 0.5, venue: { width_m: 50, height_m: 30 } });
//   t.reset();   // call at the start of every run / scenario
//
// `ort` is ONNX Runtime Web (browser, pinned in shared/versions.json) or onnxruntime-node.
// No server, no API key, no third-party AI. Units: metres, dBm, seconds. Origin bottom-left, y up.
//
// Input anchor objects: { anchor_id, x_m, y_m, range_m, rssi_dbm, crowd_path_density? }
//   range_m / rssi_dbm = null | undefined | NaN  ->  missing reading (valid_flag 0).
//   Never encode "missing" as -1, 0 or 999.
// Output: the canonical object of guide section 9.3 plus `flags` and `out_of_bounds`.
// Out-of-bounds estimates are flagged, never clamped.

const MAX_ANCHORS = 8;
const NAN_OK = (v) => typeof v === "number" && Number.isFinite(v);

export function explain({ anchorIds, valid, nlosProb, weights, rangeM, anchorXY, position, sigmaM, thresholds, bounds }) {
  // Mirrors traceline_model/explain.py exactly (parity-tested on golden vectors).
  const th = { nlos_threshold: 0.5, weight_threshold: 0.2, sigma_high_m: 2.0, ...(thresholds || {}) };
  const [x, y] = position;
  const used = [], down = [], codes = [], texts = [];
  let nRealValid = 0;
  for (let j = 0; j < anchorIds.length; j++) {
    const aid = anchorIds[j];
    if (aid === null || aid === undefined) continue;
    if (!valid[j]) {
      codes.push(`MISSING_READING:${aid}`);
      texts.push(`Anchor ${aid} reading missing.`);
      continue;
    }
    nRealValid++;
    const dist = Math.hypot(x - anchorXY[j][0], y - anchorXY[j][1]);
    const res = rangeM[j] - dist;
    const suspect = nlosProb[j] >= th.nlos_threshold;
    const low = weights[j] < th.weight_threshold;
    if (suspect || low) {
      down.push(aid);
      let why;
      if (suspect) {
        codes.push(`NLOS_SUSPECTED:${aid}`);
        why = `likely obstructed (NLOS probability ${nlosProb[j].toFixed(2)}; measured range is ` +
          `${Math.abs(res).toFixed(1)} m ${res >= 0 ? "longer" : "shorter"} than the distance to the estimate)`;
      } else {
        codes.push(`LOW_WEIGHT:${aid}`);
        why = `low reliability weight (${weights[j].toFixed(2)})`;
      }
      texts.push(`Anchor ${aid} down-weighted, ${why}.`);
    } else {
      used.push(aid);
    }
  }
  if (nRealValid === 0) {
    codes.push("DEAD_RECKONING");
    texts.push("No valid anchor readings; position carried forward from motion history.");
  } else if (used.length < 3) {
    codes.push("FEW_ANCHORS");
    texts.push(`Only ${used.length} trusted anchor(s); estimate relies partly on motion history.`);
  }
  if (sigmaM >= th.sigma_high_m) {
    codes.push("HIGH_UNCERTAINTY");
    texts.push(`Uncertainty is high (about ${sigmaM.toFixed(1)} m).`);
  }
  if (bounds && !(x >= 0 && x <= bounds[0] && y >= 0 && y <= bounds[1])) {
    codes.push("OUT_OF_BOUNDS");
    texts.push("Estimate lies outside the venue bounds; it was not clamped.");
  }
  if (codes.length === 0) {
    codes.push("NORMAL");
    texts.push("All usable anchors are consistent with the estimate.");
  }
  return { used_anchor_ids: used, downweighted_anchor_ids: down, reason_codes: codes, reason_text: texts.join(" ") };
}

export class TracelineInfer {
  constructor(ort, session, meta) {
    this.ort = ort;
    this.session = session;
    this.meta = meta;
    this.K = meta.horizon_steps;
    this.H = meta.state.shape[1];
    this.norm = meta.normalization;
    this.reset();
  }

  /** Create from URLs (browser) or pass `meta` / `modelBytes` directly (Node tests). */
  static async create({ ort, modelUrl, metaUrl, meta, modelBytes, sessionOptions }) {
    const m = meta || (await (await fetch(metaUrl)).json());
    const source = modelBytes || modelUrl;
    const session = await ort.InferenceSession.create(source, sessionOptions || { executionProviders: ["wasm", "cpu"] });
    return new TracelineInfer(ort, session, m);
  }

  /** Start of a run: zero recurrent state, previous position invalid. */
  reset() {
    this.state = new Float32Array(this.H);
    this.prevPos = [0, 0];
    this.prevValid = 0;
  }

  /**
   * One 0.5 s step.
   * @param {{anchors: object[], dt_s?: number, venue?: {width_m:number,height_m:number}}} input
   */
  async step({ anchors, dt_s, venue }) {
    if (!Array.isArray(anchors)) throw new Error("anchors must be an array");
    if (anchors.length > MAX_ANCHORS) throw new Error(`at most ${MAX_ANCHORS} active anchors`);
    const dt = dt_s ?? this.meta.dt_s;
    const sorted = [...anchors].sort((a, b) => a.anchor_id - b.anchor_id);
    const n = this.norm;
    const useCrowd = this.meta.enable_crowd_input;
    const slots = new Float32Array(MAX_ANCHORS * 6);
    const ids = new Array(MAX_ANCHORS).fill(null);
    const valid = new Array(MAX_ANCHORS).fill(false);
    const rangeM = new Array(MAX_ANCHORS).fill(0);
    const xy = Array.from({ length: MAX_ANCHORS }, () => [n.x.mean, n.y.mean]);
    for (let j = 0; j < MAX_ANCHORS; j++) {
      const a = sorted[j];
      let v = 0, x = n.x.mean, y = n.y.mean, r = n.range.mean, rs = n.rssi.mean, c = n.crowd.mean;
      if (a) {
        ids[j] = a.anchor_id;
        x = a.x_m; y = a.y_m; xy[j] = [x, y];
        if (NAN_OK(a.range_m) && NAN_OK(a.rssi_dbm) && a.range_m >= 0) {
          v = 1; r = a.range_m; rs = a.rssi_dbm; rangeM[j] = r;
          if (useCrowd && NAN_OK(a.crowd_path_density)) c = a.crowd_path_density;
        }
      }
      valid[j] = v === 1;
      slots.set([x, y, r, rs, v, c], j * 6);
    }
    const T = this.ort.Tensor;
    const feeds = {
      slots: new T("float32", slots, [1, MAX_ANCHORS, 6]),
      prev_pos: new T("float32", Float32Array.from(this.prevPos), [1, 2]),
      prev_valid: new T("float32", Float32Array.from([this.prevValid]), [1, 1]),
      dt: new T("float32", Float32Array.from([dt]), [1, 1]),
      state: new T("float32", this.state, [1, this.H]),
    };
    const o = await this.session.run(feeds);
    const pos = Array.from(o.position.data);
    const sigma = o.sigma.data[0];
    const nlos = Array.from(o.nlos_prob.data);
    const weights = Array.from(o.weights.data);
    const fc = o.forecast.data;
    const bounds = venue ? [venue.width_m, venue.height_m] : null;
    const finite = [...pos, sigma].every(Number.isFinite);
    const ex = explain({ anchorIds: ids, valid, nlosProb: nlos, weights, rangeM, anchorXY: xy, position: pos,
      sigmaM: sigma, thresholds: this.meta.explain_thresholds, bounds });
    const outOfBounds = ex.reason_codes.includes("OUT_OF_BOUNDS");
    const predicted = [];
    for (let k = 0; k < this.K; k++) predicted.push({ t_offset_s: (k + 1) * dt, x_m: fc[2 * k], y_m: fc[2 * k + 1] });

    this.state = Float32Array.from(o.state_out.data);
    this.prevPos = pos;          // previous *estimate*; never truth
    this.prevValid = finite ? 1 : 0;

    const flags = [];
    if (!finite) flags.push("NON_FINITE_OUTPUT");
    if (outOfBounds) flags.push("OUT_OF_BOUNDS");
    if (ex.reason_codes.includes("HIGH_UNCERTAINTY")) flags.push("HIGH_UNCERTAINTY");
    return {
      x_hat_m: pos[0], y_hat_m: pos[1], sigma_m: sigma,
      nlos_probability_by_anchor: nlos, predicted_positions: predicted,
      state_out: Array.from(this.state), confidence: 1 / (1 + sigma),
      ...ex, anchor_slot_ids: ids, flags, out_of_bounds: outOfBounds,
    };
  }
}
