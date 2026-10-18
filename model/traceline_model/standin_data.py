"""TEMPORARY stand-in data generator (Workstream B only).

Used until Member A's simulator ships real datasets. It follows the frozen equations of
guide section 8 and writes files exactly to the section 9 contracts, so replacing it with
A's output is a file swap:

    measurements.csv, truth.csv, labels_nlos.csv, crowd.csv, venues/<venue_id>.json

All data is SYNTHETIC. Venues here are rough sketches, NOT the official shared/venues files.
Every run is regenerated exactly from (base seed + run index).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from .constants import DT_S, SIGNAL, load_seeds
from .geometry import los_blocked, path_crowd_density

VENUE_ORDER = ["hospital", "warehouse", "office"]  # 'clinic' is hidden-set only, never built here

SPEEDS = {
    "person": (0.8, 1.5),
    "wheelchair": (0.6, 1.2),
    "stretcher": (0.8, 1.3),
    "forklift": (1.0, 3.0),
}
VENUE_ASSETS = {
    "hospital": ["person", "wheelchair", "stretcher"],
    "warehouse": ["forklift", "person"],
    "office": ["person"],
}


def _wall(wid, x1, y1, x2, y2, material="wall"):
    return {"wall_id": wid, "x1_m": float(x1), "y1_m": float(y1), "x2_m": float(x2), "y2_m": float(y2), "material": material}


def _rect_walls(prefix, x0, y0, x1, y1, material="shelf"):
    return [
        _wall(f"{prefix}_s", x0, y0, x1, y0, material),
        _wall(f"{prefix}_e", x1, y0, x1, y1, material),
        _wall(f"{prefix}_n", x1, y1, x0, y1, material),
        _wall(f"{prefix}_w", x0, y1, x0, y0, material),
    ]


def _rect(x0, y0, x1, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


def _zone(zid, ztype, poly, name=None, base_density=0.0):
    z = {"zone_id": zid, "zone_type": ztype, "polygon": poly}
    if name:
        z["name"] = name
    if base_density:
        z["base_density_people_m2"] = base_density  # stand-in only; real density lives in crowd.csv
    return z


def _anchors(points):
    return [
        {"anchor_id": i, "x_m": float(x), "y_m": float(y), "enabled": True, "anchor_type": "uwb"}
        for i, (x, y) in enumerate(points)
    ]


def build_venues() -> dict[str, dict]:
    """Three rough venue sketches following the contract 9.1 layout."""
    venues: dict[str, dict] = {}

    # ---- hospital 50 x 30: corridor y 10..20, rooms above and below, doors every 10 m
    walls, k = [], 0
    for y in (10.0, 20.0):
        for x0, x1 in [(0, 4), (6, 14), (16, 24), (26, 34), (36, 44), (46, 50)]:
            walls.append(_wall(f"h{k}", x0, y, x1, y, "plasterboard"))
            k += 1
    for x in (10.0, 20.0, 30.0, 40.0):
        walls.append(_wall(f"hv{k}", x, 0, x, 10, "plasterboard")); k += 1
        walls.append(_wall(f"hv{k}", x, 20, x, 30, "plasterboard")); k += 1
    nodes = [(x, 15.0) for x in (2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 48)]
    nodes += [(5 + 10 * i, 5.0) for i in range(5)] + [(5 + 10 * i, 25.0) for i in range(5)]
    venues["hospital"] = {
        "schema_version": "1.0", "venue_id": "hospital", "width_m": 50.0, "height_m": 30.0,
        "anchors": _anchors([(3, 14), (14, 16), (25, 14), (36, 16), (47, 14), (5, 6), (25, 24), (45, 6)]),
        "walls": walls, "obstacles": [],
        "zones": [
            _zone("ward_corridor", "crowd", _rect(18, 12, 32, 18), "Main corridor", 3.0),
            _zone("lobby", "crowd", _rect(0, 12, 8, 18), "Lobby", 2.0),
            _zone("icu", "priority", _rect(40, 20, 50, 30), "ICU"),
        ],
        "metadata": {"standin": True, "note": "TEMPORARY stand-in; not the official venue", "standin_nodes": nodes},
    }

    # ---- warehouse 60 x 30: shelf rows with aisles
    walls = []
    for i, x0 in enumerate((10, 20, 30, 40, 50)):
        walls += _rect_walls(f"shelf{i}", x0, 5, x0 + 2, 25)
    nodes = [(x, y) for x in (5, 15, 25, 35, 45, 56) for y in (2.5, 15.0, 27.5)]
    venues["warehouse"] = {
        "schema_version": "1.0", "venue_id": "warehouse", "width_m": 60.0, "height_m": 30.0,
        "anchors": _anchors([(1, 1), (59, 1), (1, 29), (59, 29), (15, 15), (35, 15), (25, 2.5), (45, 27.5)]),
        "walls": walls, "obstacles": [],
        "zones": [
            _zone("loading_area", "crowd", _rect(0, 0, 8, 8), "Loading area", 2.0),
            _zone("cross_aisle", "crowd", _rect(20, 0, 40, 5), "Cross aisle", 1.5),
        ],
        "metadata": {"standin": True, "note": "TEMPORARY stand-in; not the official venue", "standin_nodes": nodes},
    }

    # ---- office 30 x 20: central corridor, rooms above and below
    walls, k = [], 0
    for y in (7.0, 13.0):
        for x0, x1 in [(0, 4), (6, 14), (16, 24), (26, 30)]:
            walls.append(_wall(f"o{k}", x0, y, x1, y, "plasterboard")); k += 1
    for x in (10.0, 20.0):
        walls.append(_wall(f"ov{k}", x, 0, x, 7, "plasterboard")); k += 1
        walls.append(_wall(f"ov{k}", x, 13, x, 20, "plasterboard")); k += 1
    nodes = [(x, 10.0) for x in (2, 5, 10, 15, 20, 25, 28)]
    nodes += [(x, 3.5) for x in (5, 15, 25)] + [(x, 16.5) for x in (5, 15, 25)]
    venues["office"] = {
        "schema_version": "1.0", "venue_id": "office", "width_m": 30.0, "height_m": 20.0,
        "anchors": _anchors([(1, 10), (29, 10), (15, 10), (5, 4), (25, 4), (5, 16), (25, 16), (15, 3)]),
        "walls": walls, "obstacles": [],
        "zones": [_zone("meeting_corridor", "crowd", _rect(8, 8, 22, 12), "Meeting corridor", 3.0)],
        "metadata": {"standin": True, "note": "TEMPORARY stand-in; not the official venue", "standin_nodes": nodes},
    }
    return venues


def _walls_array(venue: dict) -> np.ndarray:
    return np.array([[w["x1_m"], w["y1_m"], w["x2_m"], w["y2_m"]] for w in venue["walls"]], float).reshape(-1, 4)


def _anchor_xy(venue: dict) -> np.ndarray:
    return np.array([[a["x_m"], a["y_m"]] for a in venue["anchors"]], float)


def _crowd_zones(venue: dict) -> list[dict]:
    return [z for z in venue["zones"] if z["zone_type"] == "crowd"]


def gen_trajectory(venue: dict, rng: np.random.Generator, n_steps: int, asset: str) -> np.ndarray:
    """Waypoint walk along visible node pairs, with turns, stops and dwell periods."""
    nodes = np.array(venue["metadata"]["standin_nodes"], float)
    walls = _walls_array(venue)
    blocked = los_blocked(nodes, nodes, walls)
    dist = np.linalg.norm(nodes[:, None] - nodes[None], axis=-1)
    adj = (~blocked) & (dist > 0.5)
    cur = int(rng.integers(len(nodes)))
    last = -1
    lo, hi = SPEEDS[asset]
    pos = nodes[cur].copy()
    out = np.zeros((n_steps, 2))
    k = 0
    while k < n_steps:
        if rng.random() < 0.35:  # dwell
            for _ in range(int(rng.integers(2, 21))):
                if k >= n_steps:
                    break
                out[k] = pos
                k += 1
            continue
        choices = np.flatnonzero(adj[cur])
        if len(choices) > 1 and last in choices:
            choices = choices[choices != last]
        nxt = int(rng.choice(choices))
        speed = float(rng.uniform(lo, hi))
        vec = nodes[nxt] - pos
        length = float(np.linalg.norm(vec))
        n = max(int(np.ceil(length / (speed * DT_S))), 1)
        for i in range(1, n + 1):
            if k >= n_steps:
                break
            out[k] = pos + vec * (i / n)
            k += 1
        pos = nodes[nxt].copy()
        last, cur = cur, nxt
    return out


def _zone_density(rng: np.random.Generator, zones: list[dict], n_steps: int, scale: float) -> np.ndarray:
    t = np.arange(n_steps) * DT_S
    dens = np.zeros((n_steps, len(zones)))
    for z, zone in enumerate(zones):
        base = zone.get("base_density_people_m2", 1.0) * scale
        period = rng.uniform(60, 120)
        phase = rng.uniform(0, 2 * np.pi)
        dens[:, z] = np.clip(base * (0.6 + 0.4 * np.sin(2 * np.pi * t / period + phase)), 0.0, 4.0)
    return dens


def generate_run(venue: dict, seed: int) -> dict:
    """Generate one run. Returns arrays only; the caller writes the CSV contracts."""
    rng = np.random.default_rng(seed)
    S = SIGNAL
    n_steps = int(rng.choice([240, 300, 360]))  # 120, 150, 180 s
    asset = str(rng.choice(VENUE_ASSETS[venue["venue_id"]]))
    truth = gen_trajectory(venue, rng, n_steps, asset)
    all_anchors = _anchor_xy(venue)

    k_active = int(rng.choice([3, 4, 5, 6, 8], p=[0.15, 0.2, 0.2, 0.2, 0.25]))
    active = np.sort(rng.choice(len(all_anchors), size=k_active, replace=False))
    axy = all_anchors[active]
    A = len(active)

    noise_scale = float(rng.choice([1.0, 1.0, 1.5, 2.0]))
    loss_base = float(rng.choice([S["packet_loss"], S["packet_loss"], 0.10, 0.20]))
    outlier_p = float(rng.choice([0.005, 0.01, 0.02]))
    crowd_scale = float(rng.choice([0.3, 1.0, 1.0, 1.3]))

    walls = _walls_array(venue)
    zones = _crowd_zones(venue)
    polys = [np.array(z["polygon"], float) for z in zones]
    dens = _zone_density(rng, zones, n_steps, crowd_scale)
    path_dens = path_crowd_density(truth, axy, polys, dens)  # (T, A)

    diff = truth[:, None, :] - axy[None, :, :]
    d = np.linalg.norm(diff, axis=-1)  # true distance (T, A)

    wall_nlos = los_blocked(truth, axy, walls)
    crowd_nlos = rng.random((n_steps, A)) < np.minimum(0.5, 0.08 * path_dens)
    is_nlos = wall_nlos | crowd_nlos
    bias = np.where(is_nlos, rng.uniform(S["nlos_bias_min_m"], S["nlos_bias_max_m"], (n_steps, A)), 0.0)

    sigma = (S["range_sigma0_m"] + S["range_sigma_per_m"] * d) * noise_scale * (1 + 0.15 * path_dens)
    rng_m = d + rng.normal(0.0, 1.0, d.shape) * sigma + bias

    # drift on a subset of anchors (time dependent, not labelled NLOS)
    if rng.random() < 0.3:
        j = int(rng.integers(A))
        t0 = int(rng.integers(0, n_steps // 2))
        rate = float(rng.uniform(0.5, 2.0)) * float(rng.choice([-1, 1]))
        ramp = np.clip((np.arange(n_steps) - t0) / max(n_steps - t0, 1), 0, 1)
        rng_m[:, j] += rate * ramp

    # rare outliers (kept in the data, not labelled NLOS)
    out_mask = rng.random(d.shape) < outlier_p
    rng_m = rng_m + out_mask * rng.uniform(3.0, 10.0, d.shape) * rng.choice([-1.0, 1.0], d.shape)
    rng_m = np.maximum(rng_m, 0.05)

    rssi = (
        S["rssi_ref_dbm"]
        - S["rssi_slope_db_per_decade"] * np.log10(np.maximum(d, S["rssi_min_distance_m"]))
        + rng.normal(0.0, S["rssi_sigma_db"] * (1 + 0.1 * path_dens), d.shape)
    )

    # missing readings: packet loss (higher in crowds), per-anchor outages, network-wide dropouts
    missing = rng.random(d.shape) < (loss_base + 0.03 * path_dens)
    for a in range(A):
        for t in np.flatnonzero(rng.random(n_steps) < 0.003):
            missing[t : t + int(rng.integers(1, 11)), a] = True
    for t in np.flatnonzero(rng.random(n_steps) < 0.004):
        missing[t : t + int(rng.integers(1, 11)), :] = True
    rng_m = np.where(missing, np.nan, rng_m)
    rssi = np.where(missing, np.nan, rssi)

    return {
        "venue_id": venue["venue_id"], "asset": asset, "truth": truth, "active_ids": active,
        "range_m": rng_m, "rssi_dbm": rssi, "is_nlos": is_nlos, "bias_m": bias,
        "zone_ids": [z["zone_id"] for z in zones], "density": dens,
        "conditions": {
            "n_active_anchors": k_active, "noise_scale": noise_scale, "packet_loss_base": loss_base,
            "outlier_prob": outlier_p, "crowd_scale": crowd_scale, "asset": asset, "n_steps": n_steps,
        },
    }


def write_split(out_dir: str | Path, split: str, runs_per_venue: int, base_seed: int) -> dict:
    """Write one split (train/dev) to out_dir in the section 9 CSV contracts."""
    out_dir = Path(out_dir)
    (out_dir / "venues").mkdir(parents=True, exist_ok=True)
    venues = build_venues()
    for v in venues.values():
        (out_dir / "venues" / f"{v['venue_id']}.json").write_text(json.dumps(v, indent=1))

    meas, truth_rows, label_rows, crowd_rows, cond = [], [], [], [], {}
    idx = 0
    for vid in VENUE_ORDER:
        for _ in range(runs_per_venue):
            seed = base_seed + idx
            run_id = f"{vid}-{split}-{idx:04d}"
            r = generate_run(venues[vid], seed)
            T = len(r["truth"])
            t = np.arange(T) * DT_S
            truth_rows.append(pd.DataFrame({"run_id": run_id, "t": t, "x_m": r["truth"][:, 0], "y_m": r["truth"][:, 1]}))
            for j, aid in enumerate(r["active_ids"]):
                meas.append(pd.DataFrame({"run_id": run_id, "t": t, "anchor_id": int(aid),
                                          "range_m": r["range_m"][:, j], "rssi_dbm": r["rssi_dbm"][:, j]}))
                label_rows.append(pd.DataFrame({"run_id": run_id, "t": t, "anchor_id": int(aid),
                                                "is_nlos": r["is_nlos"][:, j].astype(int), "bias_m": r["bias_m"][:, j]}))
            for z, zid in enumerate(r["zone_ids"]):
                crowd_rows.append(pd.DataFrame({"run_id": run_id, "t": t, "zone_id": zid, "density_people_m2": r["density"][:, z]}))
            cond[run_id] = {**r["conditions"], "seed": seed}
            idx += 1

    m =pd.concat(meas, ignore_index=True).sort_values(["run_id", "t", "anchor_id"], kind="stable")
    m["t"] = m["t"].round(1)
    m["range_m"] = m["range_m"].round(3)
    m["rssi_dbm"] = m["rssi_dbm"].round(1)
    m.to_csv(out_dir / "measurements.csv", index=False, lineterminator="\n")

    tr = pd.concat(truth_rows, ignore_index=True)
    tr["t"] = tr["t"].round(1)
    tr[["x_m", "y_m"]] = tr[["x_m", "y_m"]].round(3)
    tr.to_csv(out_dir / "truth.csv", index=False, lineterminator="\n")

    lb = pd.concat(label_rows, ignore_index=True).sort_values(["run_id", "t", "anchor_id"], kind="stable")
    lb["t"] = lb["t"].round(1)
    lb["bias_m"] = lb["bias_m"].round(3)
    lb.to_csv(out_dir / "labels_nlos.csv", index=False, lineterminator="\n")

    cr = pd.concat(crowd_rows, ignore_index=True)
    cr["t"] = cr["t"].round(1)
    cr["density_people_m2"] = cr["density_people_m2"].round(3)
    cr.to_csv(out_dir / "crowd.csv", index=False, lineterminator="\n")

    manifest = make_manifest(
        {"split": split, "runs_per_venue": runs_per_venue, "base_seed": base_seed,
         "temporary_standin": True, "run_conditions": cond}
    )
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1))
    return manifest


def make_manifest(config: dict) -> dict:
    """Manifest required beside every dataset/model/report (guide section 6)."""
    try:
        commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, timeout=5).stdout.strip() or "unknown"
    except Exception:
        commit = "unknown"
    cfg_hash = hashlib.sha256(json.dumps(config, sort_keys=True, default=str).encode()).hexdigest()[:16]
    versions = {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__}
    try:
        import torch
        versions["torch"] = torch.__version__
    except Exception:
        pass
    return {"seed": config.get("base_seed", config.get("seed")), "config": config, "config_hash": cfg_hash,
            "library_versions": versions, "git_commit": commit,
            "date": datetime.now(timezone.utc).isoformat(timespec="seconds")}


def main(argv=None):
    ap = argparse.ArgumentParser(description="Generate TEMPORARY stand-in data (contract-format CSVs).")
    ap.add_argument("--out", default="data/standin")
    ap.add_argument("--train-runs", type=int, default=24, help="runs per venue for the train split")
    ap.add_argument("--dev-runs", type=int, default=8, help="runs per venue for the dev split")
    ap.add_argument("--shared", default="../shared")
    a = ap.parse_args(argv)
    seeds = load_seeds(a.shared)
    for split, n in (("train", a.train_runs), ("dev", a.dev_runs)):
        write_split(Path(a.out) / split, split, n, seeds[split])
        print(f"wrote {split}: {n} runs per venue -> {Path(a.out) / split}")


if __name__ == "__main__":
    main(sys.argv[1:])
