# Workstream B dev-set results (SYNTHETIC stand-in data)

24 dev runs, 7380 steps. Baselines tuned on train only: {'b2_thr': 8.0, 'q': 0.6, 'r_sigma': 1.0, 'tuned_on': '24 train runs'}.

## Position error (m)

| Method | median | mean | RMSE | P90 | P95 |
|---|---|---|---|---|---|
| B1 | 1.44 | 1.97 | 2.96 | 3.66 | 5.19 |
| B2 | 1.77 | 2.21 | 3.13 | 4.09 | 5.43 |
| B3 | 1.52 | 1.76 | 2.32 | 2.97 | 3.76 |
| Traceline | 0.84 | 1.11 | 1.49 | 2.15 | 2.77 |

## Median / P90 error by Active anchors

| Slice | B1 | B2 | B3 | Traceline |
|---|---|---|---|---|
| 3 | 4.73 / 14.80 | 4.73 / 14.80 | 3.65 / 8.82 | 2.46 / 6.97 |
| 4 | 1.70 / 4.83 | 1.77 / 5.00 | 1.52 / 3.74 | 1.13 / 2.58 |
| 5 | 1.60 / 3.97 | 1.87 / 4.21 | 1.64 / 2.99 | 0.98 / 2.23 |
| 6 | 1.36 / 3.27 | 1.76 / 3.84 | 1.53 / 2.86 | 0.76 / 2.05 |
| 8 | 1.27 / 2.79 | 1.61 / 3.42 | 1.33 / 2.51 | 0.70 / 1.58 |

## Median / P90 error by Venue

| Slice | B1 | B2 | B3 | Traceline |
|---|---|---|---|---|
| hospital | 1.41 / 4.67 | 1.70 / 4.93 | 1.35 / 3.53 | 0.81 / 2.52 |
| office | 1.25 / 2.90 | 1.70 / 3.49 | 1.41 / 2.53 | 0.63 / 1.54 |
| warehouse | 1.65 / 3.80 | 1.89 / 4.16 | 1.73 / 3.10 | 1.09 / 2.34 |

## Median / P90 error by NLOS reading present

| Slice | B1 | B2 | B3 | Traceline |
|---|---|---|---|---|
| False | 1.98 / 6.36 | 2.18 / 6.26 | 1.62 / 6.01 | 1.30 / 3.55 |
| True | 1.41 / 3.39 | 1.74 / 3.86 | 1.52 / 2.82 | 0.81 / 2.01 |

## Median / P90 error by Fewer than 3 valid anchors

| Slice | B1 | B2 | B3 | Traceline |
|---|---|---|---|---|
| False | 1.39 / 3.38 | 1.70 / 3.85 | 1.49 / 2.81 | 0.81 / 2.01 |
| True | 2.63 / 8.23 | 2.96 / 7.33 | 2.28 / 6.69 | 1.55 / 5.10 |

## NLOS detection

threshold 0.40: precision 0.753, recall 0.899, F1 0.819 (positive rate 0.52); confusion {'tp': 8854, 'fp': 2909, 'fn': 992, 'tn': 6136}

## Ablations (dev mean / median / P90, m)

| Model | mean | median | P90 |
|---|---|---|---|
| crowd | 1.11 | 0.85 | 2.16 |
| default | 1.11 | 0.84 | 2.15 |
| no_nlos | 1.44 | 1.05 | 2.82 |
| no_prediction | 1.18 | 0.85 | 2.27 |
| no_temporal | 2.27 | 1.19 | 4.41 |

## Calibration

- within 1 sigma: observed 0.439 vs nominal 0.393
- within 2 sigma: observed 0.828 vs nominal 0.865

## Forecast error by horizon (m)

| steps | forecast | hold position |
|---|---|---|
| 1 | 1.25 | 1.31 |
| 2 | 1.45 | 1.64 |
| 3 | 1.67 | 2.03 |
| 4 | 1.91 | 2.43 |
| 5 | 2.17 | 2.84 |
| 6 | 2.43 | 3.25 |
| 7 | 2.70 | 3.65 |
| 8 | 2.98 | 4.05 |
| 9 | 3.26 | 4.44 |
| 10 | 3.54 | 4.83 |

## Error at end of an all-anchor dropout (m)

| dropped steps | hold last | B3 EKF | neural (state) | neural (forecast) |
|---|---|---|---|---|
| 1 | 1.65 | 1.98 | 1.39 | 1.42 |
| 2 | 2.46 | 2.29 | 1.52 | 1.37 |
| 3 | 3.08 | 2.26 | 2.08 | 1.83 |
| 4 | 3.35 | 2.87 | 2.48 | 2.28 |
| 5 | 3.67 | 2.64 | 2.03 | 2.06 |
| 6 | 4.46 | 3.41 | 2.45 | 2.13 |
| 7 | 5.07 | 4.34 | 2.98 | 2.78 |
| 8 | 5.46 | 4.89 | 3.12 | 3.03 |
| 9 | 4.84 | 3.52 | 3.72 | 2.35 |
| 10 | 4.91 | 3.53 | 3.18 | 2.55 |
