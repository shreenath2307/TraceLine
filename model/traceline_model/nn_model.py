"""Traceline neural positioning model (single time step, explicit recurrent state).

Design (documented in MODEL_CARD.md):
1. A shared per-anchor encoder reads x, y, range, RSSI, an RSSI-implied range, a
   range-vs-RSSI inconsistency cue, an optional crowd value, and the range residual against
   the previous position. Invalid slots are masked out (valid_flag is authoritative).
2. Per-anchor heads give NLOS probability, a learned reliability weight, and a bias estimate.
3. A differentiable closed-form weighted multilateration uses the corrected ranges and the
   learned weights (ridge-regularised towards the previous position). This gives the net a
   geometric backbone and makes the per-anchor influence directly inspectable.
4. A GRUCell fuses that fix with history and predicts a bounded correction, an uncertainty,
   and a forecast of the next HORIZON positions.

All normalisation (train-only statistics) lives inside the graph, so callers pass raw metres
and dBm. Output units are metres. Everything is float32 and ONNX opset-17 friendly.
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F

from .constants import HORIZON, MAX_ANCHORS

DEFAULT_CFG = {
    "name": "default",
    "hidden": 64,
    "enc": 48,
    "use_nlos": True,  # ablation: no NLOS / reliability heads
    "use_temporal": True,  # ablation: no GRU state and no previous-position input
    "use_crowd": False,  # ablation / optional input (OFF unless the team enables it)
    "use_prediction": True,  # ablation: no forecast head
    "horizon": HORIZON,
    "ridge": 0.05,
    "delta_max_m": 4.0,
}


class TracelineNet(nn.Module):
    def __init__(self, cfg: dict | None, norm: torch.Tensor):
        super().__init__()
        self.cfg = {**DEFAULT_CFG, **(cfg or {})}
        c = self.cfg
        E, H = c["enc"], c["hidden"]
        self.register_buffer("norm", norm.clone().float())  # (5, 2): x, y, range, rssi, crowd -> mean, std
        self.enc = nn.Sequential(nn.Linear(9, E), nn.ReLU(), nn.Linear(E, E), nn.ReLU())
        self.anchor_head = nn.Sequential(nn.Linear(2 * E, E), nn.ReLU(), nn.Linear(E, 3))
        g_in = E + 10
        self.gru = nn.GRUCell(g_in, H)
        self.ff = nn.Sequential(nn.Linear(g_in, H), nn.Tanh())
        self.delta = nn.Linear(H, 2)
        self.sig = nn.Linear(H, 1)
        self.fc = nn.Linear(H, c["horizon"] * 2)
        for m in (self.delta, self.fc):
            nn.init.zeros_(m.bias)
            nn.init.normal_(m.weight, std=0.01)

    @property
    def state_size(self) -> int:
        return self.cfg["hidden"]

    def forward(self, slots, prev_pos, prev_valid, dt, state):
        """slots (B,8,6): x_m, y_m, range_m, rssi_dbm, valid_flag, crowd_path_density.

        prev_pos (B,2) metres; prev_valid (B,1) 0/1; dt (B,1) seconds; state (B,H).
        Returns dict of tensors (see keys at the bottom).
        """
        c = self.cfg
        nm = self.norm
        x, y, r, rs, v, cr = slots.unbind(-1)
        v = (v > 0.5).to(slots.dtype)
        B = x.shape[0]
        pv = prev_valid if c["use_temporal"] else torch.zeros_like(prev_valid)

        xn = (x - nm[0, 0]) / nm[0, 1]
        yn = (y - nm[1, 0]) / nm[1, 1]
        rn = (r - nm[2, 0]) / nm[2, 1]
        rsn = (rs - nm[3, 0]) / nm[3, 1]
        cn = (cr - nm[4, 0]) / nm[4, 1] if c["use_crowd"] else torch.zeros_like(r)
        d_rssi = torch.pow(10.0, ((-40.0 - rs) / 20.0).clamp(-1.0, 2.5))
        diff = (torch.log(r.clamp_min(0.1)) - torch.log(d_rssi.clamp(0.1, 300.0))).clamp(-2.0, 2.0)
        dist_prev = torch.sqrt((x - prev_pos[:, 0:1]) ** 2 + (y - prev_pos[:, 1:2]) ** 2 + 1e-6)
        prior_res = ((r - dist_prev) / 5.0).clamp(-3.0, 3.0) * pv
        feats = torch.stack([xn, yn, rn, rsn, d_rssi.clamp(0.1, 100.0) / 20.0, diff, cn, prior_res, v], -1)
        feats = feats * v.unsqueeze(-1)

        e = self.enc(feats) * v.unsqueeze(-1)
        nv = v.sum(1, keepdim=True)
        ctx = e.sum(1) / nv.clamp_min(1.0)
        h2 = self.anchor_head(torch.cat([e, ctx.unsqueeze(1).expand(-1, MAX_ANCHORS, -1)], -1))
        if c["use_nlos"]:
            p_nlos = torch.sigmoid(h2[..., 0]) * v
            w = (torch.sigmoid(h2[..., 1]).clamp_min(0.02)) * v
            bias = F.softplus(h2[..., 2]).clamp_max(5.0)
        else:
            p_nlos = torch.zeros_like(v)
            w = v
            bias = torch.zeros_like(v)
        corr = p_nlos * bias  # estimated range bias removed from each reading
        rc = (r - corr).clamp_min(0.1)

        # --- differentiable closed-form weighted multilateration on corrected ranges
        om = w / (rc**2 + 1.0) * v
        so = om.sum(1, keepdim=True)
        so_safe = so.clamp_min(1e-6)
        a_x, a_y = x, y
        abx = (om * a_x).sum(1, keepdim=True) / so_safe
        aby = (om * a_y).sum(1, keepdim=True) / so_safe
        yv = (a_x**2 + a_y**2) - rc**2
        ybar = (om * yv).sum(1, keepdim=True) / so_safe
        cx, cy_, cyv = a_x - abx, a_y - aby, yv - ybar
        m11 = 4.0 * (om * cx * cx).sum(1, keepdim=True)
        m12 = 4.0 * (om * cx * cy_).sum(1, keepdim=True)
        m22 = 4.0 * (om * cy_ * cy_).sum(1, keepdim=True)
        b1 = 2.0 * (om * cx * cyv).sum(1, keepdim=True)
        b2 = 2.0 * (om * cy_ * cyv).sum(1, keepdim=True)
        default = torch.stack([nm[0, 0], nm[1, 0]]).unsqueeze(0).expand(B, -1)
        has = (so > 1e-6).to(slots.dtype)
        centroid = torch.cat([abx, aby], 1) * has + default * (1.0 - has)
        prior = pv * prev_pos + (1.0 - pv) * centroid
        lam = c["ridge"]
        M11, M22, M12 = m11 + lam, m22 + lam, m12
        r1 = b1 + lam * prior[:, 0:1]
        r2 = b2 + lam * prior[:, 1:2]
        det = (M11 * M22 - M12 * M12).clamp_min(1e-9)
        p_ls = torch.cat([(r1 * M22 - M12 * r2) / det, (M11 * r2 - M12 * r1) / det], 1)

        # --- temporal fusion
        mean_xy = torch.stack([nm[0, 0], nm[1, 0]]).unsqueeze(0)
        std_xy = torch.stack([nm[0, 1], nm[1, 1]]).unsqueeze(0)
        pln = (p_ls - mean_xy) / std_xy
        prevn = (prev_pos - mean_xy) / std_xy * pv
        dp = ((p_ls - prev_pos) / 5.0).clamp(-3.0, 3.0) * pv
        meanw = (w * v).sum(1, keepdim=True) / nv.clamp_min(1.0)
        g_in = torch.cat([ctx, pln, prevn, pv, dt, nv / 8.0, meanw, dp], -1)
        if c["use_temporal"]:
            h_new = self.gru(g_in, state)
        else:
            h_new = self.ff(g_in)
            state = torch.zeros_like(state)
        delta = c["delta_max_m"] * torch.tanh(self.delta(h_new))
        pos = p_ls + delta
        sigma = F.softplus(self.sig(h_new)) + 0.05
        if c["use_prediction"]:
            fc = pos.unsqueeze(1) + self.fc(h_new).view(B, c["horizon"], 2)
        else:
            fc = pos.unsqueeze(1).expand(-1, c["horizon"], -1)
        state_out = h_new if c["use_temporal"] else state
        return {"position": pos, "sigma": sigma, "nlos_prob": p_nlos, "weights": w,
                "bias_est": corr, "forecast": fc, "state_out": state_out, "p_ls": p_ls}


OUTPUT_NAMES = ["position", "sigma", "nlos_prob", "weights", "bias_est", "forecast", "state_out"]
INPUT_NAMES = ["slots", "prev_pos", "prev_valid", "dt", "state"]


class OnnxStep(nn.Module):
    """Tuple-returning wrapper used for ONNX export."""

    def __init__(self, net: TracelineNet):
        super().__init__()
        self.net = net

    def forward(self, slots, prev_pos, prev_valid, dt, state):
        o = self.net(slots, prev_pos, prev_valid, dt, state)
        return tuple(o[k] for k in OUTPUT_NAMES)
