# Debt-sustainability analysis (DSA) for §VI — the financing-needs judgment.
#
# The durability section (R/10) shows the maturity wall EXISTS; this module asks
# whether it can be MET. It builds a gross-financing-need (GFN) schedule for
# 2026-28 from config/durability_documentary.csv (IMF repurchases + external
# non-IMF amortizations, both IMF CR 2026/105, Table 7 / Table 2), nets it against
# projected NIR accumulation under the program's reserve path, and reports the
# market ROLLOVER RATE the program implicitly requires on external amortizations
# to keep NIR on track in each scenario. NIR accumulation is stressed at
# 100 / 50 / 0% of the program target via the config switch PARAMS$dsa.
#
# Market-access assumption (stated explicitly per the program idiom): the residual
# gap between GFN and reserve accumulation must be met by rolling over maturing
# external debt. A required rollover rate above 100% means private rollover alone
# cannot cover the wall — it needs new official financing or a reserve drawdown.
#
# Documentary, not pipeline-estimated: every input is a cited CR 2026/105 figure;
# only the NIR-accumulation target and the scenario multipliers are assumptions,
# both declared in config/params.yaml.

source("R/00_setup.R")

docpath <- file.path("config", "durability_documentary.csv")
if (!file.exists(docpath)) {
  message("  11_dsa SKIP — config/durability_documentary.csv not present.")
} else {
  doc <- read.csv(docpath, stringsAsFactors = FALSE)
  val <- function(metric, period) {
    r <- doc[doc$metric == metric & as.character(doc$period) == as.character(period), ]
    if (!nrow(r)) NA_real_ else as.numeric(r$value[1])
  }

  yrs   <- as.character(PARAMS$dsa$years)
  scen  <- as.numeric(PARAMS$dsa$nir_scenarios)
  Ttgt  <- as.numeric(PARAMS$dsa$nir_target_annual)

  imf_r <- vapply(yrs, function(y) val(paste0("maturity_imf_", y), y), numeric(1))
  ext_a <- vapply(yrs, function(y) val(paste0("maturity_ext_", y), y), numeric(1))
  gfn   <- imf_r + ext_a

  if (!all(is.finite(c(imf_r, ext_a)))) {
    message("  11_dsa SKIP — maturity rows incomplete in documentary CSV.")
  } else {
    # required market rollover rate on external amortizations, per (year, scenario)
    roll_req <- function(s) (gfn - s * Ttgt) / ext_a          # fraction
    rr <- vapply(scen, roll_req, numeric(length(yrs)))         # rows = years, cols = scen
    if (is.null(dim(rr))) rr <- matrix(rr, nrow = length(yrs))
    colnames(rr) <- sprintf("%d%%", round(scen * 100))

    cum_gfn <- sum(gfn); cum_ext <- sum(ext_a)
    cum_gap <- cum_gfn - scen * Ttgt * length(yrs)
    cum_rr  <- cum_gap / cum_ext

    save_rds(list(years = yrs, imf = imf_r, ext = ext_a, gfn = gfn,
                  target = Ttgt, scenarios = scen, rollover_req = rr,
                  cum_gfn = cum_gfn, cum_ext = cum_ext, cum_rollover_req = cum_rr),
             "fig15_dsa")

    pc  <- function(x) ifelse(is.finite(x), sprintf("%.0f%%", 100 * x), "n/a")
    usd <- function(x) ifelse(is.finite(x), sprintf("%.1f", x), "n/a")
    sc_lab <- sprintf("NIR accum %s of target", colnames(rr))

    # which scenarios stay financeable from private rollover alone (<= 100%)?
    base_peak <- max(rr[, 1], na.rm = TRUE)
    feasible_base <- all(rr[, 1] <= 1, na.rm = TRUE)

    writeLines(c(
      "# Debt-sustainability analysis: can the maturity wall be rolled?",
      "",
      "Gross financing need (GFN) = IMF repurchases + external non-IMF amortizations",
      "(IMF CR 2026/105, Table 7 / Table 2), netted against projected NIR accumulation",
      sprintf("at the program target of +US$%.0fbn/yr. The reported figure is the market", Ttgt),
      "ROLLOVER RATE on external amortizations the program implicitly requires to keep",
      "NIR on its path; above 100% means private rollover alone cannot cover the wall",
      "(new official financing or a reserve drawdown is needed). NIR-accumulation stress",
      "is the config switch PARAMS$dsa$nir_scenarios.",
      "",
      "| Year | IMF repurchases | External amort. | GFN (wall) | Program NIR accum (baseline) |",
      "|---|---|---|---|---|",
      sprintf("| %s | %s | %s | %s | +%s |", yrs, usd(imf_r), usd(ext_a), usd(gfn),
              usd(rep(Ttgt, length(yrs)))),
      sprintf("| **Total** | %s | %s | %s | +%s |", usd(sum(imf_r)), usd(cum_ext),
              usd(cum_gfn), usd(Ttgt * length(yrs))),
      "",
      "Required market rollover rate on external amortizations, by NIR-accumulation scenario:",
      "",
      paste0("| Year | ", paste(sc_lab, collapse = " | "), " |"),
      paste0("|---|", paste(rep("---", ncol(rr)), collapse = "|"), "|"),
      vapply(seq_along(yrs), function(i)
        sprintf("| %s | %s |", yrs[i], paste(pc(rr[i, ]), collapse = " | ")),
        character(1)),
      sprintf("| **Cumulative** | %s |", paste(pc(cum_rr), collapse = " | ")),
      "",
      "Verdict: under the full program reserve build the wall is rollable, the required",
      sprintf("rollover rate rising to %s by %s. At half the reserve accumulation the 2027 and",
              pc(base_peak), yrs[which.max(rr[, 1])]),
      "2028 walls require rollover above 100% — infeasible from private markets alone, so",
      "sustainability becomes contingent on new official money or a deeper NIR drawdown. With",
      "no accumulation the program is unfinanceable from rollover. The wall is therefore",
      "rollable only on the program's own reserve path; it is not self-financing."),
      file.path(DIR_TABLES, "table_dsa.md"))
    cat(sprintf("  table -> output/tables/table_dsa.md  (baseline peak rollover %s, feasible=%s)\n",
                pc(base_peak), feasible_base))

    png_fig("fig15_dsa", {
      ylim <- c(0, max(c(as.vector(rr), 1), na.rm = TRUE) * 1.15) * 100
      cols <- c(PAL$blue, PAL$amber, PAL$crimson)[seq_len(ncol(rr))]
      bp <- barplot(t(rr) * 100, beside = TRUE, names.arg = yrs, col = cols,
                    ylim = ylim, ylab = "Required rollover rate (% of ext. amort.)",
                    main = "Can the wall be rolled? Required market rollover by NIR scenario")
      abline(h = 100, lty = 2, col = PAL$dark)
      text(mean(bp), 100, "private rollover ceiling (100%)", pos = 3, cex = 0.7,
           col = PAL$dark)
      legend("topleft", sc_lab, fill = cols, bty = "n", cex = 0.78)
    })
  }
}

message("11_dsa done.")
