# model/ : Workstream B (Positioning AI and browser inference)

Owner: Member B. Do not edit other folders; ask their owners. Everything here is reproducible from seeds.
**All data is synthetic.** The stand-in generator is temporary until Member A's datasets arrive.

## What is here

| Path | What |
|---|---|
| `traceline_model/standin_data.py` | TEMPORARY stand-in data (section 9 CSV contracts + venue JSON) |
| `traceline_model/loader.py` | CSV -> aligned 8-slot arrays; valid mask authoritative; never reads truth for inputs |
| `traceline_model/baselines.py` | B1 WLS, B2 residual rejection, B3 EKF, tuning helpers |
| `traceline_model/nn_model.py`, `train.py` | the neural model and training (PyTorch, CPU) |
| `traceline_model/explain.py` | per-anchor influence + plain-language reason |
| `traceline_model/export_onnx.py` | ONNX opset 17 export + parity check + `model_meta.json` |
| `traceline_model/evaluate.py`, `metrics.py` | baseline vs neural, ablations, NLOS, calibration, dropout |
| `traceline_model/golden.py` | golden vectors for Python / ONNX / JS parity |
| `infer.js` | browser/Node wrapper returning the canonical output object |
| `bench.html`, `traceline_model/benchmark.py` | browser and Python latency benchmarks |
| `model.onnx`, `model_meta.json` | the deliverable consumed by D (after `make export`) |
| `MODEL_CARD.md`, `reports/` | generated from scripts; every number reproducible |
| `DECISIONS.md` | decisions and open questions for the team |

## Quick start (clean laptop)

```bash
python -m venv .venv && source .venv/bin/activate   # Python 3.11+
make setup        # pip + npm dependencies
make all          # data -> train -> ablations -> eval -> export (+golden) -> bench -> model card -> tests
```

Single commands: `make data`, `make train`, `make ablations`, `make eval`, `make export`, `make bench`, `make report`, `make test`, `make test-js`.
Training takes a few minutes per model on a laptop CPU. With real data from Member A:
`python -m traceline_model.train --train <A/train> --dev <A/dev>` and the same for `evaluate`.

## Using infer.js (for Member D)

```js
import * as ort from "onnxruntime-web";               // pinned version from shared/versions.json
import { TracelineInfer } from "./infer.js";
const tl = await TracelineInfer.create({ ort, modelUrl: "model.onnx", metaUrl: "model_meta.json" });
tl.reset();                                            // start of every run
const out = await tl.step({
  anchors: [{ anchor_id: 0, x_m: 3, y_m: 14, range_m: 9.2, rssi_dbm: -61.3 },
            { anchor_id: 1, x_m: 14, y_m: 16, range_m: null, rssi_dbm: null }],   // null = missing reading
  dt_s: 0.5, venue: { width_m: 50, height_m: 30 } });
// out: x_hat_m, y_hat_m, sigma_m, nlos_probability_by_anchor[8], predicted_positions[10],
//      state_out, confidence, used_anchor_ids, downweighted_anchor_ids, reason_codes, reason_text,
//      anchor_slot_ids, flags, out_of_bounds
```

Rules: metres and dBm, origin bottom-left with y up, at most 8 active anchors, send anchors that are switched off for the whole run *not at all*, send missing readings as `null`. Call `reset()` at the start of each run. Estimates outside the venue are flagged, never clamped. `confidence = 1/(1+sigma_m)` is not a probability (DECISIONS D-004).

## Handoff checklist (guide section 6 and 16)

1. `make test` and `make test-js` pass; run `shared/validate_contracts.py` (A/D own it) on `golden/` and `model_meta.json`.
2. Commit `model.onnx`, `model_meta.json`, `infer.js`, docs, small reports. Do not commit `data/`, `models/*/model.pt` or `node_modules/`.
3. Tag and announce: `git tag handoff-b-d-1 && git push origin handoff-b-d-1` (and `handoff-b-c-1` for Member C). The tag message lists the exact commands above, known issues and the sample under `golden/`.
4. Measure browser latency: serve this folder, open `bench.html` in Chrome and Edge, save the JSON to `reports/benchmark_browser_<browser>.json`, run `make report`.

## Known gaps (honest list)

* Trained and evaluated on stand-in synthetic data only. Re-run on Member A's data before quoting any number.
* No browser benchmark has been measured by the script; Python CPU numbers are in `reports/benchmark_python.json`.
* The optional crowd input uses a proxy in the stand-in data (DECISIONS D-006).
* The final hidden set and the `clinic` venue are not touched here; Member C scores them once after the freeze.
