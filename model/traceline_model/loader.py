"""Dataset loader: section 9 CSV contracts -> aligned 8-slot arrays.

Rules enforced here (guide sections 7, 9.3, 14):
* grouped by run_id and time step; one row per active anchor per step;
* anchor slots sorted by anchor_id, padded to 8; the valid mask is authoritative;
* missing readings are blank cells -> NaN -> valid_flag 0 (never -1 / 0 / 999);
* truth and labels are kept in separate fields and are never used by slots_array().
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

from .constants import DT_S, MAX_ANCHORS
from .geometry import path_crowd_density


@dataclass
class Run:
    run_id: str
    venue_id: str
    split: str
    anchor_ids: np.ndarray  # (A,) sorted active anchor ids
    anchor_xy: np.ndarray  # (A, 2) metres
    range_m: np.ndarray  # (T, A) NaN where missing
    rssi_dbm: np.ndarray  # (T, A) NaN where missing
    width_m: float
    height_m: float
    crowd_path: np.ndarray | None = None  # (T, A) optional crowd_path_density
    truth: np.ndarray | None = None  # (T, 2)  scoring / training only
    nlos: np.ndarray | None = None  # (T, A)  training / dev only
    bias_m: np.ndarray | None = None  # (T, A)
    meta: dict = field(default_factory=dict)

    @property
    def n_steps(self) -> int:
        return self.range_m.shape[0]

    @property
    def n_active(self) -> int:
        return self.range_m.shape[1]

    @property
    def valid(self) -> np.ndarray:
        """(T, A) bool: both range and RSSI present and range finite."""
        return np.isfinite(self.range_m) & np.isfinite(self.rssi_dbm)

    def copy_with_valid(self, valid: np.ndarray) -> "Run":
        """Copy where readings outside `valid` become missing (used for dropout experiments)."""
        r = Run(**{**self.__dict__})
        r.range_m = np.where(valid, self.range_m, np.nan)
        r.rssi_dbm = np.where(valid, self.rssi_dbm, np.nan)
        return r


def load_venues(venue_dir: str | Path) -> dict[str, dict]:
    return {p.stem: json.loads(p.read_text()) for p in sorted(Path(venue_dir).glob("*.json"))}


def load_dataset(data_dir: str | Path, venue_dir: str | Path | None = None,
                 with_truth: bool = True, with_labels: bool = True) -> list[Run]:
    """Load every run in a split directory. venue_dir defaults to <data_dir>/venues."""
    data_dir = Path(data_dir)
    venues = load_venues(venue_dir or data_dir / "venues")
    meas = pd.read_csv(data_dir / "measurements.csv")
    required = {"run_id", "t", "anchor_id", "range_m", "rssi_dbm"}
    if not required <= set(meas.columns):
        raise ValueError(f"measurements.csv missing columns {required - set(meas.columns)}")
    if meas.duplicated(["run_id", "t", "anchor_id"]).any():
        raise ValueError("duplicate (run_id, t, anchor_id) rows in measurements.csv")
    truth = pd.read_csv(data_dir / "truth.csv") if with_truth and (data_dir / "truth.csv").exists() else None
    labels = pd.read_csv(data_dir / "labels_nlos.csv") if with_labels and (data_dir / "labels_nlos.csv").exists() else None
    crowd = pd.read_csv(data_dir / "crowd.csv") if (data_dir / "crowd.csv").exists() else None
    manifest = {}
    if (data_dir / "manifest.json").exists():
        manifest = json.loads((data_dir / "manifest.json").read_text())
    conditions = manifest.get("config", {}).get("run_conditions", {})

    runs: list[Run] = []
    for run_id, g in meas.groupby("run_id", sort=True):
        venue_id, split, _ = run_id.split("-")
        venue = venues[venue_id]
        steps = np.rint(g["t"].to_numpy() / DT_S).astype(int)
        ids = np.sort(g["anchor_id"].unique())
        T = int(steps.max()) + 1
        col = {a: i for i, a in enumerate(ids)}
        if len(g) != T * len(ids):
            raise ValueError(f"{run_id}: expected one row per active anchor per step ({T * len(ids)}), got {len(g)}")
        rows = steps
        cols = g["anchor_id"].map(col).to_numpy()
        rng = np.full((T, len(ids)), np.nan)
        rssi = np.full((T, len(ids)), np.nan)
        rng[rows, cols] = g["range_m"].to_numpy(float)
        rssi[rows, cols] = g["rssi_dbm"].to_numpy(float)
        axy_all = {a["anchor_id"]: (a["x_m"], a["y_m"]) for a in venue["anchors"]}
        axy = np.array([axy_all[int(a)] for a in ids], float)

        run = Run(run_id, venue_id, split, ids.astype(int), axy, rng, rssi,
                  float(venue["width_m"]), float(venue["height_m"]), meta=dict(conditions.get(run_id, {})))
        if truth is not None:
            tg = truth[truth.run_id == run_id]
            tr = np.full((T, 2), np.nan)
            tr[np.rint(tg["t"].to_numpy() / DT_S).astype(int)] = tg[["x_m", "y_m"]].to_numpy(float)
            run.truth = tr
        if labels is not None:
            lg = labels[labels.run_id == run_id]
            nl = np.zeros((T, len(ids)))
            bi = np.zeros((T, len(ids)))
            lr = np.rint(lg["t"].to_numpy() / DT_S).astype(int)
            lc = lg["anchor_id"].map(col).to_numpy()
            nl[lr, lc] = lg["is_nlos"].to_numpy(float)
            bi[lr, lc] = lg["bias_m"].to_numpy(float)
            run.nlos, run.bias_m = nl, bi
        if crowd is not None and run.truth is not None:
            run.crowd_path = _crowd_path_from_files(run, venue, crowd[crowd.run_id == run_id])
        runs.append(run)
    return runs


def _crowd_path_from_files(run: Run, venue: dict, cg: pd.DataFrame) -> np.ndarray | None:
    """Optional model input: crowd load on each anchor-to-target path.

    In deployment this must be computed from the PREVIOUS ESTIMATE, never from truth. Here
    the stand-in uses truth + N(0, 2 m) jitter (seeded per run) as a proxy for "previous
    estimate", so the feature does not hand the model the exact position. It is still a
    proxy: see DECISIONS.md D-006. The crowd input is OFF by default for that reason.
    """
    zones = [z for z in venue["zones"] if z["zone_type"] == "crowd"]
    if not zones or cg.empty:
        return None
    T = run.n_steps
    dens = np.zeros((T, len(zones)))
    for zi, z in enumerate(zones):
        zg = cg[cg.zone_id == z["zone_id"]]
        if len(zg):
            dens[np.rint(zg["t"].to_numpy() / DT_S).astype(int), zi] = zg["density_people_m2"].to_numpy(float)
    polys = [np.array(z["polygon"], float) for z in zones]
    seed = int.from_bytes(run.run_id.encode(), "little") % (2**32)
    proxy = run.truth + np.random.default_rng(seed).normal(0.0, 2.0, run.truth.shape)
    return path_crowd_density(proxy, run.anchor_xy, polys, dens)


def compute_norm_stats(runs: list[Run]) -> dict:
    """Train-only normalisation statistics (saved to model_meta.json)."""
    xs, ys, rs, rss, cs = [], [], [], [], []
    for r in runs:
        v = r.valid
        xs.append(np.broadcast_to(r.anchor_xy[:, 0], v.shape)[v])
        ys.append(np.broadcast_to(r.anchor_xy[:, 1], v.shape)[v])
        rs.append(r.range_m[v])
        rss.append(r.rssi_dbm[v])
        if r.crowd_path is not None:
            cs.append(r.crowd_path[v])
    def ms(a):
        a = np.concatenate(a) if a else np.array([0.0, 1.0])
        return {"mean": float(a.mean()), "std": float(max(a.std(), 1e-3))}
    return {"x": ms(xs), "y": ms(ys), "range": ms(rs), "rssi": ms(rss), "crowd": ms(cs)}


def stats_to_array(stats: dict) -> np.ndarray:
    return np.array([[stats[k]["mean"], stats[k]["std"]] for k in ("x", "y", "range", "rssi", "crowd")], np.float32)


def slots_array(run: Run, stats: dict, use_crowd_values: bool = True) -> np.ndarray:
    """(T, 8, 6) float32 model input: x, y, range, rssi, valid_flag, crowd_path_density.

    Invalid slots (missing reading or padding) get valid_flag 0 and the train-mean value
    (a neutral value after normalisation). Truth and labels are never read here.
    """
    T, A = run.n_steps, run.n_active
    if A > MAX_ANCHORS:
        raise ValueError(f"{run.run_id}: {A} active anchors > {MAX_ANCHORS} slots")
    arr = stats_to_array(stats)
    out = np.empty((T, MAX_ANCHORS, 6), np.float32)
    out[..., 0] = arr[0, 0]
    out[..., 1] = arr[1, 0]
    out[..., 2] = arr[2, 0]
    out[..., 3] = arr[3, 0]
    out[..., 4] = 0.0
    out[..., 5] = arr[4, 0]
    v = run.valid
    out[:, :A, 0] = run.anchor_xy[:, 0][None, :]
    out[:, :A, 1] = run.anchor_xy[:, 1][None, :]
    out[:, :A, 2] = np.where(v, run.range_m, arr[2, 0])
    out[:, :A, 3] = np.where(v, run.rssi_dbm, arr[3, 0])
    out[:, :A, 4] = v.astype(np.float32)
    if use_crowd_values and run.crowd_path is not None:
        out[:, :A, 5] = np.where(v, run.crowd_path, arr[4, 0])
    return out
