"""Frozen constants for contract v1.0 (Workstream B view).

Everything here mirrors sections 7-9 of the Traceline Prototype Execution Guide.
Do not change a value without the shared/ change-control process.
"""
from __future__ import annotations

import json
from pathlib import Path

DT_S = 0.5  # fixed step, 2 Hz
MAX_ANCHORS = 8  # fixed anchor slots in the model contract
HORIZON = 10  # forecast steps (5 s) so 1-10 step dropouts can be evaluated
SLOT_FEATURES = ["x_m", "y_m", "range_m", "rssi_dbm", "valid_flag", "crowd_path_density"]

# Section 8 starting assumptions (synthetic engineering assumptions, not measurements).
# Replace by reading shared/signal_model.json once Member A publishes it.
SIGNAL = {
    "range_sigma0_m": 0.15,
    "range_sigma_per_m": 0.02,
    "rssi_ref_dbm": -40.0,
    "rssi_slope_db_per_decade": 20.0,
    "rssi_sigma_db": 2.5,
    "rssi_min_distance_m": 0.5,
    "nlos_bias_min_m": 0.5,
    "nlos_bias_max_m": 3.0,
    "packet_loss": 0.05,
}

DEFAULT_SEEDS = {"train": 1000, "dev": 2000, "hidden_rehearsal": 3000}


def load_seeds(shared_dir: str | Path | None = None) -> dict:
    """Read base seeds from shared/seeds.json if present, else the guide's values."""
    seeds = dict(DEFAULT_SEEDS)
    if shared_dir is not None:
        p = Path(shared_dir) / "seeds.json"
        if p.exists():
            raw = json.loads(p.read_text())
            for k in ("train", "dev"):
                if k in raw:
                    seeds[k] = int(raw[k])
    return seeds


def range_sigma(distance_m):
    """One-sigma range noise (m) from the frozen signal model."""
    return SIGNAL["range_sigma0_m"] + SIGNAL["range_sigma_per_m"] * distance_m
