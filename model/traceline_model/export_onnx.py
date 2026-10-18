"""Export the trained model to ONNX (opset 17) and write model_meta.json.

    python -m traceline_model.export_onnx --model-dir models/default

Verifies Python-vs-ONNX parity on a full recurrent rollout before declaring success.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch

from .constants import DT_S, HORIZON, MAX_ANCHORS, SLOT_FEATURES
from .explain import DEFAULT_THRESHOLDS
from .loader import load_dataset, slots_array
from .nn_model import INPUT_NAMES, OUTPUT_NAMES, OnnxStep
from .train import load_model

SIGMA_SEMANTICS = ("sigma_m is the per-axis standard deviation of an isotropic 2-D Gaussian trained with "
                   "Gaussian NLL. Radial error is then roughly Rayleigh(sigma); nominal P(error <= k*sigma) = "
                   "1-exp(-k^2/2). It is only as good as the calibration reported in MODEL_CARD.md.")


def build_meta(model, stats: dict, thresholds: dict, model_dir: Path) -> dict:
    cfg = model.cfg
    return {
        "schema_version": "1.0",
        "model_name": cfg["name"],
        "onnx_opset": 17,
        "max_anchor_slots": MAX_ANCHORS,
        "slot_features": SLOT_FEATURES,
        "slot_order": "sorted by anchor_id, padded to 8 with valid_flag 0",
        "enable_crowd_input": bool(cfg["use_crowd"]),
        "dt_s": DT_S,
        "horizon_steps": cfg["horizon"],
        "inputs": {"slots": [1, MAX_ANCHORS, 6], "prev_pos": [1, 2], "prev_valid": [1, 1], "dt": [1, 1],
                   "state": [1, cfg["hidden"]]},
        "outputs": OUTPUT_NAMES,
        "input_names": INPUT_NAMES,
        "state": {"shape": [1, cfg["hidden"]],
                  "reset": "At the start of every run set state to zeros and previous_position_valid to 0."},
        "normalization": {**stats, "source": "train split only (applied inside the ONNX graph)"},
        "invalid_slot_fill": "train mean (neutral); valid_flag=0 is authoritative",
        "units": {"position": "m", "sigma": "m", "range": "m", "rssi": "dBm", "dt": "s"},
        "sigma_semantics": SIGMA_SEMANTICS,
        "confidence_definition": "confidence = 1 / (1 + sigma_m). A monotone transform of sigma, NOT a probability.",
        "explain_thresholds": thresholds,
        "model_config": cfg,
    }


def export(model_dir: str, out_dir: str = ".", reports_dir: str = "reports", dev_dir: str = "data/standin/dev") -> dict:
    model_dir = Path(model_dir)
    out_dir = Path(out_dir)
    model, stats = load_model(model_dir)
    thr = dict(DEFAULT_THRESHOLDS)
    tp = Path(reports_dir) / "thresholds.json"
    if tp.exists() and model.cfg["name"] == "default":
        thr.update(json.loads(tp.read_text()))
    wrapper = OnnxStep(model).eval()
    H = model.state_size
    dummy = (torch.zeros(1, MAX_ANCHORS, 6), torch.zeros(1, 2), torch.zeros(1, 1), torch.full((1, 1), DT_S), torch.zeros(1, H))
    dummy[0][..., 2] = 10.0
    dummy[0][..., 3] = -60.0
    dummy[0][..., 4] = 1.0
    onnx_path = model_dir / "model.onnx"
    torch.onnx.export(
        wrapper, dummy, str(onnx_path), input_names=INPUT_NAMES, output_names=OUTPUT_NAMES, opset_version=17,
        dynamic_axes={n: {0: "batch"} for n in INPUT_NAMES + OUTPUT_NAMES}, do_constant_folding=True, dynamo=False,
    )
    onnx.checker.check_model(onnx.load(str(onnx_path)))

    # parity: full recurrent rollout over a dev run, torch vs onnxruntime
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    run = load_dataset(dev_dir)[0]
    sl = torch.from_numpy(slots_array(run, stats, use_crowd_values=model.cfg["use_crowd"]))
    prev, pv, h = torch.zeros(1, 2), torch.zeros(1, 1), torch.zeros(1, H)
    maxdiff = 0.0
    for t in range(min(run.n_steps, 120)):
        with torch.no_grad():
            o = model(sl[t : t + 1], prev, pv, torch.full((1, 1), DT_S), h)
        feeds = {"slots": sl[t : t + 1].numpy(), "prev_pos": prev.numpy(), "prev_valid": pv.numpy(),
                 "dt": np.full((1, 1), DT_S, np.float32), "state": h.numpy()}
        outs = dict(zip(OUTPUT_NAMES, sess.run(OUTPUT_NAMES, feeds)))
        for k in OUTPUT_NAMES:
            maxdiff = max(maxdiff, float(np.abs(outs[k] - o[k].numpy()).max()))
        prev, pv, h = o["position"], torch.ones(1, 1), o["state_out"]
    meta = build_meta(model, stats, thr, model_dir)
    meta["export_parity"] = {"max_abs_diff_python_vs_onnx": maxdiff, "steps_checked": min(run.n_steps, 120),
                             "tolerance": 1e-3}
    meta["model_size_bytes"] = onnx_path.stat().st_size
    (model_dir / "model_meta.json").write_text(json.dumps(meta, indent=1))
    if model.cfg["name"] == "default":
        out_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy(onnx_path, out_dir / "model.onnx")
        (out_dir / "model_meta.json").write_text(json.dumps(meta, indent=1))
    print(f"exported {onnx_path} ({meta['model_size_bytes']} bytes); max |python-onnx| = {maxdiff:.2e}")
    if maxdiff > 1e-3:
        raise SystemExit("ONNX parity check FAILED (> 1e-3)")
    return meta


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default="models/default")
    ap.add_argument("--out", default=".")
    ap.add_argument("--reports", default="reports")
    a = ap.parse_args(argv)
    export(a.model_dir, a.out, a.reports)


if __name__ == "__main__":
    main()
