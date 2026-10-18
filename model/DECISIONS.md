# Workstream B decisions

Guide rule 7: when something is not covered, choose the simplest option that keeps contracts intact, record it here, and tell the team. Nothing below changes a frozen contract; items marked **ASK** need a team answer.

| ID | Decision | Why |
|---|---|---|
| D-001 | This folder implements Workstream B (positioning AI + browser inference). | The owner is Member B. |
| D-002 | Until Member A ships data, `traceline_model/standin_data.py` generates **temporary** CSVs and venue JSONs in the section 9 formats (`data/standin/`). Venue sketches are not the official `shared/venues/*.json`. Signal parameters are hard-coded from section 8 in `constants.py` because `shared/signal_model.json` was not available. | Nobody waits for anybody. Swap = point `--train/--dev` at A's folders; no code change. |
| D-003 | Forecast horizon is 10 steps (5 s). | Section 10.2 asks for track error during 1-10 missing steps with and without prediction. |
| D-004 | `sigma_m` = per-axis standard deviation of an isotropic Gaussian (Gaussian NLL). `confidence = 1/(1+sigma_m)` is only a monotone transform, **not** a probability. | Section 9.3: do not call a score confidence unless its meaning is documented and tested. Calibration is measured in `reports/` and `MODEL_CARD.md`; C re-checks. |
| D-005 | Normalisation statistics (train-only) are baked into the ONNX graph and also written to `model_meta.json`. Callers pass raw metres/dBm. Invalid or padded slots carry the train mean (neutral) and `valid_flag = 0`; the mask is authoritative. Never `-1`, `0` or `999`. | Fewer places for unit bugs in the demo. |
| D-006 | Crowd path density input is **off** (`enable_crowd_input: false`). A `crowd.json` ablation turns it on using a *proxy* (truth + N(0, 2 m) jitter) because the real input must come from the previous estimate. | Computing it from truth would leak position. Contract allows the input only if the team agrees. **ASK**: does the team enable it, and will D compute it from the previous estimate? |
| D-007 | Single-step ONNX graph with explicit `state` in/out (GRUCell), dynamic batch, opset 17, legacy TorchScript exporter. | Simple, exports without a server, easy to reset. |
| D-008 | B1/B2 hold the last estimate and B3 predicts forward when fewer than 3 ranges are valid; before the first fix they output the anchor centroid. B2's threshold and B3's q / r are tuned on a train subset only. | Same readings and same coverage for every method. |
| D-009 | JS tests use `onnxruntime-web` 1.30.0 (pure WASM, works in Node and the browser). `onnxruntime-node` could not be installed here. **ASK**: record the pinned version in `shared/versions.json`. | Pin one version for browser and tests. |
| D-010 | NLOS threshold is chosen on even-indexed dev runs and reported on odd-indexed dev runs. Explain thresholds (`nlos_threshold`, `sigma_high_m` = P90 sigma on the selection runs, `weight_threshold` = 0.2) live in `model_meta.json`. | Avoid reporting a threshold on the data that chose it. |
| D-011 | Golden vectors are in `golden/golden_vectors.json` (3 sequences: normal, 3-anchor, mid-run total dropout). **ASK**: promote to `shared/golden_vectors/` through `shared/changes/`. | `shared/` changes need all four members. |
| D-012 | Out-of-bounds estimates are flagged (`OUT_OF_BOUNDS` code and flag) and never clamped. | Section 10.3. |
| D-013 | Development environment was Python 3.13 / torch 2.14 / onnxruntime 1.29, not the 3.11 pin in the guide. Versions are written into every manifest. **ASK**: confirm the team pin; code uses nothing version-specific. | Honest provenance. |
| D-014 | Local metrics (`metrics.py`) exist only to compare methods on dev. C's `eval/metrics.py` is authoritative. | Folder ownership. |

## Open questions for the team
1. Is the optional crowd input enabled in contract v1 (D-006)?
2. Which ONNX Runtime Web version is pinned (D-009)?
3. Does A's real simulator use the same RSSI/NLOS conventions as the stand-in (RSSI computed from true distance, bias added to range only)? The NLOS head's behaviour depends on it.
4. Who computes `crowd_path_density` in the demo if it is enabled?
