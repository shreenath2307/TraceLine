import numpy as np
import pandas as pd

from traceline_model.loader import compute_norm_stats, load_dataset, slots_array
from traceline_model.standin_data import write_split


def test_contract_columns_and_missing_semantics(tiny_data):
    m = pd.read_csv(tiny_data / "train" / "measurements.csv")
    assert list(m.columns) == ["run_id", "t", "anchor_id", "range_m", "rssi_dbm"]
    raw = (tiny_data / "train" / "measurements.csv").read_text()
    assert "NaN" not in raw and "-1.0" not in raw.split("\n", 1)[1][:0]  # blank cells, never a text/number code
    assert m.range_m.isna().any(), "stand-in data must contain missing readings"
    assert "\r" not in raw
    assert m.run_id.str.match(r"^(hospital|warehouse|office)-train-\d{4}$").all()


def test_loader_shapes_and_valid_mask(tiny_data):
    runs = load_dataset(tiny_data / "train")
    assert len(runs) == 3
    for r in runs:
        assert r.range_m.shape == (r.n_steps, r.n_active) and r.truth.shape == (r.n_steps, 2)
        assert 3 <= r.n_active <= 8
        assert list(r.anchor_ids) == sorted(r.anchor_ids)
        assert (r.valid == (np.isfinite(r.range_m) & np.isfinite(r.rssi_dbm))).all()


def test_slots_pad_and_invalid_are_neutral(tiny_data):
    runs = load_dataset(tiny_data / "train")
    st = compute_norm_stats(runs)
    r = next(x for x in runs if x.n_active < 8)
    s = slots_array(r, st)
    assert s.shape == (r.n_steps, 8, 6)
    assert (s[:, r.n_active :, 4] == 0).all()  # padded slots invalid
    inv = s[..., 4] == 0
    assert np.allclose(s[..., 2][inv], st["range"]["mean"], atol=1e-3)  # neutral value, not -1/0/999
    assert not np.isin(s[..., 2], [-1.0, 999.0]).any()


def test_inference_inputs_never_use_truth_or_labels(tiny_data):
    runs = load_dataset(tiny_data / "train")
    st = compute_norm_stats(runs)
    r = runs[0]
    a = slots_array(r, st)
    r.truth = r.truth + 100.0
    r.nlos = 1 - r.nlos
    r.bias_m = r.bias_m + 5.0
    b = slots_array(r, st)
    assert np.array_equal(a, b)


def test_same_seed_reproduces_exactly(tmp_path):
    write_split(tmp_path / "a", "train", 1, 1000)
    write_split(tmp_path / "b", "train", 1, 1000)
    for f in ("measurements.csv", "truth.csv", "labels_nlos.csv", "crowd.csv"):
        assert (tmp_path / "a" / f).read_bytes() == (tmp_path / "b" / f).read_bytes()


def test_physical_sanity(tiny_data):
    for r in load_dataset(tiny_data / "train"):
        v = r.valid
        assert (r.range_m[v] >= 0).all() and np.isfinite(r.rssi_dbm[v]).all()
        assert (r.truth[:, 0] >= 0).all() and (r.truth[:, 0] <= r.width_m).all()
        assert (r.truth[:, 1] >= 0).all() and (r.truth[:, 1] <= r.height_m).all()
        # speeds stay below the forklift maximum (3.0 m/s) + tolerance
        assert (np.linalg.norm(np.diff(r.truth, axis=0), axis=1) / 0.5).max() <= 3.2
