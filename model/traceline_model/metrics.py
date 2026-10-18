"""Local metric helpers for Workstream B reports.

Member C owns the official metrics (eval/metrics.py). These exist so B can compare methods
fairly on dev while C's runner is not ready; headline numbers must be re-scored by C.
"""
from __future__ import annotations

import numpy as np


def error_stats(err: np.ndarray) -> dict:
    """Median, mean, RMSE, P90, P95 of per-step Euclidean errors (metres)."""
    err = np.asarray(err, float)
    err = err[np.isfinite(err)]
    if err.size == 0:
        return {"n": 0, "median": None, "mean": None, "rmse": None, "p90": None, "p95": None}
    return {"n": int(err.size), "median": float(np.median(err)), "mean": float(err.mean()),
            "rmse": float(np.sqrt((err**2).mean())), "p90": float(np.percentile(err, 90)),
            "p95": float(np.percentile(err, 95))}


def track_level(per_run_err: list[np.ndarray]) -> dict:
    """Average of per-run statistics so long runs do not dominate silently."""
    means = [np.nanmean(e) for e in per_run_err if len(e)]
    p90s = [np.nanpercentile(e, 90) for e in per_run_err if len(e)]
    return {"mean_of_run_means": float(np.mean(means)), "mean_of_run_p90": float(np.mean(p90s)), "runs": len(means)}


def nlos_prf(prob: np.ndarray, label: np.ndarray, valid: np.ndarray, thr: float) -> dict:
    """Precision / recall / F1 / confusion matrix over valid readings."""
    p = prob[valid] >= thr
    y = label[valid] > 0.5
    tp, fp, fn, tn = int((p & y).sum()), int((p & ~y).sum()), int((~p & y).sum()), int((~p & ~y).sum())
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {"threshold": float(thr), "precision": prec, "recall": rec, "f1": f1,
            "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn}}


def best_f1_threshold(prob: np.ndarray, label: np.ndarray, valid: np.ndarray) -> float:
    best, best_f = 0.5, -1.0
    for thr in np.linspace(0.05, 0.95, 19):
        f = nlos_prf(prob, label, valid, thr)["f1"]
        if f > best_f:
            best, best_f = float(thr), f
    return best


def gaussian_coverage(err: np.ndarray, sigma: np.ndarray, ks=(1.0, 2.0)) -> list[dict]:
    """Empirical coverage of radial error <= k*sigma against the isotropic-2D-Gaussian nominal.

    sigma_m is trained as a per-axis standard deviation, so nominal P(|e| <= k sigma) = 1-exp(-k^2/2).
    """
    out = []
    for k in ks:
        out.append({"k": float(k), "nominal": float(1 - np.exp(-k * k / 2)),
                    "empirical": float((err <= k * sigma).mean())})
    return out


def sigma_bins(err: np.ndarray, sigma: np.ndarray, n_bins: int = 6) -> list[dict]:
    """Mean error per sigma quantile bin; Rayleigh expectation is sigma*sqrt(pi/2)."""
    edges = np.quantile(sigma, np.linspace(0, 1, n_bins + 1))
    out = []
    for i in range(n_bins):
        m = (sigma >= edges[i]) & (sigma <= edges[i + 1] if i == n_bins - 1 else sigma < edges[i + 1])
        if m.sum():
            out.append({"sigma_mean": float(sigma[m].mean()), "error_mean": float(err[m].mean()),
                        "expected_mean_error": float(sigma[m].mean() * np.sqrt(np.pi / 2)), "n": int(m.sum())})
    return out
