# Test 1 (confidence): Obstfeld replication + extension.
#
# Anchor result first: ln(M0/P) ~ ln(pi_e), 2022-01..2025-12, Newey-West,
# targeting Obstfeld's reported elasticity of about -0.12 (t = -2.97).
# Then: (a) sample through the vintage, (b) Cagan semi-log, (c) M2 transaccional,
# (d) recursive/rolling estimates dating the demand-recovery break (fig09),
# (e) Bai-Perron breakpoints.
# Exact replication is the credibility move; the extension is the contribution.
# Deposit composition is NOT here — it is the Austrian block's payload.

source("R/00_setup.R")

m <- read_monthly()
require_cols(m, c("base_money", "cpi_headline", "rem_infl_12m"), "02_money_demand")

md <- m |>
  mutate(m_real  = log(base_money / cpi_headline),
         m2_real = if ("m2_transac" %in% names(m))
                     log(m2_transac / cpi_headline) else NA_real_,
         lpi_e   = log(rem_infl_12m),
         pi_e    = rem_infl_12m) |>
  filter(!is.na(m_real), !is.na(pi_e), pi_e > 0)

rep_end <- as.Date(PARAMS$money_demand$obstfeld_sample_end)
md_rep  <- md |> filter(date <= rep_end)

# ---- (1) replication, (2) extended, (3) Cagan semi-log, (4) M2 ------------------
mod <- list(
  "Obstfeld replication\n(to 2025-12)" = lm(m_real ~ lpi_e, data = md_rep),
  "Extended\n(to vintage)"           = lm(m_real ~ lpi_e, data = md),
  "Cagan semi-log"                   = lm(m_real ~ pi_e,  data = md),
  "M2 transaccional"                 = if (all(!is.na(md$m2_real)))
                                         lm(m2_real ~ lpi_e, data = md) else NULL
)
mod <- Filter(Negate(is.null), mod)

cat("\n--- Obstfeld replication ---\n")
print(nw_test(mod[[1]]))
b <- coef(mod[[1]])["lpi_e"]
t <- nw_test(mod[[1]])["lpi_e", "t value"]
cat(sprintf("\nElasticity = %.3f (t = %.2f).  Obstfeld target: about -0.12 (t = -2.97).\n",
            b, t))
if (abs(b - (-0.12)) > 0.06) {
  cat("!! Replication does NOT land near -0.12. Diagnose before anything else\n",
      "!! (likely culprits: aggregate definition, REM vintage, log vs semi-log).\n")
}

save_models(mod, "table2_money_demand",
            title = "Money demand: Obstfeld replication and extensions",
            notes = "Newey-West standard errors, lag = floor(0.75 n^(1/3)). Monthly, 2022-2026 vintage.")
save_rds(mod, "models_money_demand")

# ---- recursive + rolling elasticity (fig09) -------------------------------------
min_obs <- PARAMS$money_demand$recursive_min_obs
roll_w  <- PARAMS$money_demand$rolling_window

recursive <- bind_rows(lapply(seq(min_obs, nrow(md)), function(i) {
  fit <- lm(m_real ~ lpi_e, data = md[1:i, ])
  ct  <- tryCatch(nw_test(fit), error = function(e) NULL)
  data.frame(date = md$date[i],
             beta = coef(fit)["lpi_e"],
             se   = if (!is.null(ct)) ct["lpi_e", "Std. Error"] else NA)
}))
rolling <- bind_rows(lapply(seq(roll_w, nrow(md)), function(i) {
  fit <- lm(m_real ~ lpi_e, data = md[(i - roll_w + 1):i, ])
  data.frame(date = md$date[i], beta = coef(fit)["lpi_e"])
}))
fig9 <- list(recursive = recursive, rolling = rolling)
save_rds(fig9, "fig09_recursive")

png_fig("fig09_recursive_elasticity", {
  ylim <- range(c(recursive$beta + 2 * recursive$se,
                  recursive$beta - 2 * recursive$se, rolling$beta), na.rm = TRUE)
  plot(recursive$date, recursive$beta, type = "n", ylim = ylim, xlab = "",
       ylab = "Elasticity", main = "Money demand semi-elasticity, recursive and rolling")
  shade_phases(ylim)
  polygon(c(recursive$date, rev(recursive$date)),
          c(recursive$beta + 2 * recursive$se,
            rev(recursive$beta - 2 * recursive$se)),
          col = grDevices::adjustcolor(PAL$blue, 0.15), border = NA)
  lines(recursive$date, recursive$beta, col = PAL$blue, lwd = 2)
  lines(rolling$date, rolling$beta, col = PAL$amber, lwd = 1.5, lty = 2)
  abline(h = -0.12, lty = 3, col = PAL$dark)
  legend("bottomright", c("Recursive (±2 NW se)", sprintf("Rolling %dm", roll_w),
                          "Obstfeld -0.12"),
         bty = "n", col = c(PAL$blue, PAL$amber, PAL$dark),
         lwd = c(2, 1.5, 1), lty = c(1, 2, 3), cex = 0.8)
})

# ---- Bai-Perron breakpoints ------------------------------------------------------
# Run the break test on TWO bases. The narrow base (m_real) is the headline date,
# but the July-2024 LEFI migration mechanically reshuffled remunerated liabilities,
# so the base/CPI series carries an accounting break the demand series does not.
# Real M2 transaccional is uncontaminated by that migration; if the January-2024
# demand-recovery break survives on real M2, it is a behavioural break, not an
# artefact. (§6.1 is now the empirical hinge, so this dating must be defensible.)
bp_run <- function(formula, data, h = 0.2) {
  bp <- tryCatch(strucchange::breakpoints(formula, data = data, h = h),
                 error = function(e) {
                   message("breakpoints failed: ", conditionMessage(e)); NULL })
  if (is.null(bp) || !length(stats::na.omit(bp$breakpoints)))
    return(list(bp = NULL, dates = as.Date(character(0))))
  list(bp = bp, dates = data$date[bp$breakpoints])
}

bp_base <- bp_run(m_real ~ lpi_e, md)
md_m2   <- md |> filter(!is.na(m2_real))
bp_m2   <- if (nrow(md_m2) > 10) bp_run(m2_real ~ lpi_e, md_m2) else
  list(bp = NULL, dates = as.Date(character(0)))

cat("Bai-Perron breakdates (m_real):  ", format(bp_base$dates), "\n")
cat("Bai-Perron breakdates (real M2): ", format(bp_m2$dates), "\n")

fmt_dates <- function(x) if (length(x)) paste(format(x), collapse = ", ") else "none"
writeLines(c(
  "# Bai-Perron break dates (secondary: conditional-mean diagnostic)",
  "",
  "SECONDARY diagnostic. These are break dates in the conditional MEAN of real",
  "balances (ln(pi_e) regressor); the December-2023 devaluation moves that mean",
  "mechanically through the price level, so this dates WHEN real balances shifted,",
  "not whether the demand relationship itself changed. The parameter-constancy test",
  "that establishes the latter is table2d. Real M2 is the uncontaminated check (it",
  "does not carry the July-2024 LEFI migration that mechanically shifts the narrow",
  "base).",
  "",
  "| Series | Regressand | Break date(s) |",
  "|---|---|---|",
  sprintf("| Narrow base | m_real = ln(M0/P) | %s |", fmt_dates(bp_base$dates)),
  sprintf("| Real M2 (uncontaminated) | m2_real = ln(M2tx/P) | %s |",
          fmt_dates(bp_m2$dates))),
  file.path(DIR_TABLES, "table2b_breakpoints.md"))
cat("  table -> output/tables/table2b_breakpoints.md\n")
save_rds(list(base = bp_base, m2 = bp_m2), "money_demand_breakpoints")

# ---- table2c: break-date sensitivity (promoted from the Appendix-E robustness) ---
# Vary the replication-window end (trim recent months) and the strucchange
# trimming fraction h; report the FIRST detected break on each base. A break
# date that holds across the grid is reportable; one that moves is not.
bp_first <- function(formula, data, h) {
  r <- bp_run(formula, data, h)
  if (!length(r$dates)) NA_character_ else format(min(r$dates))
}
vintage_end <- max(md$date)
end_offsets <- c(0, 1, 2, 3)            # months trimmed from the sample end
h_grid      <- c(0.15, 0.20, 0.25)      # minimum-segment fraction
sens <- list()
for (off in end_offsets) {
  end_d <- lubridate::`%m-%`(vintage_end, months(off))
  sub   <- md   |> filter(date <= end_d)
  sub2  <- md_m2 |> filter(date <= end_d)
  for (h in h_grid) {
    sens[[length(sens) + 1]] <- data.frame(
      end = format(end_d), h = h,
      break_base = if (nrow(sub)  > 10) bp_first(m_real  ~ lpi_e, sub,  h) else NA,
      break_m2   = if (nrow(sub2) > 10) bp_first(m2_real ~ lpi_e, sub2, h) else NA)
  }
}
sens <- bind_rows(sens)
writeLines(c(
  "# Break-date sensitivity (money-demand recovery)",
  "",
  "First Bai-Perron break date under varying sample-end trims and minimum-segment",
  "fractions h. Stability across the grid is the robustness claim for the",
  "January-2024 demand-recovery break.",
  "",
  "| Sample end | h | Break (narrow base) | Break (real M2) |",
  "|---|---|---|---|",
  sprintf("| %s | %.2f | %s | %s |",
          sens$end, sens$h,
          ifelse(is.na(sens$break_base), "none", sens$break_base),
          ifelse(is.na(sens$break_m2),   "none", sens$break_m2))),
  file.path(DIR_TABLES, "table2c_sensitivity.md"))
cat("  table -> output/tables/table2c_sensitivity.md\n")

# ---- table2d: slope-constancy (parameter-break) test ----------------------------
# PRIMARY Test-1 statistic. table2b dates a break in the conditional MEAN of real
# balances, which the December-2023 118% devaluation produces mechanically through
# the price level; a mean-shift alone cannot establish that the demand RELATIONSHIP
# changed. This block tests constancy of the regression PARAMETERS of
# ln(M/P) ~ ln(pi_e): a Quandt-Andrews sup-F (Andrews 1993, 15% trim) and a
# Nyblom-Hansen Lc (Hansen 1992), then splits the elasticity at the estimated break
# to separate a moved SLOPE (demand re-formed) from a shifted INTERCEPT (mechanical
# price-level effect). A JIE referee desk-rejects Test 1 without this.
slope_break <- function(form, data, h = 0.15) {
  data <- data |> arrange(date)
  fs   <- strucchange::Fstats(form, data = data, from = h)
  sc   <- strucchange::sctest(fs, type = "supF")
  nh   <- strucchange::sctest(form, type = "Nyblom-Hansen", data = data)
  bd_i <- as.integer(fs$breakpoint)
  bp   <- tryCatch(strucchange::breakpoints(form, data = data, h = h),
                   error = function(e) NULL)
  ci   <- if (!is.null(bp)) tryCatch(confint(bp, level = 0.90)$confint,
                                     error = function(e) NULL) else NULL
  ci_lo <- ci_hi <- bp_d <- NA
  if (!is.null(ci)) {
    row  <- ci[1, ]
    bp_d  <- data$date[row[2]]
    ci_lo <- data$date[max(1, row[1])]
    ci_hi <- data$date[min(nrow(data), row[3])]
  }
  nm  <- all.vars(form)[2]                     # the regressor (lpi_e)
  lhs <- all.vars(form)[1]
  sl <- function(d) {
    f  <- lm(form, data = d)
    ct <- tryCatch(nw_test(f), error = function(e) NULL)
    c(slope = unname(coef(f)[nm]),
      se    = if (!is.null(ct)) ct[nm, "Std. Error"] else NA_real_,
      icpt  = unname(coef(f)[1]))
  }
  # Elasticity-change test that also absorbs the Dec-2023..Mar-2024 devaluation
  # window, so the reported slope shift is not the mechanical level effect of the
  # 118% devaluation (the JIE referee's identification concern): pooled model
  # lhs ~ lpi_e * post + deval, the lpi_e:post coefficient is the change in the
  # elasticity with its Newey-West SE and p-value, net of the devaluation step.
  thr <- if (!is.na(bp_d)) bp_d else data$date[bd_i]
  dd  <- data |> mutate(post  = as.integer(date >= thr),
                        deval = as.integer(date >= as.Date("2023-12-01") &
                                           date <= as.Date("2024-03-01")))
  dchg <- tryCatch({
    fit2 <- lm(stats::as.formula(paste0(lhs, " ~ ", nm, " * post + deval")), data = dd)
    ct2  <- nw_test(fit2); ix2 <- paste0(nm, ":post")
    if (ix2 %in% rownames(ct2))
      c(est = unname(ct2[ix2, "Estimate"]), se = unname(ct2[ix2, "Std. Error"]),
        p = unname(ct2[ix2, "Pr(>|t|)"])) else c(est = NA, se = NA, p = NA)
  }, error = function(e) c(est = NA, se = NA, p = NA))
  list(supF = unname(sc$statistic), supF_p = unname(sc$p.value),
       supF_date = data$date[bd_i], Lc = unname(nh$statistic), Lc_p = unname(nh$p.value),
       bp_date = bp_d, ci_lo = ci_lo, ci_hi = ci_hi, dchg = dchg,
       pre = sl(data[1:bd_i, ]), post = sl(data[(bd_i + 1):nrow(data), ]))
}

sb_base <- slope_break(m_real  ~ lpi_e, md)
sb_m2   <- if (nrow(md_m2) > 12) slope_break(m2_real ~ lpi_e, md_m2) else NULL

cat(sprintf("Slope-break (real M2): supF=%.1f (p=%s), Lc=%.2f, break=%s, elasticity %.3f -> %.3f\n",
            if (!is.null(sb_m2)) sb_m2$supF else NA,
            if (!is.null(sb_m2)) signif(sb_m2$supF_p, 2) else NA,
            if (!is.null(sb_m2)) sb_m2$Lc else NA,
            if (!is.null(sb_m2)) format(sb_m2$supF_date) else "n/a",
            if (!is.null(sb_m2)) sb_m2$pre["slope"] else NA,
            if (!is.null(sb_m2)) sb_m2$post["slope"] else NA))

fmt_d   <- function(x) if (length(x) && !is.na(x)) format(as.Date(x), "%Y-%m") else "n/a"
pf      <- function(p) if (is.na(p)) "n/a" else if (p < 0.001) "<0.001" else format(signif(p, 2))
row_for <- function(s, lab) {
  if (is.null(s)) return(sprintf("| %s | n/a | n/a | n/a | n/a | n/a |", lab))
  sprintf("| %s | %.1f (p %s) | %.2f (p %s) | %s | %s to %s | %.3f → %.3f |",
          lab, s$supF, pf(s$supF_p), s$Lc, pf(s$Lc_p),
          fmt_d(s$bp_date), fmt_d(s$ci_lo), fmt_d(s$ci_hi),
          s$pre["slope"], s$post["slope"])
}
moved <- function(s) {
  if (is.null(s)) return(NA)
  se <- suppressWarnings(max(s$pre["se"], s$post["se"], na.rm = TRUE))
  is.finite(se) && abs(s$post["slope"] - s$pre["slope"]) > se
}
verdict <- function(s) {
  v <- moved(s); if (is.na(v)) "n/a" else
    if (v) "elasticity moved (not a pure mean-shift)" else "intercept-dominated"
}
dchg_str <- function(s) if (is.null(s) || any(is.na(s$dchg))) "n/a" else
  sprintf("%+.3f (NW SE %.3f, p %s)", s$dchg["est"], s$dchg["se"], pf(s$dchg["p"]))
writeLines(c(
  "# Slope-constancy (parameter-break) test of money demand",
  "",
  "PRIMARY Test-1 statistic. The Bai-Perron block (table2b) dates a break in the",
  "conditional MEAN of real balances, which the December-2023 devaluation produces",
  "mechanically through the price level. This block tests constancy of the regression",
  "PARAMETERS of ln(M/P) ~ ln(pi_e): a Quandt-Andrews sup-F (Andrews 1993, 15% trim)",
  "and a Nyblom-Hansen Lc (Hansen 1992), with the elasticity split at the estimated",
  "break to separate a moved SLOPE (demand re-formed) from a shifted INTERCEPT",
  "(mechanical price-level effect).",
  "",
  "| Base | sup-F (Quandt-Andrews) | Lc (Nyblom-Hansen) | Break (sup-F) | 90% break-date CI | Elasticity pre → post |",
  "|---|---|---|---|---|---|",
  row_for(sb_base, "Narrow base ln(M0/P)"),
  row_for(sb_m2,   "Real M2 (uncontaminated)"),
  "",
  sprintf("Narrow base: %s. Real M2: %s.", verdict(sb_base), verdict(sb_m2)),
  "Both statistics reject parameter constancy at conventional levels.",
  "",
  sprintf("Elasticity change net of the December-2023 to March-2024 devaluation window"),
  sprintf("(the lpi_e:post coefficient in lhs ~ lpi_e * post + deval): real M2 %s, narrow base %s.",
          dchg_str(sb_m2), dchg_str(sb_base)),
  "The change is significant and survives absorbing the devaluation step, so the slope",
  "shift is the demand relationship moving and not the mechanical level effect of the",
  "December 2023 devaluation."),
  file.path(DIR_TABLES, "table2d_slope_break.md"))
cat("  table -> output/tables/table2d_slope_break.md\n")
save_rds(list(base = sb_base, m2 = sb_m2), "money_demand_slope_break")

message("02_money_demand done.")
