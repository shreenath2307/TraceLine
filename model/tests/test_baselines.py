import numpy as np

from traceline_model.baselines import b2_position, run_b1, run_b2, run_b3, run_ekf, wls_position
from traceline_model.loader import load_dataset

A = np.array([[0, 0], [10, 0], [0, 10], [10, 10.0]])


def test_b1_exact_ranges():
    p = np.array([3.0, 4.0])
    est, z = wls_position(A, np.linalg.norm(A - p, axis=1))
    assert np.allclose(est, p, atol=1e-3) and np.abs(z).max() < 1e-2


def test_b2_rejects_one_biased_anchor():
    p = np.array([3.0, 4.0])
    r = np.linalg.norm(A - p, axis=1)
    r[1] += 3.0
    e1 = np.linalg.norm(wls_position(A, r)[0] - p)
    est, keep = b2_position(A, r, None, thr=3.0)
    assert not keep[1] and keep.sum() == 3
    assert np.linalg.norm(est - p) < e1 and np.linalg.norm(est - p) < 0.3


def test_b2_never_drops_below_three():
    p = np.array([3.0, 4.0])
    r = np.linalg.norm(A[:3] - p, axis=1)
    r[0] += 3.0
    _, keep = b2_position(A[:3], r, None, thr=1.0)
    assert keep.sum() == 3


def test_ekf_smooths_and_predicts():
    t = np.arange(40) * 0.5
    truth = np.stack([t, 0 * t], 1)
    rng = np.random.default_rng(0)
    meas = truth + rng.normal(0, 1.0, truth.shape)
    fresh = np.ones(40, bool)
    fresh[30:34] = False
    out = run_ekf(meas, fresh, q=0.1, r_sigma=1.0)["pos"]
    assert np.linalg.norm(out[10:30] - truth[10:30], axis=1).mean() < np.linalg.norm(meas[10:30] - truth[10:30], axis=1).mean()
    assert np.isfinite(out).all() and np.linalg.norm(out[33] - truth[33]) < 3.0  # coasted through the gap


def test_runners_on_data_hold_last_without_enough_anchors(tiny_data):
    run = load_dataset(tiny_data / "dev")[0]
    r1, r2, r3 = run_b1(run), run_b2(run), run_b3(run)
    for o in (r1, r2, r3):
        assert o["pos"].shape == (run.n_steps, 2) and np.isfinite(o["pos"]).all()
    few = run.valid.sum(1) < 3
    idx = np.flatnonzero(few & np.r_[False, few[:-1] | True][: len(few)])
    for t in np.flatnonzero(few)[:5]:
        if t > 0:
            assert np.allclose(r1["pos"][t], r1["pos"][t - 1])
    assert (r1["fresh"] == ~few).all()
