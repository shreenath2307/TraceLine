"""Classical baselines B1, B2, B3 (guide section 10.1).

B1  weighted least-squares trilateration (Gauss-Newton, weights 1/sigma_range^2)
B2  B1 + residual-based rejection of suspect anchors
B3  B2 followed by an extended Kalman filter (constant velocity, 4-state)

All three receive exactly the readings the neural model receives (valid mask included).
With fewer than 3 valid ranges a step cannot be solved: B1/B2 hold the last estimate and
B3 predicts forward; before any estimate exists they output the centroid of the anchors.
Tune parameters on train/dev only (tune_b2, tune_b3).
"""
from __future__ import annotations

import numpy as np

from .constants import DT_S, range_sigma
from .loader import Run


def wls_position(anchors: np.ndarray, ranges: np.ndarray, x0: np.ndarray | None = None,
                 iters: int = 20) -> tuple[np.ndarray, np.ndarray]:
    """Weighted LS trilateration. Returns (position, standardised residuals).

    anchors (n,2), ranges (n,), n >= 3. Weights are 1 / range_sigma(range)^2.
    """
    sig = range_sigma(ranges)
    w = 1.0 / sig**2
    p = anchors.mean(0) if x0 is None else np.array(x0, float)
    lam = 1e-3
    for _ in range(iters):
        diff = p - anchors
        d = np.maximum(np.linalg.norm(diff, axis=1), 1e-6)
        J = diff / d[:, None]
        res = ranges - d
        JW = J * w[:, None]
        H = J.T @ JW + lam * np.eye(2)
        g = JW.T @ res
        step = np.linalg.solve(H, g)
        # damped step: cap length so a bad start cannot fly off
        n = np.linalg.norm(step)
        if n > 10.0:
            step *= 10.0 / n
        p = p + step
        if np.linalg.norm(step) < 1e-4:
            break
    d = np.linalg.norm(p - anchors, axis=1)
    return p, (ranges - d) / sig


def _chi2_dof(z: np.ndarray, n: int) -> float:
    return float((z**2).sum() / max(n - 2, 1))


def b2_position(anchors: np.ndarray, ranges: np.ndarray, x0: np.ndarray | None, thr: float) -> tuple[np.ndarray, np.ndarray]:
    """B1 with iterative leave-one-out rejection while chi2/dof > thr (keeps >= 3 anchors).

    Returns (position, kept_mask).
    """
    keep = np.ones(len(ranges), bool)
    p, z = wls_position(anchors, ranges, x0)
    while keep.sum() >= 4 and _chi2_dof(z, int(keep.sum())) > thr:
        idx = np.flatnonzero(keep)
        best = None
        for j in idx:
            k2 = keep.copy()
            k2[j] = False
            pj, zj = wls_position(anchors[k2], ranges[k2], p)
            c = _chi2_dof(zj, int(k2.sum()))
            if best is None or c < best[0]:
                best = (c, j, pj, zj)
        keep[best[1]] = False
        p, z = best[2], best[3]
    return p, keep


def run_b1(run: Run) -> dict:
    return _run_wls(run, reject=False, thr=None)


def run_b2(run: Run, thr: float = 3.0) -> dict:
    return _run_wls(run, reject=True, thr=thr)


def _run_wls(run: Run, reject: bool, thr: float | None) -> dict:
    T = run.n_steps
    v = run.valid
    pos = np.zeros((T, 2))
    fresh = np.zeros(T, bool)
    kept = np.zeros_like(v)
    last = run.anchor_xy.mean(0)
    for t in range(T):
        idx = np.flatnonzero(v[t])
        if len(idx) >= 3:
            a, r = run.anchor_xy[idx], run.range_m[t, idx]
            if reject:
                p, k = b2_position(a, r, last, thr)
                kept[t, idx[k]] = True
            else:
                p, _ = wls_position(a, r, last)
                kept[t, idx] = True
            last = p
            fresh[t] = True
        pos[t] = last
    return {"pos": pos, "fresh": fresh, "kept": kept}


def run_ekf(meas_pos: np.ndarray, fresh: np.ndarray, q: float = 0.3, r_sigma: float = 1.0,
            damp: float = 0.95, dt: float = DT_S) -> dict:
    """Constant-velocity EKF over position fixes (linear here, so it is a plain KF).

    State [x, y, vx, vy]; q = acceleration noise (m/s^2); r_sigma = fix noise (m).
    Fixes with a large normalised innovation get an inflated noise (soft outlier gate).
    Steps without a fix only predict; velocity is damped so dead reckoning does not run away.
    """
    T = len(meas_pos)
    F = np.array([[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, damp, 0], [0, 0, 0, damp]], float)
    G = np.array([[dt**2 / 2, 0], [0, dt**2 / 2], [dt, 0], [0, dt]], float)
    Q = (q**2) * G @ G.T
    H = np.array([[1, 0, 0, 0], [0, 1, 0, 0]], float)
    out = np.zeros((T, 2))
    var = np.zeros(T)
    x = None
    P = None
    for t in range(T):
        if x is None:
            if fresh[t]:
                x = np.array([meas_pos[t, 0], meas_pos[t, 1], 0.0, 0.0])
                P = np.diag([r_sigma**2, r_sigma**2, 1.0, 1.0])
            else:
                out[t] = meas_pos[t]
                var[t] = np.inf
                continue
        else:
            x = F @ x
            P = F @ P @ F.T + Q
            if fresh[t]:
                R = np.eye(2) * r_sigma**2
                innov = meas_pos[t] - H @ x
                S = H @ P @ H.T + R
                nis = float(innov @ np.linalg.solve(S, innov))
                if nis > 9.21:  # 99% gate for 2 dof: inflate rather than reject
                    R = R * (nis / 9.21)
                    S = H @ P @ H.T + R
                K = P @ H.T @ np.linalg.inv(S)
                x = x + K @ innov
                P = (np.eye(4) - K @ H) @ P
        out[t] = x[:2]
        var[t] = float(np.trace(P[:2, :2]) / 2)
    return {"pos": out, "var": var}


def run_b3(run: Run, thr: float = 3.0, q: float = 0.3, r_sigma: float = 1.0, b2: dict | None = None) -> dict:
    b2 = b2 or run_b2(run, thr)
    ekf = run_ekf(b2["pos"], b2["fresh"], q=q, r_sigma=r_sigma)
    return {"pos": ekf["pos"], "var": ekf["var"], "fresh": b2["fresh"]}


def _mean_error(pos: np.ndarray, truth: np.ndarray) -> float:
    return float(np.linalg.norm(pos - truth, axis=1).mean())


def tune_b2(runs: list[Run], grid=(1.5, 2.0, 3.0, 5.0, 8.0)) -> float:
    """Pick the rejection threshold with the lowest mean error on the given (train) runs."""
    scores = {thr: np.mean([_mean_error(run_b2(r, thr)["pos"], r.truth) for r in runs]) for thr in grid}
    return min(scores, key=scores.get)


def tune_b3(runs: list[Run], thr: float, q_grid=(0.05, 0.15, 0.3, 0.6, 1.0), r_grid=(0.5, 1.0, 2.0)) -> tuple[float, float]:
    b2s = [run_b2(r, thr) for r in runs]
    best, best_s = None, np.inf
    for q in q_grid:
        for rs in r_grid:
            s = np.mean([_mean_error(run_ekf(b["pos"], b["fresh"], q=q, r_sigma=rs)["pos"], r.truth) for r, b in zip(runs, b2s)])
            if s < best_s:
                best, best_s = (q, rs), s
    return best
