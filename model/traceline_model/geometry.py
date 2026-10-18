"""Deterministic 2-D geometry helpers (metres, bottom-left origin, y up)."""
from __future__ import annotations

import numpy as np

EPS = 1e-9


def los_blocked(targets: np.ndarray, anchors: np.ndarray, walls: np.ndarray) -> np.ndarray:
    """Return a (T, A) bool array: True when target->anchor crosses any wall.

    targets: (T, 2); anchors: (A, 2); walls: (W, 4) rows x1, y1, x2, y2.
    A segment touching a wall only at the target/anchor endpoint is NOT blocked.
    Parallel / collinear segments are treated as not blocked (documented simplification).
    """
    targets = np.asarray(targets, float)
    anchors = np.asarray(anchors, float)
    walls = np.asarray(walls, float).reshape(-1, 4)
    if len(walls) == 0:
        return np.zeros((len(targets), len(anchors)), bool)
    P = targets[:, None, None, :]
    Q = anchors[None, :, None, :]
    A0 = walls[None, None, :, 0:2]
    B0 = walls[None, None, :, 2:4]
    r = Q - P
    s = B0 - A0
    qp = A0 - P

    def cross(u, v):
        return u[..., 0] * v[..., 1] - u[..., 1] * v[..., 0]

    rxs = cross(r, s)
    ok = np.abs(rxs) > EPS
    safe = np.where(ok, rxs, 1.0)
    t = cross(qp, s) / safe  # position along target->anchor
    u = cross(qp, r) / safe  # position along wall
    hit = ok & (t > 1e-6) & (t < 1 - 1e-6) & (u >= -1e-9) & (u <= 1 + 1e-9)
    return hit.any(-1)


def point_in_polygon(points: np.ndarray, poly: np.ndarray) -> np.ndarray:
    """Ray-casting point-in-polygon for points of shape (..., 2). Returns bool (...)."""
    poly = np.asarray(poly, float)
    px = points[..., 0]
    py = points[..., 1]
    inside = np.zeros(px.shape, bool)
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        denom = (yj - yi) if abs(yj - yi) > EPS else EPS
        cond = ((yi > py) != (yj > py)) & (px < (xj - xi) * (py - yi) / denom + xi)
        inside ^= cond
        j = i
    return inside


def path_crowd_density(
    targets: np.ndarray,
    anchors: np.ndarray,
    zone_polygons: list[np.ndarray],
    density: np.ndarray,
    samples: int = 8,
) -> np.ndarray:
    """Crowd load on each target->anchor path, shape (T, A).

    For each crowd zone: (fraction of the path inside the zone) * (people/m^2 at that time),
    summed over zones. density: (T, Z) people per square metre.
    """
    T, A = len(targets), len(anchors)
    out = np.zeros((T, A))
    if not zone_polygons:
        return out
    frac = (np.arange(samples) + 0.5) / samples
    pts = targets[:, None, None, :] + frac[None, None, :, None] * (
        anchors[None, :, None, :] - targets[:, None, None, :]
    )  # (T, A, S, 2)
    for z, poly in enumerate(zone_polygons):
        inside = point_in_polygon(pts, poly).mean(-1)  # (T, A)
        out += inside * density[:, z][:, None]
    return out
