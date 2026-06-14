# Event study: September-October 2025 sequence

Abnormal change vs the mean of t-30..t-11. Headline inference is a placebo
distribution: the same post-window (t0..t+10) abnormal mean recomputed on every
non-event trading day (excluding a +/- placebo-guard band around the real events);
`placebo p` is the two-sided empirical rank of the actual abnormal in that null.
`boot se` is a moving-block bootstrap SE (block = 5, B = 2000). The Newey-West t
is secondary and reported only for continuity with the prior draft.

`placebo p (full)` draws pseudo-events from the whole sample; `placebo p (narrow)`
restricts the pool to the post-Dec-2023 stabilization regime (comparable volatility).
The full pool spans 2022 hyperinflation, which widens the null and biases p upward,
so a result that survives BOTH pools is the robust one.

| Event | Series | Baseline | Mean abnormal (post) | Boot SE | Placebo p (full) | Placebo p (narrow) | NW t | n post | n plac. full | n plac. narrow |
|---|---|---|---|---|---|---|---|---|---|---|
| ba_election | gap_blue | 0.1 | -0.9 | 0.86 | 0.899 | 0.852 | -0.95 | 11 | 952 | 514 |
| us_swap | gap_blue | -0.3 | +3.2 | 0.33 | 0.716 | 0.596 | 7.05 | 11 | 952 | 514 |
| midterms | gap_blue | 2.2 | -2.4 | 0.54 | 0.770 | 0.660 | -3.63 | 11 | 952 | 514 |
| ba_election | embi | 731.2 | +453.7 | 56.42 | 0.065 | 0.022 | 8.11 | 11 | 940 | 508 |
| us_swap | embi | 1053.3 | -2.5 | 18.16 | 0.990 | 0.988 | -0.15 | 11 | 940 | 508 |
| midterms | embi | 1150.2 | -497.3 | 11.11 | 0.041 | 0.020 | -38.97 | 11 | 940 | 508 |
