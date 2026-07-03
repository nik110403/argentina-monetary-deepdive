# Slope-constancy (parameter-break) test of money demand

PRIMARY Test-1 statistic. The Bai-Perron block (table2b) dates a break in the
conditional MEAN of real balances, which the December-2023 devaluation produces
mechanically through the price level. This block tests constancy of the regression
PARAMETERS of ln(M/P) ~ ln(pi_e): a Quandt-Andrews sup-F (Andrews 1993, 15% trim)
and a Nyblom-Hansen Lc (Hansen 1992), with the elasticity split at the estimated
break to separate a moved SLOPE (demand re-formed) from a shifted INTERCEPT
(mechanical price-level effect).

| Base | sup-F (Quandt-Andrews) | Lc (Nyblom-Hansen) | Break (sup-F) | 90% break-date CI | Elasticity pre → post |
|---|---|---|---|---|---|
| Narrow base ln(M0/P) | 528.8 (p <0.001) | 3.71 (p 0.005) | 2023-08 | 2023-07 to 2023-09 | -0.521 → -0.377 |
| Real M2 (uncontaminated) | 712.6 (p <0.001) | 3.88 (p 0.005) | 2023-12 | 2023-11 to 2024-01 | -0.307 → -0.159 |

Narrow base: elasticity moved (not a pure mean-shift). Real M2: elasticity moved (not a pure mean-shift).
Both statistics reject parameter constancy at conventional levels.

Elasticity change net of the December-2023 to March-2024 devaluation window
(the lpi_e:post coefficient in lhs ~ lpi_e * post + deval): real M2 +0.121 (NW SE 0.051, p 0.023), narrow base +0.313 (NW SE 0.059, p <0.001).
The change is significant and survives absorbing the devaluation step, so the slope
shift is the demand relationship moving and not the mechanical level effect of the
December 2023 devaluation.
