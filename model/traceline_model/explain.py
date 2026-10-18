"""Explanation layer: per-anchor influence and a plain-language reason (guide sections 3, 9.3).

Every reason is traceable to a real quantity: the model's NLOS probability and learned weight
for that anchor, and the residual between the measured range and the geometric distance from
the estimate to the anchor. infer.js mirrors this logic exactly (parity tested).
"""
from __future__ import annotations

import math

DEFAULT_THRESHOLDS = {"nlos_threshold": 0.5, "weight_threshold": 0.2, "sigma_high_m": 2.0}


def explain(anchor_ids, valid, nlos_prob, weights, range_m, anchor_xy, position, sigma_m,
            thresholds=None, bounds=None) -> dict:
    """All per-slot arguments have length 8; anchor_ids holds None for padded slots."""
    th = {**DEFAULT_THRESHOLDS, **(thresholds or {})}
    x, y = position
    used, down, codes, texts = [], [], [], []
    n_real_valid = 0
    for j, aid in enumerate(anchor_ids):
        if aid is None:
            continue
        if not valid[j]:
            codes.append(f"MISSING_READING:{aid}")
            texts.append(f"Anchor {aid} reading missing.")
            continue
        n_real_valid += 1
        dist = math.hypot(x - anchor_xy[j][0], y - anchor_xy[j][1])
        res = range_m[j] - dist
        suspect = nlos_prob[j] >= th["nlos_threshold"]
        low = weights[j] < th["weight_threshold"]
        if suspect or low:
            down.append(aid)
            if suspect:
                codes.append(f"NLOS_SUSPECTED:{aid}")
                why = (f"likely obstructed (NLOS probability {nlos_prob[j]:.2f}; measured range is "
                       f"{abs(res):.1f} m {'longer' if res >= 0 else 'shorter'} than the distance to the estimate)")
            else:
                codes.append(f"LOW_WEIGHT:{aid}")
                why = f"low reliability weight ({weights[j]:.2f})"
            texts.append(f"Anchor {aid} down-weighted, {why}.")
        else:
            used.append(aid)
    if n_real_valid == 0:
        codes.append("DEAD_RECKONING")
        texts.append("No valid anchor readings; position carried forward from motion history.")
    elif len(used) < 3:
        codes.append("FEW_ANCHORS")
        texts.append(f"Only {len(used)} trusted anchor(s); estimate relies partly on motion history.")
    if sigma_m >= th["sigma_high_m"]:
        codes.append("HIGH_UNCERTAINTY")
        texts.append(f"Uncertainty is high (about {sigma_m:.1f} m).")
    if bounds is not None and not (0.0 <= x <= bounds[0] and 0.0 <= y <= bounds[1]):
        codes.append("OUT_OF_BOUNDS")
        texts.append("Estimate lies outside the venue bounds; it was not clamped.")
    if not codes:
        codes.append("NORMAL")
        texts.append("All usable anchors are consistent with the estimate.")
    return {"used_anchor_ids": used, "downweighted_anchor_ids": down, "reason_codes": codes,
            "reason_text": " ".join(texts)}
