# Anchors Away — Argentina Monetary Stabilization, 2023–2026

Replication repository for the deep dive *Anchors Away: Promises, Statutes, and the
Monetary Stabilization of Argentina, 2023–2026* (nikkhosravipour.com/research).

Python ingests and cleans; R analyzes; outputs are Chart.js HTML widgets for the
site plus static PNG fallbacks and markdown/HTML regression tables. The pipeline
mirrors the Taylor-rule deep dive repo so the two projects read as one research
program.

## Data vintage statement

**VINTAGE NOT YET LOCKED.** Raw downloads are frozen the day after the May 2026
CPI print (expected June 10–12, 2026). After the freeze, set `vintage_locked: true`
in `config/params.yaml` and record the date here. Every raw download is
timestamped under `data-raw/{source}/{YYYY-MM-DD}/` and never overwritten.

## Replication

```sh
make deps        # python venv + pip install, R package install
make bcra-cert   # one-time: build the BCRA TLS chain bundle (see below)
make ingest      # run all python ingest scripts -> data/
make panel       # build data/panel_monthly.csv + data/panel_daily.csv
make analysis    # R modules 00-08 (run_all.R)
make charts      # R module 09 -> output/widgets/*.html + output/figures/*.png
make all         # everything above except deps and bcra-cert
```

## The BCRA TLS workaround

The BCRA API server (`api.bcra.gob.ar`) serves an incomplete certificate chain.
Verification is **not** disabled; instead `make bcra-cert` exports the full chain
presented by the server via `openssl s_client -showcerts` into
`config/bcra_chain.pem`, which the ingest scripts use as the CA bundle (override
with the `BCRA_CA_BUNDLE` env var). If the certificate ever rotates, re-run
`make bcra-cert`.

## Where things can drift (check on first run)

- **BCRA series IDs** are never hardcoded. `ingest_bcra.py` queries the variable
  catalog and matches descriptions against the regexes in
  `config/series_ids.yaml`. If a regex matches zero or multiple variables the
  script dumps the catalog to `data-raw/bcra/` and tells you which regex to fix.
- **File URLs** (INDEC cuadros, REM database, ITCRM) live in `config/urls.yaml`.
  INDEC and REM filenames change; the scripts scrape the landing pages as a
  fallback, but if both fail, paste the current link into `config/urls.yaml`.
- **Ámbito endpoints** (EMBI, MEP, CCL) are semi-official and may change shape.
- **Comparators**: monthly CPI for Israel 1985 and Brazil 1994 come from FRED's
  keyless CSV endpoint and the BCB SGS API respectively, not IMF IFS — the IFS
  SDMX API was migrated in 2025 and the legacy endpoint retired. Same numbers,
  stable access, no key needed.

## Event registry

`config/events.csv`. Dates marked `VERIFY` must be confirmed against Boletín
Oficial entries, BCRA "Comunicación A" communiqués, or IMF press releases during
ingest, and the primary-source citation recorded in the `source` column. Every
date in the published piece must trace to a primary document.

## INDEC division weights

`config/indec_division_weights.csv` holds the national IPC division weights
(base December 2016). **Verify against the INDEC IPC methodology document before
publication** — the dispersion measure renormalizes them to sum to one, so small
errors do not propagate, but the cited values must be exact.

## Layout

See `NOTES_` planning file in the vault for the full architecture. Scripts:

| Script | Role |
|---|---|
| `python/ingest_*.py` | one source each; snapshot raw, write tidy csv to `data/` |
| `python/build_panel.py` | merge to monthly + daily panels with phase and event flags |
| `R/00_setup.R` | packages, paths, phases, palette, helpers |
| `R/01_descriptives.R` | phase-annotated series, summary table, figs 2/4/6/7 (provisional numbering: 3 is built in 05) |
| `R/02_money_demand.R` | Test 1: Gagnon replication + extension, recursive elasticity (fig 9) |
| `R/03_inertia.R` | Test 3 support: descriptive persistence; pre-registered follow-up block (NOT RUN) |
| `R/04_passthrough.R` | local projections pass-through by phase (appendix) |
| `R/05_events.R` | Sep–Oct 2025 event study (figs 3, 10) |
| `R/06_dispersion.R` | dispersion chart, descriptive only (fig 5) |
| `R/07_decomposition.R` | Test 2: base-money factors, seigniorage, 2026 corridor (figs 1, 11) |
| `R/08_comparative.R` | aligned-path chart: Israel 1985, Brazil 1994 (fig 8) |
| `R/09_export_charts.R` | Chart.js HTML widgets from saved chart data |

Figure files are numbered provisionally by the visualization-plan priority order;
the published piece renumbers captions by reading order (embeds keep file names).

## License

Source data is public (BCRA, INDEC, REM, FRED, BCB, and others) and remains
subject to each provider's terms. The code and generated figures in this
repository are licensed under [CC BY 4.0](LICENSE) — reuse with attribution.
