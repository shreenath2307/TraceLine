"""Train the Traceline neural model from scratch (PyTorch, CPU is enough).

    python -m traceline_model.train --config configs/default.json

Multi-task loss: position (Huber) + uncertainty (Gaussian NLL, per-axis sigma) + NLOS binary
cross-entropy + bias correction + forecast (Huber) + an auxiliary loss on the internal
multilateration fix. Normalisation statistics come from the TRAIN split only.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F

from .constants import DT_S, MAX_ANCHORS
from .loader import Run, compute_norm_stats, load_dataset, slots_array, stats_to_array
from .nn_model import DEFAULT_CFG, TracelineNet
from .rollout import rollout
from .standin_data import make_manifest


def build_tensors(runs: list[Run], stats: dict, use_crowd: bool):
    """Pad all runs to (N, Tmax, ...) arrays used for chunk sampling."""
    N = len(runs)
    lens = np.array([r.n_steps for r in runs])
    Tmax = int(lens.max())
    arr = stats_to_array(stats)
    slots = np.zeros((N, Tmax, MAX_ANCHORS, 6), np.float32)
    slots[..., 0], slots[..., 1], slots[..., 2], slots[..., 3], slots[..., 5] = arr[0, 0], arr[1, 0], arr[2, 0], arr[3, 0], arr[4, 0]
    truth = np.zeros((N, Tmax + 64, 2), np.float32)  # extra tail so forecast slices never run short
    nlos = np.zeros((N, Tmax, MAX_ANCHORS), np.float32)
    bias = np.zeros((N, Tmax, MAX_ANCHORS), np.float32)
    for i, r in enumerate(runs):
        T, A = r.n_steps, r.n_active
        slots[i, :T] = slots_array(r, stats, use_crowd_values=use_crowd)
        truth[i, :T] = r.truth
        nlos[i, :T, :A] = r.nlos
        bias[i, :T, :A] = r.bias_m
    return {k: torch.from_numpy(v) for k, v in
            dict(slots=slots, truth=truth, nlos=nlos, bias=bias).items()} | {"lens": lens}


def sample_chunk(data: dict, rng: np.random.Generator, B: int, L: int, K: int):
    N = len(data["lens"])
    idx, st = [], []
    for _ in range(B):
        i = int(rng.integers(N))
        n = int(data["lens"][i])
        s = 0 if rng.random() < 0.5 else int(rng.integers(0, max(n - L, 0) + 1))
        idx.append(i)
        st.append(min(s, max(n - L, 0)))
    sl = torch.stack([data["slots"][i, s : s + L] for i, s in zip(idx, st)])  # (B, L, 8, 6)
    tr = torch.stack([data["truth"][i, s : s + L + K] for i, s in zip(idx, st)])
    nl = torch.stack([data["nlos"][i, s : s + L] for i, s in zip(idx, st)])
    bi = torch.stack([data["bias"][i, s : s + L] for i, s in zip(idx, st)])
    avail = torch.tensor([[min(max(int(data["lens"][i]) - (s + t), 0), 10_000) for t in range(L + K)] for i, s in zip(idx, st)])
    return sl, tr, nl, bi, avail


def pad_truth(tr: torch.Tensor, L: int, K: int) -> torch.Tensor:
    if tr.shape[1] < L + K:
        tr = torch.cat([tr, tr[:, -1:].expand(-1, L + K - tr.shape[1], -1)], 1)
    return tr


def train(config_path: str, train_dir: str, dev_dir: str, out_root: str, seed: int = 0,
          iters: int | None = None, quiet: bool = False) -> Path:
    cfg = {**DEFAULT_CFG, **json.loads(Path(config_path).read_text())}
    iters = int(iters if iters is not None else cfg.get("iters", 1200))
    B, L, K = int(cfg.get("batch", 24)), int(cfg.get("chunk", 40)), int(cfg["horizon"])
    lw = {"pos": 1.0, "pls": 0.3, "nll": 0.1, "nlos": 0.5, "bias": 0.3, "fc": 0.3, **cfg.get("loss_weights", {})}
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)

    train_runs = load_dataset(train_dir)
    dev_runs = load_dataset(dev_dir)
    stats = compute_norm_stats(train_runs)  # train-only statistics
    norm = torch.from_numpy(stats_to_array(stats))
    model = TracelineNet(cfg, norm)
    data = build_tensors(train_runs, stats, cfg["use_crowd"])
    opt = torch.optim.AdamW(model.parameters(), lr=float(cfg.get("lr", 2e-3)), weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=float(cfg.get("lr", 2e-3)), total_steps=iters, pct_start=0.1)
    out_dir = Path(out_root) / cfg["name"]
    out_dir.mkdir(parents=True, exist_ok=True)
    log = []
    t0 = time.time()
    H = model.state_size
    dt = torch.full((B, 1), DT_S)

    for it in range(1, iters + 1):
        model.train()
        sl, tr, nl, bi, avail = sample_chunk(data, rng, B, L, K)
        prev = torch.zeros(B, 2)
        pv = torch.zeros(B, 1)
        h = torch.zeros(B, H)
        losses = {k: 0.0 for k in lw}
        for t in range(L):
            o = model(sl[:, t], prev, pv, dt, h)
            truth_t = tr[:, t]
            e = o["position"] - truth_t
            v = (sl[:, t, :, 4] > 0.5).float()
            sig = o["sigma"]
            losses["pos"] = losses["pos"] + F.huber_loss(o["position"], truth_t, delta=1.0)
            losses["pls"] = losses["pls"] + F.huber_loss(o["p_ls"], truth_t, delta=2.0)
            losses["nll"] = losses["nll"] + (2 * torch.log(sig) + (e.detach() ** 2).sum(1, keepdim=True) / (2 * sig**2)).mean()
            if cfg["use_nlos"]:
                p = o["nlos_prob"].clamp(1e-5, 1 - 1e-5)
                bce = F.binary_cross_entropy(p, nl[:, t], reduction="none")
                losses["nlos"] = losses["nlos"] + (bce * v).sum() / v.sum().clamp_min(1.0)
                sl1 = F.smooth_l1_loss(o["bias_est"], bi[:, t], reduction="none")
                losses["bias"] = losses["bias"] + (sl1 * v).sum() / v.sum().clamp_min(1.0)
            if cfg["use_prediction"]:
                fut = tr[:, t + 1 : t + 1 + K]  # (B, K, 2)
                steps_left = avail[:, t]  # steps remaining in the run from t
                m = (torch.arange(1, K + 1).unsqueeze(0) < steps_left.unsqueeze(1)).float()
                fl = F.smooth_l1_loss(o["forecast"], fut, reduction="none").sum(-1)
                losses["fc"] = losses["fc"] + (fl * m).sum() / m.sum().clamp_min(1.0)
            prev, pv, h = o["position"].detach(), torch.ones(B, 1), o["state_out"]
        total = sum(lw[k] * losses[k] / L for k in lw)
        opt.zero_grad()
        total.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
        opt.step()
        sched.step()
        if it % 100 == 0 or it == iters:
            rec = {"iter": it, "loss": float(total.detach()), "elapsed_s": round(time.time() - t0, 1),
                   **{k: float(torch.as_tensor(v).detach()) / L for k, v in losses.items()}}
            if it % 300 == 0 or it == iters:
                res = rollout(model, dev_runs, stats)
                errs = [np.linalg.norm(res["position"][i, : n] - r.truth, axis=1) for i, (r, n) in enumerate(zip(dev_runs, res["lens"]))]
                rec["dev_mean_err_m"] = float(np.concatenate(errs).mean())
            log.append(rec)
            if not quiet:
                print(rec, flush=True)

    torch.save({"state_dict": model.state_dict(), "cfg": model.cfg, "stats": stats, "seed": seed}, out_dir / "model.pt")
    (out_dir / "train_log.json").write_text(json.dumps(log, indent=1))
    manifest = make_manifest({"seed": seed, "model_config": model.cfg, "iters": iters, "batch": B, "chunk": L,
                              "loss_weights": lw, "train_dir": str(train_dir), "dev_dir": str(dev_dir),
                              "norm_stats_source": "train split only"})
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1))
    return out_dir


def load_model(model_dir: str | Path):
    ck = torch.load(Path(model_dir) / "model.pt", map_location="cpu", weights_only=False)
    model = TracelineNet(ck["cfg"], torch.from_numpy(stats_to_array(ck["stats"])))
    model.load_state_dict(ck["state_dict"])
    model.eval()
    return model, ck["stats"]


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="configs/default.json")
    ap.add_argument("--train", default="data/standin/train")
    ap.add_argument("--dev", default="data/standin/dev")
    ap.add_argument("--out", default="models")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--iters", type=int, default=None)
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args(argv)
    print("saved", train(a.config, a.train, a.dev, a.out, a.seed, a.iters, a.quiet))


if __name__ == "__main__":
    main()
