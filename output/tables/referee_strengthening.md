# Referee-response strengthening (locked vintage, 2026-05)

Recomputed on the locked panel; no ingest. One block per referee request.

## 1. Base-vs-M2 elasticity, tested as a difference
Stacked `y ~ lpi_e * series` interaction (M2 minus base): +0.163 (NW SE 0.064, p = 0.013). Significant at 5%.

## 2. Unit roots and cointegration
ADF (drift): m_real -2.33, m2_real -2.06, lpi_e -0.86 (5% crit ~ -2.89).
Engle-Granger resid-ADF: base -2.33, M2 -2.17 (5% EG crit ~ -3.34).
First-differenced base elasticity -0.184 (NW SE 0.100, p = 0.073).

## 3. Slope-shift robustness (lpi_e:post, real M2)
Across NW lags 1-6 x three devaluation windows (18 cells): estimate in [0.098, 0.201], p in [0.001, 0.031]; 18 of 18 significant at 5%.

## 4. Event-study family-wise correction
Holm-adjusted placebo p-values over the reported family; see console for the full table.

## 5. Seigniorage denominator robustness
Yearly seigniorage (% of GDP) under interpolated, flat-2026, and growth-path denominators:

| Year | Interp | Flat 2026 | Growth |
|---|---|---|---|
| 2022 | 1.13 | 1.13 | 1.13 |
| 2023 | 1.73 | 1.73 | 1.73 |
| 2024 | 2.98 | 2.98 | 2.98 |
| 2025 | 1.61 | 1.61 | 1.60 |
| 2026 | 0.05 | 0.05 | 0.05 |

