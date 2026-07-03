# Debt-sustainability analysis: can the maturity wall be rolled?

Gross financing need (GFN) = IMF repurchases + external non-IMF amortizations
(IMF CR 2026/105, Table 7 / Table 2), netted against projected NIR accumulation
at the program target of +US$8bn/yr. The reported figure is the market
ROLLOVER RATE on external amortizations the program implicitly requires to keep
NIR on its path; above 100% means private rollover alone cannot cover the wall
(new official financing or a reserve drawdown is needed). NIR-accumulation stress
is the config switch PARAMS$dsa$nir_scenarios.

| Year | IMF repurchases | External amort. | GFN (wall) | Program NIR accum (baseline) |
|---|---|---|---|---|
| 2026 | 1.1 | 7.5 | 8.6 | +8.0 |
| 2027 | 4.4 | 7.5 | 11.9 | +8.0 |
| 2028 | 6.6 | 8.0 | 14.6 | +8.0 |
| **Total** | 12.1 | 23.0 | 35.1 | +24.0 |

Required market rollover rate on external amortizations, by NIR-accumulation scenario:

| Year | NIR accum 100% of target | NIR accum 50% of target | NIR accum 0% of target |
|---|---|---|---|
| 2026 | 8% | 61% | 115% |
| 2027 | 52% | 105% | 159% |
| 2028 | 82% | 132% | 182% |
| **Cumulative** | 48% | 100% | 153% |

Verdict: under the full program reserve build the wall is rollable, the required
rollover rate rising to 82% by 2028. At half the reserve accumulation the 2027 and
2028 walls require rollover above 100% — infeasible from private markets alone, so
sustainability becomes contingent on new official money or a deeper NIR drawdown. With
no accumulation the program is unfinanceable from rollover. The wall is therefore
rollable only on the program's own reserve path; it is not self-financing.
