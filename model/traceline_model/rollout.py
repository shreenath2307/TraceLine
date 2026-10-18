"""Run a trained TracelineNet over whole runs (batched across runs, sequential in time)."""
from __future__ import annotations

import numpy as np
import torch

from .constants import DT_S, MAX_ANCHORS
from .loader import Run, slots_array


def pad_slots(runs: list[Run], stats: dict, use_crowd: bool) -> tuple[torch.Tensor, np.ndarray]:
    """Stack runs into (N, Tmax, 8, 6); steps past a run's end are all-invalid."""
    lens = np.array([r.n_steps for r in runs])
    Tmax = int(lens.max())
    from .loader import stats_to_array
    arr = stats_to_array(stats)
    out = np.zeros((len(runs), Tmax, MAX_ANCHORS, 6), np.float32)
    out[..., 0], out[..., 1], out[..., 2], out[..., 3], out[..., 5] = arr[0, 0], arr[1, 0], arr[2, 0], arr[3, 0], arr[4, 0]
    for i, r in enumerate(runs):
        out[i, : r.n_steps] = slots_array(r, stats, use_crowd_values=use_crowd)
    return torch.from_numpy(out), lens


@torch.no_grad()
def rollout(model, runs: list[Run], stats: dict) -> dict:
    """Return numpy outputs shaped (N, Tmax, ...) plus run lengths."""
    model.eval()
    slots, lens = pad_slots(runs, stats, model.cfg["use_crowd"])
    N, Tmax = slots.shape[:2]
    H = model.state_size
    prev = torch.zeros(N, 2)
    pv = torch.zeros(N, 1)
    h = torch.zeros(N, H)
    dt = torch.full((N, 1), DT_S)
    outs = {k: [] for k in ("position", "sigma", "nlos_prob", "weights", "forecast")}
    for t in range(Tmax):
        o = model(slots[:, t], prev, pv, dt, h)
        for k in outs:
            outs[k].append(o[k].numpy())
        prev, h, pv = o["position"], o["state_out"], torch.ones(N, 1)
    res = {k: np.stack(v, 1) for k, v in outs.items()}
    res["lens"] = lens
    return res
