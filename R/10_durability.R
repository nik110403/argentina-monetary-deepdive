# Durability exhibits for the scorecard's §VI ("Delivered — resting on what?").
#
# Three exhibits:
#   fig13_unwind  — the remunerated-liability unwind (PIPELINE data). The Austrian
#                   monetary-calculation pillar, corrected: the LEFI/pases machine
#                   was not a standing overhang at the May-2026 vintage — it was
#                   wound DOWN. factor_sterilization collapses to zero by mid-2025
#                   and the discrete July-2025 LEFI elimination lands as a one-off
#                   base expansion in factor_other (~ARS 9.9tn, documented). The
#                   distortion was removed, paid for by a one-off jump in the base.
#   fig12_nir     — net vs gross reserves and the borrowed (EFF) component
#                   (DOCUMENTARY, config/durability_documentary.csv).
#   fig14_cover   — reserve cover and the 2026-27 maturity wall (DOCUMENTARY).
#
# fig12/fig14 render only if the documentary CSV is present; otherwise they SKIP
# (same graceful-degradation contract as the optional ingests). This keeps the
# pipeline green while the IMF primary figures are being verified.

source("R/00_setup.R")

# ============================================================================
# fig13 — the remunerated-liability unwind (pipeline; no documentary input)
# ============================================================================
fpath <- file.path(DIR_DATA, "bcra_factors.csv")
if (!file.exists(fpath)) {
  message("  fig13 SKIP — data/bcra_factors.csv missing.")
} else {
  fac <- read.csv(fpath, stringsAsFactors = FALSE) |>
    mutate(month = lubridate::floor_date(as.Date(date), "month"))
  fm <- fac |>
    group_by(month, series) |>
    summarise(value = sum(value, na.rm = TRUE), .groups = "drop")
  ster  <- fm |> filter(series == "factor_sterilization") |>
    transmute(month, sterilization = value / 1000)            # ARS bn
  other <- fm |> filter(series == "factor_other") |>
    transmute(month, other = value / 1000)
  u <- ster |> full_join(other, by = "month") |> arrange(month)

  # The LEFI elimination: the single largest positive 'other' month in 2025 H2,
  # which carries the ~ARS 9.9tn one-off base expansion (BCRA Comunicado, Jul-2025).
  u2025h2 <- u |> filter(month >= as.Date("2025-07-01"))
  elim_month <- u2025h2$month[which.max(u2025h2$other)]
  elim_val   <- max(u2025h2$other, na.rm = TRUE)
  # Date the cessation: first month sterilization sits at zero and stays there.
  zero_run <- u |> filter(month >= as.Date("2025-01-01"))
  cease_month <- zero_run$month[which(zero_run$sterilization == 0)][1]

  save_rds(list(series = u, elim_month = elim_month, elim_val = elim_val,
                cease_month = cease_month), "fig13_unwind")

  png_fig("fig13_unwind", {
    ylim <- range(c(u$sterilization, u$other, 0), na.rm = TRUE)
    plot(u$month, u$sterilization, type = "n", ylim = ylim, xlab = "",
         ylab = "ARS bn / month",
         main = "The remunerated-liability unwind (sterilization factor)")
    shade_phases(ylim)
    abline(h = 0, col = grDevices::adjustcolor(PAL$dark, 0.5))
    # the sterilization operations: positive = monetary expansion from unwinding
    lines(u$month, u$sterilization, col = PAL$amber, lwd = 2, type = "h")
    lines(u$month, u$sterilization, col = PAL$amber, lwd = 1.6)
    # mark the LEFI elimination one-off (carried in factor_other)
    points(elim_month, elim_val, col = PAL$crimson, pch = 19, cex = 1.1)
    text(elim_month, elim_val, "LEFI elimination\n(one-off base expansion)",
         pos = 2, cex = 0.7, col = PAL$crimson)
    if (!is.na(cease_month))
      abline(v = cease_month, lty = 3, col = PAL$blue)
    legend("topleft",
           c("Sterilization factor (ARS bn/mo)", "LEFI elimination one-off",
             "sterilization ceases"),
           col = c(PAL$amber, PAL$crimson, PAL$blue),
           lwd = c(2, NA, 1), pch = c(NA, 19, NA), lty = c(1, NA, 3),
           bty = "n", cex = 0.75)
  })
  cat(sprintf("  fig13: sterilization ceases %s; LEFI elimination one-off ~ARS %.0fbn (%s)\n",
              format(cease_month), elim_val, format(elim_month)))
}

# ============================================================================
# fig12 / fig14 — documentary exhibits (render only if the CSV is present)
# ============================================================================
docpath <- file.path("config", "durability_documentary.csv")
if (!file.exists(docpath)) {
  message("  fig12/fig14 SKIP — config/durability_documentary.csv not present ",
          "(IMF primary figures pending verification).")
} else {
  doc <- read.csv(docpath, stringsAsFactors = FALSE)
  val <- function(metric, period) {
    r <- doc[doc$metric == metric & as.character(doc$period) == as.character(period), ]
    if (!nrow(r)) NA_real_ else as.numeric(r$value[1])
  }

  # ---- fig12: gross vs net (NIR) reserves, 2024-26 ----------------------------
  # The durability headline. Gross reserves rise while NIR stays deeply negative:
  # the buffer is borrowed/encumbered (swap lines, FX-deposit reserve reqs, Fund
  # credit). Both series are from IMF CR 2026/105, the May-2026-vintage primary.
  yrs <- c("2024", "2025", "2026")
  gross <- vapply(yrs, function(y) val("gross_reserves", y), numeric(1))
  nir   <- vapply(yrs, function(y) val("nir", y), numeric(1))
  if (all(is.finite(c(gross, nir)))) {
    wedge <- c(pboc = val("pboc_swap", 2025), bis = val("bis_swap", 2025),
               repo = val("bcra_repo", 2025))
    save_rds(list(years = yrs, gross = gross, nir = nir, wedge = wedge,
                  ara_2025 = val("ara_fixed_pct", 2025),
                  doc = doc[grepl("reserve|^nir|swap|repo|ara", doc$metric), ]),
             "fig12_nir")
    png_fig("fig12_nir", {
      M <- rbind(Gross = gross, NIR = nir)
      ylim <- range(c(M, 0), na.rm = TRUE) * c(1.1, 1.15)
      bp <- barplot(M, beside = TRUE, names.arg = yrs,
                    col = c(PAL$blue, PAL$crimson), ylim = ylim, ylab = "USD bn",
                    main = "Gross vs net international reserves (NIR)")
      abline(h = 0)
      text(as.vector(bp), as.vector(M), sprintf("%.1f", as.vector(M)),
           pos = ifelse(as.vector(M) >= 0, 3, 1), cex = 0.72)
      legend("topleft", c("Gross reserves", "Net (NIR)"),
             fill = c(PAL$blue, PAL$crimson), bty = "n", cex = 0.8)
    })
    cat(sprintf("  fig12_nir rendered: end-2025 gross %.1f vs NIR %.1f (USD bn).\n",
                gross[2], nir[2]))
  } else message("  fig12 SKIP — gross/nir rows incomplete in documentary CSV.")

  # ---- fig14: the 2026-28 external maturity wall (IMF + non-IMF), stacked ------
  wyrs <- c("2026", "2027", "2028")
  imf <- vapply(wyrs, function(y) val(paste0("maturity_imf_", y), y), numeric(1))
  ext <- vapply(wyrs, function(y) val(paste0("maturity_ext_", y), y), numeric(1))
  if (all(is.finite(c(imf, ext)))) {
    save_rds(list(years = wyrs, imf = imf, ext = ext, total = imf + ext),
             "fig14_cover")
    png_fig("fig14_cover", {
      M <- rbind(IMF = imf, External = ext)
      tot <- imf + ext
      ylim <- c(0, max(tot, na.rm = TRUE) * 1.18)
      bp <- barplot(M, names.arg = wyrs, col = c(PAL$crimson, PAL$amber),
                    ylim = ylim, ylab = "USD bn",
                    main = "The 2026-28 external maturity wall")
      text(bp, tot, sprintf("%.1f", tot), pos = 3, cex = 0.8)
      legend("topleft", c("IMF repurchases", "External (non-IMF) amortizations"),
             fill = c(PAL$crimson, PAL$amber), bty = "n", cex = 0.8)
    })
    cat(sprintf("  fig14_cover rendered: wall %.1f / %.1f / %.1f USD bn (2026-28).\n",
                (imf + ext)[1], (imf + ext)[2], (imf + ext)[3]))
  } else message("  fig14 SKIP — maturity_* rows incomplete in documentary CSV.")
}

message("10_durability done.")
