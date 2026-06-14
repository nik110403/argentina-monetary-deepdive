# Phase-annotated descriptives + summary table.
# Produces chart data and PNGs for (provisional numbering, priority order):
#   fig02 inflation with phases + crawl/band-rate overlay
#   fig03 parallel gap daily with event flags
#   fig04 remonetization paths (real base, real M2)
#   fig06 ITCRM
#   fig07 reserves daily, annotated

source("R/00_setup.R")

m <- read_monthly()
d <- read_daily()
require_cols(m, c("infl_headline", "infl_core", "phase"), "01_descriptives")

# ---- crawl / band-edge overlay (% per month) ----------------------------------
# Phases 1-2 from the announced schedule; phase 3 edges move at CPI(t-2).
crawl <- bind_rows(lapply(PARAMS$crawl_schedule, as.data.frame)) |>
  mutate(start = as.Date(start), end = as.Date(end))
m$band_rate <- NA_real_
for (i in seq_len(nrow(crawl))) {
  idx <- m$date >= crawl$start[i] & m$date <= crawl$end[i]
  m$band_rate[idx] <- crawl$rate[i]
}
idx3 <- m$date >= as.Date(PARAMS$inertia$regime_break)
m$band_rate[idx3] <- dplyr::lag(m$infl_headline, 2)[idx3]

# ---- summary table by phase ----------------------------------------------------
tab <- m |>
  filter(!is.na(phase)) |>
  group_by(phase, phase_label) |>
  summarise(
    months          = sum(!is.na(infl_headline)),
    infl_mean       = mean(infl_headline, na.rm = TRUE),
    infl_core_mean  = mean(infl_core, na.rm = TRUE),
    gap_mean        = if ("gap_blue" %in% names(m)) mean(gap_blue, na.rm = TRUE) else NA,
    rem_12m_mean    = if ("rem_infl_12m" %in% names(m)) mean(rem_infl_12m, na.rm = TRUE) else NA,
    .groups = "drop")
md <- c("# Phase summary (monthly means)", "",
        "| Phase | Label | Months | Headline m/m % | Core m/m % | Gap % | REM 12m % |",
        "|---|---|---|---|---|---|---|",
        sprintf("| %d | %s | %d | %.1f | %.1f | %.1f | %.1f |",
                tab$phase, tab$phase_label, tab$months, tab$infl_mean,
                tab$infl_core_mean, tab$gap_mean, tab$rem_12m_mean))
writeLines(md, file.path(DIR_TABLES, "table1_phase_summary.md"))
cat("  table -> output/tables/table1_phase_summary.md\n")

# ---- fig02: inflation with phases and band-rate overlay ------------------------
df2 <- m |> select(date, infl_headline, infl_core, infl_regulated, band_rate, phase)
save_rds(df2, "fig02_inflation")
png_fig("fig02_inflation_phases", {
  ylim <- range(c(df2$infl_headline, df2$band_rate), na.rm = TRUE)
  plot(df2$date, df2$infl_headline, type = "n", ylim = ylim,
       xlab = "", ylab = "% m/m", main = "Monthly inflation and the exchange-rate rule")
  shade_phases(ylim)
  lines(df2$date, df2$infl_headline, col = PAL$crimson, lwd = 2)
  lines(df2$date, df2$infl_core, col = PAL$dark, lwd = 1.5, lty = 2)
  lines(df2$date, df2$band_rate, col = PAL$blue, lwd = 2)
  legend("topright", c("Headline", "Core", "Crawl/band rate"), bty = "n",
         col = c(PAL$crimson, PAL$dark, PAL$blue), lwd = 2, lty = c(1, 2, 1), cex = 0.8)
})

# ---- fig03: daily parallel gap with event flags --------------------------------
if ("gap_blue" %in% names(d)) {
  df3 <- d |> select(date, any_of(c("gap_blue", "gap_ccl")), phase)
  save_rds(df3, "fig03_gap")
  png_fig("fig03_gap_events", {
    ylim <- range(df3$gap_blue, na.rm = TRUE)
    plot(df3$date, df3$gap_blue, type = "n", ylim = ylim, xlab = "",
         ylab = "%", main = "Parallel exchange-rate gap (blue vs A3500)")
    shade_phases(ylim)
    lines(df3$date, df3$gap_blue, col = PAL$blue, lwd = 1.2)
    if ("gap_ccl" %in% names(df3))
      lines(df3$date, df3$gap_ccl, col = PAL$amber, lwd = 1)
    mark_events(ylim)
  })
} else message("  gap_blue absent — fig03 skipped (bluelytics ingest missing?)")

# ---- fig04: remonetization -----------------------------------------------------
if (all(c("real_base", "real_m2") %in% names(m))) {
  df4 <- m |> select(date, real_base, real_m2, phase) |>
    mutate(real_base = real_base / real_base[which(date == as.Date("2023-12-01"))] * 100,
           real_m2   = real_m2   / real_m2[which(date == as.Date("2023-12-01"))] * 100)
  save_rds(df4, "fig04_remonetization")
  png_fig("fig04_remonetization", {
    ylim <- range(c(df4$real_base, df4$real_m2), na.rm = TRUE)
    plot(df4$date, df4$real_base, type = "n", ylim = ylim, xlab = "",
         ylab = "Index, Dec 2023 = 100", main = "Real money balances")
    shade_phases(ylim)
    lines(df4$date, df4$real_base, col = PAL$blue, lwd = 2)
    lines(df4$date, df4$real_m2, col = PAL$green, lwd = 2)
    legend("topleft", c("Real monetary base", "Real private transactional M2"),
           bty = "n", col = c(PAL$blue, PAL$green), lwd = 2, cex = 0.8)
  })
}

# ---- fig06: ITCRM ---------------------------------------------------------------
if ("itcrm" %in% names(m)) {
  df6 <- m |> select(date, itcrm, phase)
  save_rds(df6, "fig06_itcrm")
  png_fig("fig06_itcrm", {
    ylim <- range(df6$itcrm, na.rm = TRUE)
    plot(df6$date, df6$itcrm, type = "n", ylim = ylim, xlab = "",
         ylab = "Index (17-Dec-2015 = 100)",
         main = "Real multilateral exchange rate (ITCRM)")
    shade_phases(ylim)
    lines(df6$date, df6$itcrm, col = PAL$purple, lwd = 2)
  })
}

# ---- fig07: reserves daily ------------------------------------------------------
if ("reserves_gross" %in% names(d)) {
  df7 <- d |> select(date, reserves_gross, phase) |> filter(!is.na(reserves_gross))
  save_rds(df7, "fig07_reserves")
  png_fig("fig07_reserves", {
    ylim <- range(df7$reserves_gross, na.rm = TRUE)
    plot(df7$date, df7$reserves_gross, type = "n", ylim = ylim, xlab = "",
         ylab = "USD mn", main = "Gross international reserves")
    shade_phases(ylim)
    lines(df7$date, df7$reserves_gross, col = PAL$dark, lwd = 1.5)
    mark_events(ylim, slugs = c("ba_election", "us_swap", "midterms",
                                "indexed_band_start"))
  })
}

save_rds(m, "panel_monthly_enriched")   # with band_rate, reused downstream
message("01_descriptives done.")
