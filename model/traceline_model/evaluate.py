"""Baseline vs neural comparison, ablations, calibration, NLOS, forecast and dropout studies.

    python -m traceline_model.evaluate

Uses train (to tune the classical baselines) and dev (to report). It never touches the final
hidden set. Everything is deterministic given the data and the seed. Member C re-scores
the headline numbers independently; these are Workstream B's development-set numbers.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from .baselines import run_b1, run_b2, run_b3, tune_b2, tune_b3
from .loader import Run, load_dataset
from .metrics import best_f1_threshold, error_stats, gaussian_coverage, nlos_prf, sigma_bins, track_level
from .rollout import rollout
from .standin_data import make_manifest
from .train import load_model


def truncate(run: Run, n: int) -> Run:
    r = Run(**{**run.__dict__})
    r.range_m, r.rssi_dbm = run.range_m[:n], run.rssi_dbm[:n]
    r.truth = None if run.truth is None else run.truth[:n]
    r.nlos = None if run.nlos is None else run.nlos[:n]
    r.bias_m = None if run.bias_m is None else run.bias_m[:n]
    r.crowd_path = None if run.crowd_path is None else run.crowd_path[:n]
    return r


def nn_errors(res: dict, runs: list[Run]) -> list[np.ndarray]:
    return [np.linalg.norm(res["position"][i, :n] - r.truth, axis=1) for i, (r, n) in enumerate(zip(runs, res["lens"]))]


def slice_table(err_runs: dict[str, list[np.ndarray]], runs: list[Run]) -> dict:
    """Overall / by venue / active anchors / NLOS presence / <3 valid anchors."""
    flat = {m: np.concatenate(e) for m, e in err_runs.items()}
    venue = np.concatenate([[r.venue_id] * r.n_steps for r in runs])
    nact = np.concatenate([[r.n_active] * r.n_steps for r in runs])
    nlos_present = np.concatenate([((r.nlos > 0.5) & r.valid).any(1) for r in runs])
    few = np.concatenate([r.valid.sum(1) < 3 for r in runs])
    out = {"overall": {m: error_stats(e) for m, e in flat.items()},
           "track_level": {m: track_level(err_runs[m]) for m in err_runs}}
    def by(name, keys):
        out[name] = {str(k): {m: error_stats(e[keys == k]) for m, e in flat.items()} for k in np.unique(keys)}
    by("by_venue", venue)
    by("by_active_anchors", nact)
    by("by_nlos_present", nlos_present)
    by("by_fewer_than_3_valid", few)
    return out


def dropout_study(models: dict, runs: list[Run], b_params: dict, seed: int = 7, Ls=range(1, 11)) -> dict:
    """Force all anchors to drop for L consecutive steps and measure the error during the outage.

    Methods: hold_last (B2 estimate frozen), ekf_b3 (B3 predict-only), nn_state (neural model
    carrying its recurrent state), nn_forecast (neural forecast head extrapolating from the last
    good step). Reported: error at the last outage step and mean over the outage.
    """
    rng = np.random.default_rng(seed)
    result = {}
    for L in Ls:
        cuts = [int(rng.integers(40, r.n_steps - L - 5)) for r in runs]
        mods = []
        for r, s in zip(runs, cuts):
            valid = r.valid.copy()
            valid[s : s + L] = False
            mods.append(truncate(r.copy_with_valid(valid), s + L))
        rec: dict[str, list[float]] = {}
        def add(name, last, mean):
            rec.setdefault(name + "_last", []).append(last)
            rec.setdefault(name + "_mean", []).append(mean)
        for r, m, s in zip(runs, mods, cuts):
            tr = r.truth[s : s + L]
            b2 = run_b2(m, b_params["b2_thr"])
            e = np.linalg.norm(b2["pos"][s : s + L] - tr, axis=1)
            add("hold_last", e[-1], e.mean())
            b3 = run_b3(m, b_params["b2_thr"], b_params["q"], b_params["r_sigma"], b2=b2)
            e = np.linalg.norm(b3["pos"][s : s + L] - tr, axis=1)
            add("ekf_b3", e[-1], e.mean())
        for name, (model, stats) in models.items():
            res = rollout(model, mods, stats)
            for i, (r, s) in enumerate(zip(runs, cuts)):
                tr = r.truth[s : s + L]
                e = np.linalg.norm(res["position"][i, s : s + L] - tr, axis=1)
                add(f"nn_state[{name}]", e[-1], e.mean())
                if name == "default" and model.cfg["use_prediction"]:
                    fc = res["forecast"][i, s - 1, :L]  # made at the last good step
                    e = np.linalg.norm(fc - tr, axis=1)
                    add("nn_forecast", e[-1], e.mean())
        result[str(L)] = {k: float(np.mean(v)) for k, v in rec.items()}
    return result


def forecast_by_horizon(res: dict, runs: list[Run], K: int) -> list[dict]:
    out = []
    for h in range(1, K + 1):
        e_fc, e_hold = [], []
        for i, r in enumerate(runs):
            n = int(res["lens"][i])
            if n - h <= 0:
                continue
            e_fc.append(np.linalg.norm(res["forecast"][i, : n - h, h - 1] - r.truth[h:n], axis=1))
            e_hold.append(np.linalg.norm(res["position"][i, : n - h] - r.truth[h:n], axis=1))
        out.append({"horizon_steps": h, "horizon_s": 0.5 * h, "forecast_mean_err_m": float(np.concatenate(e_fc).mean()),
                    "hold_position_mean_err_m": float(np.concatenate(e_hold).mean())})
    return out


def evaluate(train_dir="data/standin/train", dev_dir="data/standin/dev", models_dir="models", out_dir="reports", seed=0):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    train_runs = load_dataset(train_dir)
    dev_runs = load_dataset(dev_dir)

    # --- tune classical baselines on a train subset only
    sub = train_runs[::3]
    thr = tune_b2(sub)
    q, rs = tune_b3(sub, thr)
    b_params = {"b2_thr": thr, "q": q, "r_sigma": rs, "tuned_on": f"{len(sub)} train runs"}
    print("baseline params", b_params, flush=True)

    errs: dict[str, list[np.ndarray]] = {"B1": [], "B2": [], "B3": []}
    for r in dev_runs:
        errs["B1"].append(np.linalg.norm(run_b1(r)["pos"] - r.truth, axis=1))
        b2 = run_b2(r, thr)
        errs["B2"].append(np.linalg.norm(b2["pos"] - r.truth, axis=1))
        errs["B3"].append(np.linalg.norm(run_b3(r, thr, q, rs, b2=b2)["pos"] - r.truth, axis=1))

    models = {}
    for d in sorted(Path(models_dir).glob("*/model.pt")):
        m, st = load_model(d.parent)
        models[m.cfg["name"]] = (m, st)
    if "default" not in models:
        raise SystemExit("train the default model first (make train)")

    results: dict = {"baseline_params": b_params, "dev_runs": len(dev_runs), "dev_steps": int(sum(r.n_steps for r in dev_runs)),
                     "note": "stand-in SYNTHETIC data, development split; not the hidden set"}
    rolls = {}
    for name, (m, st) in models.items():
        rolls[name] = rollout(m, dev_runs, st)
    errs["Traceline"] = nn_errors(rolls["default"], dev_runs)
    results["accuracy"] = slice_table(errs, dev_runs)

    # --- ablations (overall dev numbers; all models share the same data and seed policy)
    abl = {}
    for name, res in rolls.items():
        e = np.concatenate(nn_errors(res, dev_runs))
        abl[name] = error_stats(e)
        abl[name]["config"] = {k: models[name][0].cfg[k] for k in ("use_nlos", "use_temporal", "use_crowd", "use_prediction")}
    results["ablations"] = abl

    # --- NLOS classification: threshold on even runs, reported on odd runs
    default = rolls["default"]
    pr = [default["nlos_prob"][i, :n, : r.n_active] for i, (r, n) in enumerate(zip(dev_runs, default["lens"]))]
    sel = [i for i in range(len(dev_runs)) if i % 2 == 0]
    rep = [i for i in range(len(dev_runs)) if i % 2 == 1]
    cat = lambda idx, f: np.concatenate([f(i).ravel() for i in idx])
    thr_nlos = best_f1_threshold(cat(sel, lambda i: pr[i]), cat(sel, lambda i: dev_runs[i].nlos), cat(sel, lambda i: dev_runs[i].valid))
    results["nlos"] = nlos_prf(cat(rep, lambda i: pr[i]), cat(rep, lambda i: dev_runs[i].nlos), cat(rep, lambda i: dev_runs[i].valid), thr_nlos)
    results["nlos"]["threshold_selected_on"] = "even-indexed dev runs; reported on odd-indexed dev runs"
    base_rate = float(np.concatenate([dev_runs[i].nlos[dev_runs[i].valid] for i in rep]).mean())
    results["nlos"]["positive_rate_in_reported_runs"] = base_rate

    # --- uncertainty calibration
    err = np.concatenate(errs["Traceline"])
    sig = np.concatenate([default["sigma"][i, :n, 0] for i, n in enumerate(default["lens"])])
    results["calibration"] = {"coverage": gaussian_coverage(err, sig), "bins": sigma_bins(err, sig),
                              "sigma_semantics": "per-axis std of an isotropic Gaussian; nominal coverage 1-exp(-k^2/2)"}
    flat_sel_sigma = np.concatenate([default["sigma"][i, :default["lens"][i], 0] for i in sel])
    results["thresholds"] = {"nlos_threshold": thr_nlos, "weight_threshold": 0.2,
                             "sigma_high_m": float(np.percentile(flat_sel_sigma, 90))}
    (out / "thresholds.json").write_text(json.dumps(results["thresholds"], indent=1))

    # --- forecast by horizon and dropout study
    K = models["default"][0].cfg["horizon"]
    results["forecast_by_horizon"] = forecast_by_horizon(default, dev_runs, K)
    print("dropout study ...", flush=True)
    results["dropout"] = dropout_study(models, dev_runs, b_params)

    (out / "results.json").write_text(json.dumps(results, indent=1))
    (out / "manifest.json").write_text(json.dumps(make_manifest({"seed": seed, "train_dir": train_dir, "dev_dir": dev_dir,
                                                               "models": sorted(models)}), indent=1))
    make_plots(results, errs, out)
    write_summary(results, out)
    return results


def make_plots(results, errs, out: Path):
    fig, ax = plt.subplots(figsize=(6, 4))
    for m, e in errs.items():
        x = np.sort(np.concatenate(e))
        ax.plot(x, np.arange(1, len(x) + 1) / len(x), label=m)
    ax.set_xlabel("position error (m)"); ax.set_ylabel("cumulative fraction"); ax.set_xlim(0, 10); ax.grid(alpha=.3)
    ax.set_title("Dev set (synthetic): error CDF"); ax.legend(); fig.tight_layout(); fig.savefig(out / "error_cdf.png", dpi=130); plt.close(fig)

    b = results["calibration"]["bins"]
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.plot([x["sigma_mean"] for x in b], [x["error_mean"] for x in b], "o-", label="observed mean error")
    ax.plot([x["sigma_mean"] for x in b], [x["expected_mean_error"] for x in b], "k--", label="expected if calibrated")
    ax.set_xlabel("predicted sigma (m)"); ax.set_ylabel("mean position error (m)"); ax.grid(alpha=.3); ax.legend()
    ax.set_title("Uncertainty calibration (dev, synthetic)"); fig.tight_layout(); fig.savefig(out / "calibration.png", dpi=130); plt.close(fig)

    d = results["dropout"]
    Ls = sorted(int(k) for k in d)
    fig, ax = plt.subplots(figsize=(6, 4))
    for key, lab in [("hold_last_last", "hold last (no prediction)"), ("ekf_b3_last", "B3 EKF predict"),
                     ("nn_state[default]_last", "neural, state only"), ("nn_forecast_last", "neural forecast head")]:
        if key in d[str(Ls[0])]:
            ax.plot(Ls, [d[str(L)][key] for L in Ls], "o-", label=lab)
    ax.set_xlabel("consecutive dropped steps (0.5 s each)"); ax.set_ylabel("error at end of outage (m)"); ax.grid(alpha=.3)
    ax.legend(); ax.set_title("Error vs dropout length (dev, synthetic)"); fig.tight_layout(); fig.savefig(out / "dropout.png", dpi=130); plt.close(fig)


def write_summary(r: dict, out: Path):
    acc = r["accuracy"]["overall"]
    lines = ["# Workstream B dev-set results (SYNTHETIC stand-in data)", "",
             f"{r['dev_runs']} dev runs, {r['dev_steps']} steps. Baselines tuned on train only: {r['baseline_params']}.", "",
             "## Position error (m)", "", "| Method | median | mean | RMSE | P90 | P95 |", "|---|---|---|---|---|---|"]
    for m, s in acc.items():
        lines.append(f"| {m} | {s['median']:.2f} | {s['mean']:.2f} | {s['rmse']:.2f} | {s['p90']:.2f} | {s['p95']:.2f} |")
    for key, title in [("by_active_anchors", "Active anchors"), ("by_venue", "Venue"), ("by_nlos_present", "NLOS reading present"),
                       ("by_fewer_than_3_valid", "Fewer than 3 valid anchors")]:
        lines += ["", f"## Median / P90 error by {title}", "", "| Slice | " + " | ".join(acc) + " |", "|---|" + "---|" * len(acc)]
        for k, v in r["accuracy"][key].items():
            lines.append(f"| {k} | " + " | ".join(f"{v[m]['median']:.2f} / {v[m]['p90']:.2f}" for m in acc) + " |")
    n = r["nlos"]
    lines += ["", "## NLOS detection", "", f"threshold {n['threshold']:.2f}: precision {n['precision']:.3f}, recall {n['recall']:.3f}, "
              f"F1 {n['f1']:.3f} (positive rate {n['positive_rate_in_reported_runs']:.2f}); confusion {n['confusion']}"]
    lines += ["", "## Ablations (dev mean / median / P90, m)", "", "| Model | mean | median | P90 |", "|---|---|---|---|"]
    for k, v in r["ablations"].items():
        lines.append(f"| {k} | {v['mean']:.2f} | {v['median']:.2f} | {v['p90']:.2f} |")
    lines += ["", "## Calibration", ""] + [f"- within {c['k']:.0f} sigma: observed {c['empirical']:.3f} vs nominal {c['nominal']:.3f}" for c in r["calibration"]["coverage"]]
    lines += ["", "## Forecast error by horizon (m)", "", "| steps | forecast | hold position |", "|---|---|---|"]
    for f in r["forecast_by_horizon"]:
        lines.append(f"| {f['horizon_steps']} | {f['forecast_mean_err_m']:.2f} | {f['hold_position_mean_err_m']:.2f} |")
    lines += ["", "## Error at end of an all-anchor dropout (m)", "", "| dropped steps | hold last | B3 EKF | neural (state) | neural (forecast) |", "|---|---|---|---|---|"]
    for L in sorted(int(k) for k in r["dropout"]):
        d = r["dropout"][str(L)]
        lines.append(f"| {L} | {d['hold_last_last']:.2f} | {d['ekf_b3_last']:.2f} | {d['nn_state[default]_last']:.2f} | {d.get('nn_forecast_last', float('nan')):.2f} |")
    (out / "summary.md").write_text("\n".join(lines) + "\n")


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--train", default="data/standin/train")
    ap.add_argument("--dev", default="data/standin/dev")
    ap.add_argument("--models", default="models")
    ap.add_argument("--out", default="reports")
    a = ap.parse_args(argv)
    evaluate(a.train, a.dev, a.models, a.out)


if __name__ == "__main__":
    main()
