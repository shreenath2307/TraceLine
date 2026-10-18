"""Generate golden test vectors for Python-vs-ONNX-vs-JavaScript parity.

    python -m traceline_model.golden            # writes golden/golden_vectors.json

Inputs are raw anchor readings (null = missing) exactly as infer.js receives them; expected
outputs come from the PyTorch model and explain.py. Candidate for shared/golden_vectors/ once
the team approves (propose via shared/changes/).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from .constants import DT_S
from .explain import explain
from .loader import load_dataset, slots_array
from .train import load_model

N_STEPS = 14


def _sequence(name, run, model, stats, meta, forced_missing=None):
    valid = run.valid.copy()
    if forced_missing:
        valid[forced_missing[0] : forced_missing[1]] = False
    run = run.copy_with_valid(valid)
    sl = torch.from_numpy(slots_array(run, stats, use_crowd_values=model.cfg["use_crowd"]))
    H = model.state_size
    prev, pv, h = torch.zeros(1, 2), torch.zeros(1, 1), torch.zeros(1, H)
    steps = []
    thr = meta["explain_thresholds"]
    for t in range(N_STEPS):
        anchors = []
        for j, aid in enumerate(run.anchor_ids):
            ok = bool(valid[t, j])
            a = {"anchor_id": int(aid), "x_m": float(run.anchor_xy[j, 0]), "y_m": float(run.anchor_xy[j, 1]),
                 "range_m": float(run.range_m[t, j]) if ok else None, "rssi_dbm": float(run.rssi_dbm[t, j]) if ok else None}
            if model.cfg["use_crowd"] and run.crowd_path is not None:
                a["crowd_path_density"] = float(run.crowd_path[t, j])
            anchors.append(a)
        with torch.no_grad():
            o = model(sl[t : t + 1], prev, pv, torch.full((1, 1), DT_S), h)
        arr = sl[t].numpy()
        ids = [int(a) for a in run.anchor_ids] + [None] * (8 - run.n_active)
        ex = explain(ids, [bool(x) for x in arr[:, 4] > 0.5], o["nlos_prob"][0].tolist(), o["weights"][0].tolist(),
                     arr[:, 2].tolist(), arr[:, :2].tolist(), o["position"][0].tolist(), float(o["sigma"][0, 0]),
                     thr, bounds=(run.width_m, run.height_m))
        steps.append({"anchors": anchors, "dt_s": DT_S, "expected": {
            "position": o["position"][0].tolist(), "sigma": float(o["sigma"][0, 0]), "nlos_prob": o["nlos_prob"][0].tolist(),
            "weights": o["weights"][0].tolist(), "forecast": o["forecast"][0].flatten().tolist(), **ex}})
        prev, pv, h = o["position"], torch.ones(1, 1), o["state_out"]
    return {"name": name, "run_id": run.run_id, "venue": {"width_m": run.width_m, "height_m": run.height_m},
            "tolerance": 1e-3, "steps": steps}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default="models/default")
    ap.add_argument("--dev", default="data/standin/dev")
    ap.add_argument("--meta", default="model_meta.json")
    ap.add_argument("--out", default="golden/golden_vectors.json")
    a = ap.parse_args(argv)
    model, stats = load_model(a.model_dir)
    meta = json.loads(Path(a.meta).read_text())
    runs = load_dataset(a.dev)
    sparse = next(r for r in runs if r.n_active == 3)
    full = next(r for r in runs if r.n_active >= 6)
    seqs = [
        _sequence("normal_run_from_reset", full, model, stats, meta),
        _sequence("three_anchors_only", sparse, model, stats, meta),
        _sequence("all_anchors_dropped_steps_6_to_9", full, model, stats, meta, forced_missing=(6, 10)),
    ]
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps({"schema": "traceline-golden-1.0", "sequences": seqs}, indent=1))
    print("wrote", a.out, [s["run_id"] for s in seqs])


if __name__ == "__main__":
    main()
