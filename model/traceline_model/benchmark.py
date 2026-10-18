"""Python/onnxruntime CPU benchmark of model.onnx (size, cold load, warm latency).

    python -m traceline_model.benchmark

This is NOT a browser measurement. The guide requires Chrome/Edge numbers: open bench.html
in each browser (see README) and record them beside these. Targets (provisional, section 10.3):
size <= 15 MB, median <= 50 ms, P95 <= 100 ms per step.
"""
from __future__ import annotations

import argparse
import json
import platform
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort

from .constants import DT_S
from .standin_data import make_manifest


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="model.onnx")
    ap.add_argument("--out", default="reports/benchmark_python.json")
    ap.add_argument("--steps", type=int, default=2000)
    a = ap.parse_args(argv)
    size = Path(a.model).stat().st_size
    t0 = time.perf_counter()
    sess = ort.InferenceSession(a.model, providers=["CPUExecutionProvider"])
    cold_ms = (time.perf_counter() - t0) * 1000
    H = sess.get_inputs()[4].shape[1]
    rng = np.random.default_rng(0)
    slots = np.zeros((1, 8, 6), np.float32)
    slots[..., 0], slots[..., 1] = rng.uniform(0, 40, 8), rng.uniform(0, 20, 8)
    slots[..., 2], slots[..., 3], slots[..., 4] = rng.uniform(3, 30, 8), rng.uniform(-80, -50, 8), 1
    feeds = {"slots": slots, "prev_pos": np.zeros((1, 2), np.float32), "prev_valid": np.zeros((1, 1), np.float32),
             "dt": np.full((1, 1), DT_S, np.float32), "state": np.zeros((1, H), np.float32)}
    for _ in range(50):
        sess.run(None, feeds)
    lat = []
    for _ in range(a.steps):
        t = time.perf_counter()
        o = sess.run(None, feeds)
        lat.append((time.perf_counter() - t) * 1000)
        feeds["prev_pos"], feeds["state"], feeds["prev_valid"] = o[0], o[6], np.ones((1, 1), np.float32)
    lat = np.array(lat)
    res = {"environment": "python onnxruntime CPU (not a browser)", "platform": platform.platform(),
           "processor": platform.processor() or platform.machine(), "ort_version": ort.__version__,
           "model_size_bytes": size, "cold_session_create_ms": cold_ms, "warm_steps": a.steps,
           "latency_ms": {"median": float(np.median(lat)), "p95": float(np.percentile(lat, 95)), "max": float(lat.max())},
           "targets": {"size_bytes": 15 * 1024 * 1024, "median_ms": 50, "p95_ms": 100},
           "meets_targets": bool(size <= 15 * 1024 * 1024 and np.median(lat) <= 50 and np.percentile(lat, 95) <= 100),
           "manifest": make_manifest({"seed": 0, "model": a.model})}
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(res, indent=1))
    print(json.dumps({k: res[k] for k in ("model_size_bytes", "cold_session_create_ms", "latency_ms", "meets_targets")}, indent=1))


if __name__ == "__main__":
    main()
