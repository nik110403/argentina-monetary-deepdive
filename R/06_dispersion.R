# Dispersion chart (descriptive only; Austrian block payload on Test 2).
#
# Weighted cross-sectional dispersion of the 12 INDEC division inflation rates,
# and of relative price levels vs their phase-0 mean. ONE annotated chart.
# NO break tests, NO regressions: the chart illustrates a theoretical
# prediction and never claims statistical identification.
#
# Citation lineage for the prose: Vining & Elwertowski (1976), Parks (1978),
# Bryan & Cecchetti; Balke & Wynne (Fed-adjacent); Mises/Horwitz for the
# Cantillon framing. (Debelle & Lamont is city-level work — do not cite here.)

source("R/00_setup.R")

div_path <- file.path(DIR_DATA, "cpi_divisions.csv")
if (!file.exists(div_path))
  stop("data/cpi_divisions.csv missing — run ingest_indec.py first.")

div <- read.csv(div_path, stringsAsFactors = FALSE) |>
  mutate(date = as.Date(date))
w <- read.csv("config/indec_division_weights.csv", stringsAsFactors = FALSE) |>
  mutate(weight = weight_pct / sum(weight_pct))   # renormalize to sum to 1

div <- div |>
  inner_join(w |> select(division, weight), by = c("series" = "division")) |>
  arrange(series, date) |>
  group_by(series) |>
  mutate(infl = (value / dplyr::lag(value) - 1) * 100) |>
  ungroup()

# headline (weighted mean of divisions) and weighted dispersion D_t
disp <- div |>
  filter(!is.na(infl)) |>
  group_by(date) |>
  summarise(pi_bar = sum(weight * infl) / sum(weight),
            D = sqrt(sum(weight * (infl - pi_bar)^2) / sum(weight)),
            n = n(), .groups = "drop") |>
  filter(n >= 10)   # require nearly all divisions present

# relative price levels vs phase-0 mean
p0_end <- PHASES$end[PHASES$phase == 0]
rel <- div |>
  group_by(series) |>
  mutate(rel = log(value) - log(mean(value[date <= p0_end], na.rm = TRUE))) |>
  ungroup() |>
  group_by(date) |>
  mutate(rel_dev = rel - sum(weight * rel) / sum(weight)) |>
  summarise(D_level = sqrt(sum(weight * rel_dev^2) / sum(weight)) * 100,
            .groups = "drop")

disp <- disp |> left_join(rel, by = "date")
save_rds(disp, "fig05_dispersion")

# The dispersion CHART was cut in the scorecard reframe (it "does not identify").
# The series is retained as a descriptive TABLE so the prose's phase-mean numbers
# are auditable without resurrecting the figure. Phase windows match the prose.
disp_ph <- disp |>
  filter(!is.na(D)) |>
  mutate(phase = dplyr::case_when(
    date <= as.Date("2023-11-30") ~ "0 Peronist baseline",
    date <= as.Date("2025-03-31") ~ "1 Crawling peg",
    date <= as.Date("2025-12-31") ~ "2 IMF band",
    TRUE                          ~ "3 Indexed band")) |>
  group_by(phase) |>
  summarise(D_mean = mean(D, na.rm = TRUE), months = dplyr::n(), .groups = "drop")
may_D <- disp$D[disp$date == as.Date("2026-05-01")]
may_row <- if (length(may_D) == 1 && is.finite(may_D))
  sprintf("| May 2026 (latest print) | %.2f | 1 |", may_D) else NULL
writeLines(c(
  "# Weighted cross-division CPI inflation dispersion, by phase", "",
  "Weighted standard deviation of the twelve INDEC division inflation rates,",
  "averaged within each regime phase. Descriptive only: the measure illustrates",
  "the relative-price prediction and does not identify a Cantillon impulse",
  "(regulated-tariff catch-up is not separated from monetary dispersion).", "",
  "| Phase | Mean dispersion (pp) | Months |",
  "|---|---|---|",
  sprintf("| %s | %.2f | %d |", disp_ph$phase, disp_ph$D_mean, disp_ph$months),
  may_row),
  file.path(DIR_TABLES, "table_dispersion.md"))
cat("  table -> output/tables/table_dispersion.md\n")

cat(sprintf("Dispersion series: %d months, %s..%s\n",
            nrow(disp), min(disp$date), max(disp$date)))
message("06_dispersion done (table only — chart cut in the scorecard reframe).")
