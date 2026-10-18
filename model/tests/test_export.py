import json

import numpy as np
import onnxruntime as ort
import pytest
import torch

from traceline_model.constants import DT_S
from traceline_model.export_onnx import export
from traceline_model.nn_model import INPUT_NAMES, OUTPUT_NAMES
from traceline_model.train import load_model, train


@pytest.fixture(scope="module")
def exported(tiny_data, tmp_path_factory):
    out = tmp_path_factory.mktemp("models")
    cfg = out / "cfg.json"
    cfg.write_text(json.dumps({"name": "default", "iters": 4, "batch": 4, "chunk": 8}))
    mdir = train(str(cfg), str(tiny_data / "train"), str(tiny_data / "dev"), str(out), seed=0, quiet=True)
    meta = export(str(mdir), str(out / "export"), str(out / "reports"), str(tiny_data / "dev"))
    return mdir, meta


def test_parity_python_vs_onnx(exported):
    _, meta = exported
    assert meta["export_parity"]["max_abs_diff_python_vs_onnx"] < 1e-4
    assert meta["onnx_opset"] == 17 and meta["model_size_bytes"] < 15 * 1024 * 1024
    assert meta["state"]["shape"] == [1, 64] and "zeros" in meta["state"]["reset"]


def test_meta_contract_fields(exported):
    _, meta = exported
    for k in ("normalization", "slot_features", "max_anchor_slots", "enable_crowd_input", "sigma_semantics", "explain_thresholds"):
        assert k in meta
    assert meta["enable_crowd_input"] is False and meta["normalization"]["source"].startswith("train split only")


def test_onnx_dynamic_batch_and_repeated_calls(exported):
    mdir, _ = exported
    sess = ort.InferenceSession(str(mdir / "model.onnx"), providers=["CPUExecutionProvider"])
    model, stats = load_model(mdir)
    rng = np.random.default_rng(0)
    for B in (1, 3, 5):
        slots = np.zeros((B, 8, 6), np.float32)
        slots[..., 0] = rng.uniform(0, 40, (B, 8)); slots[..., 1] = rng.uniform(0, 20, (B, 8))
        slots[..., 2] = rng.uniform(2, 30, (B, 8)); slots[..., 3] = rng.uniform(-80, -50, (B, 8)); slots[..., 4] = 1
        feeds = {"slots": slots, "prev_pos": np.zeros((B, 2), np.float32), "prev_valid": np.zeros((B, 1), np.float32),
                 "dt": np.full((B, 1), DT_S, np.float32), "state": np.zeros((B, 64), np.float32)}
        first = sess.run(OUTPUT_NAMES, feeds)
        for _ in range(5):  # repeated calls are deterministic
            again = sess.run(OUTPUT_NAMES, feeds)
            assert all(np.array_equal(a, b) for a, b in zip(first, again))
        with torch.no_grad():
            ref = model(*[torch.from_numpy(feeds[n]) for n in INPUT_NAMES])
        assert np.abs(first[0] - ref["position"].numpy()).max() < 1e-4


def test_state_reset_semantics(exported):
    mdir, _ = exported
    sess = ort.InferenceSession(str(mdir / "model.onnx"), providers=["CPUExecutionProvider"])
    slots = np.zeros((1, 8, 6), np.float32)
    slots[0, :5, 0] = [1, 30, 5, 25, 15]; slots[0, :5, 1] = [1, 2, 15, 16, 8]; slots[0, :5, 2] = 10; slots[0, :5, 3] = -60; slots[0, :5, 4] = 1
    f = {"slots": slots, "prev_pos": np.zeros((1, 2), np.float32), "prev_valid": np.zeros((1, 1), np.float32),
         "dt": np.full((1, 1), DT_S, np.float32), "state": np.zeros((1, 64), np.float32)}
    a = sess.run(OUTPUT_NAMES, f)
    f2 = {**f, "prev_pos": a[0], "prev_valid": np.ones((1, 1), np.float32), "state": a[6]}
    sess.run(OUTPUT_NAMES, f2)
    b = sess.run(OUTPUT_NAMES, f)  # reset again -> identical to the first call
    assert np.array_equal(a[0], b[0])
