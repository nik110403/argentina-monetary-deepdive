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

png_fig("fig05_dispersion", {
  ylim <- range(disp$D, na.rm = TRUE)
  plot(disp$date, disp$D, type = "n", ylim = ylim, xlab = "",
       ylab = "Weighted SD of division inflation (pp)",
       main = "Cross-division relative price dispersion — descriptive")
  shade_phases(ylim)
  lines(disp$date, disp$D, col = PAL$purple, lwd = 2)
  lines(disp$date, zoo::rollmean(disp$D, 3, fill = NA), col = PAL$dark,
        lwd = 1.2, lty = 2)
  mark_events(ylim, slugs = c("caputo_deval", "phase2", "imf_band",
                              "indexed_band_start"))
  legend("topright", c("D_t (monthly)", "3m moving average"), bty = "n",
         col = c(PAL$purple, PAL$dark), lwd = c(2, 1.2), lty = c(1, 2), cex = 0.8)
})

cat(sprintf("Dispersion series: %d months, %s..%s\n",
            nrow(disp), min(disp$date), max(disp$date)))
message("06_dispersion done (descriptive only — no tests, by design).")
