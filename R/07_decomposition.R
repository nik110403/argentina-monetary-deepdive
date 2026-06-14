# Test 2 (sustainability): base-money factors decomposition, seigniorage,
# and the 2026 emission-versus-corridor chart (the centerpiece).
#
# fig01: monthly stacked decomposition of base-money creation by source.
# fig11: cumulative 2026 emission from FX purchases vs the BCRA's projected
#        money-demand corridor (4.2-4.8% of GDP by Dec 2026).

source("R/00_setup.R")

fpath <- file.path(DIR_DATA, "bcra_factors.csv")
if (!file.exists(fpath))
  stop(paste("data/bcra_factors.csv missing — Test 2 is BLOCKED.",
             "Either fix the factors regex (config/series_ids.yaml) or build the",
             "Informe Monetario fallback parser (see plan, Section 5)."))

m <- read_monthly()
fac <- read.csv(fpath, stringsAsFactors = FALSE) |>
  mutate(date = as.Date(date),
         month = lubridate::floor_date(date, "month"))

# ---- monthly sums by factor group ------------------------------------------------
fm <- fac |>
  group_by(month, series) |>
  summarise(value = sum(value, na.rm = TRUE), .groups = "drop")
fw <- stats::reshape(as.data.frame(fm), idvar = "month", timevar = "series",
                     direction = "wide")
names(fw) <- sub("^value\\.", "", names(fw))
fw <- fw |> arrange(month)
groups <- intersect(c("factor_fx_purchases", "factor_treasury",
                      "factor_sterilization", "factor_interest", "factor_other"),
                    names(fw))
cat("Factor groups present:", paste(groups, collapse = ", "), "\n")
save_rds(fw, "fig01_decomposition")

png_fig("fig01_decomposition", {
  X <- as.matrix(fw[, groups]); X[is.na(X)] <- 0
  X <- X / 1000   # assume millions -> billions; VERIFY units against catalog desc
  cols <- c(factor_fx_purchases = PAL$blue, factor_treasury = PAL$crimson,
            factor_sterilization = PAL$amber, factor_interest = PAL$purple,
            factor_other = "#999999")[groups]
  pos <- X; pos[pos < 0] <- 0
  neg <- X; neg[neg > 0] <- 0
  ylim <- range(c(rowSums(pos), rowSums(neg)), na.rm = TRUE)
  plot(fw$month, rowSums(pos), type = "n", ylim = ylim, xlab = "",
       ylab = "ARS bn / month",
       main = "Base-money creation by source (factores de explicación)")
  shade_phases(ylim)
  # stacked bars, positives up / negatives down
  wdt <- 22
  base_p <- rep(0, nrow(X)); base_n <- rep(0, nrow(X))
  for (g in groups) {
    v <- X[, g]
    up <- pmax(v, 0); dn <- pmin(v, 0)
    rect(fw$month - wdt / 2, base_p, fw$month + wdt / 2, base_p + up,
         col = cols[[g]], border = NA)
    rect(fw$month - wdt / 2, base_n + dn, fw$month + wdt / 2, base_n,
         col = grDevices::adjustcolor(cols[[g]], 0.85), border = NA)
    base_p <- base_p + up; base_n <- base_n + dn
  }
  abline(h = 0)
  legend("topleft", sub("^factor_", "", groups), fill = cols, bty = "n",
         cex = 0.75)
})

# ---- seigniorage and inflation tax ------------------------------------------------
require_cols(m, c("base_money", "cpi_headline", "infl_headline"), "07 seign")
sg <- m |>
  mutate(seign_real = (base_money - dplyr::lag(base_money)) / cpi_headline,
         infl_tax   = (infl_headline / 100) *
                      dplyr::lag(base_money) / cpi_headline)
# % of GDP where nominal GDP available.
# UNITS VERIFIED 2026-06-10: datos.gob.ar 4.4_OGP_2004_T_17 reports quarterly
# GDP at ANNUALIZED levels, not quarterly rates — the mean of the four 2022
# values (82.8tn ARS) equals INDEC's official 2022 annual figure (82.6tn).
# Therefore: monthly GDP = value / 12, annual GDP = value as-is (never *4).
if ("gdp_nominal" %in% names(m)) {
  gdp_ann_m <- zoo::na.approx(m$gdp_nominal, x = m$date, na.rm = FALSE)
  gdp_ann_m <- zoo::na.locf(gdp_ann_m, na.rm = FALSE)  # carry Q4-2025 into 2026
  # monthly dM0 over ANNUAL-rate GDP: the 12-month sum equals the annual ratio
  sg$seign_gdp <- 100 * (sg$base_money - dplyr::lag(sg$base_money)) / gdp_ann_m
} else {
  message("  gdp_nominal absent — %GDP columns skipped (fix ingest_fiscal).")
  sg$seign_gdp <- NA_real_
}
save_rds(sg |> select(date, seign_real, infl_tax, seign_gdp), "seigniorage")

# ---- fig11: base money / GDP level vs the corridor, with the 2026 FX flow --------
# Redesigned 2026-06-10. The corridor is a LEVEL target (money demand, % of GDP,
# Dec 2026); comparing a cumulative flow against it was apples-to-oranges. The
# chart now shows (a) the base-money-to-GDP ratio path with the corridor band,
# and (b) the cumulative 2026 FX-purchase emission as the flow that is filling
# it. With the corrected GDP units the ratio sits ~4.5% in May 2026 — inside
# the corridor, not 3pp below it. GDP held at its last annual-rate observation
# (Q4-2025) for 2026 months; disclose in the methodology box.
# VERIFY before publication: which aggregate the BCRA corridor refers to
# (base money vs M2 transaccional) against the primary BCRA program document.
if ("factor_fx_purchases" %in% groups && "gdp_nominal" %in% names(m)) {
  gdp_path <- zoo::na.locf(zoo::na.approx(m$gdp_nominal, x = m$date,
                                          na.rm = FALSE), na.rm = FALSE)
  lvl <- m |>
    mutate(bm_gdp = 100 * base_money / gdp_path) |>
    filter(date >= as.Date("2024-01-01"), !is.na(bm_gdp)) |>
    select(date, bm_gdp)

  y26 <- fw |> filter(month >= as.Date("2026-01-01")) |>
    mutate(cum_fx = cumsum(ifelse(is.na(factor_fx_purchases), 0,
                                  factor_fx_purchases)))
  gdp_last <- tail(stats::na.omit(m$gdp_nominal), 1)   # annual rate, Q4-2025
  y26$cum_fx_gdp <- 100 * y26$cum_fx / gdp_last

  cor_lo <- PARAMS$money_demand_corridor$low
  cor_hi <- PARAMS$money_demand_corridor$high
  save_rds(list(level = lvl, path = y26, corridor = c(cor_lo, cor_hi),
                gdp_vintage = "Q4-2025 annual rate, held constant for 2026"),
           "fig11_corridor")
  png_fig("fig11_corridor", {
    xlim <- c(min(lvl$date), as.Date("2026-12-31"))
    ylim <- c(min(c(lvl$bm_gdp, y26$cum_fx_gdp, 0), na.rm = TRUE),
              max(c(lvl$bm_gdp, cor_hi), na.rm = TRUE) * 1.1)
    plot(NA, xlim = xlim, ylim = ylim, xlab = "", ylab = "% of GDP",
         main = "Base money vs the BCRA money-demand corridor")
    rect(as.Date("2026-01-01"), cor_lo, xlim[2], cor_hi,
         col = grDevices::adjustcolor(PAL$green, 0.15), border = NA)
    text(xlim[2], cor_hi, sprintf("BCRA corridor %.1f-%.1f%% (Dec 2026)",
                                  cor_lo, cor_hi), adj = c(1, -0.5), cex = 0.7)
    lines(lvl$date, lvl$bm_gdp, col = PAL$dark, lwd = 2.5)
    lines(y26$month, y26$cum_fx_gdp, col = PAL$blue, lwd = 2, type = "b", pch = 16)
    legend("topleft", c("Base money / GDP (level)",
                        "Cumulative 2026 FX-purchase emission"),
           bty = "n", col = c(PAL$dark, PAL$blue), lwd = c(2.5, 2), cex = 0.8)
  })
} else message("  fig11 skipped (factors or GDP missing).")

message("07_decomposition done.")
