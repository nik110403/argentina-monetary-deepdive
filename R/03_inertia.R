# Test 3 support (inertia): DESCRIPTIVE ONLY at this vintage.
#
# Five post-regime observations cannot support a break test, and the piece says
# so explicitly. This script produces: a rolling descriptive persistence series
# (sum of AR coefficients, BIC-selected p), the plateau decomposition (core vs
# regulated), and the post-regime prints against the band's T+2 schedule.
#
# The formal test is PRE-REGISTERED at the bottom of this file and NOT RUN.

source("R/00_setup.R")

m <- readRDS(file.path(DIR_OUT, "panel_monthly_enriched.rds"))
require_cols(m, c("infl_core", "infl_headline", "infl_regulated", "band_rate"),
             "03_inertia")

pmax_   <- PARAMS$inertia$ar_max_lag
roll_w  <- PARAMS$inertia$rolling_window
break_d <- as.Date(PARAMS$inertia$regime_break)

# sum of AR coefficients with BIC-selected p, on one window of data
ar_persistence <- function(y, pmax = pmax_) {
  y <- as.numeric(stats::na.omit(y))
  if (length(y) < pmax + 8) return(NA_real_)
  fits <- lapply(seq_len(pmax), function(p) {
    X <- stats::embed(y, p + 1)
    lm(X[, 1] ~ X[, -1, drop = FALSE])
  })
  best <- which.min(vapply(fits, BIC, numeric(1)))
  sum(coef(fits[[best]])[-1])
}

# ---- rolling persistence (descriptive) -------------------------------------------
core <- m |> filter(!is.na(infl_core))
pers <- bind_rows(lapply(seq(roll_w, nrow(core)), function(i) {
  data.frame(date = core$date[i],
             persistence = ar_persistence(core$infl_core[(i - roll_w + 1):i]))
}))
save_rds(pers, "inertia_persistence")
png_fig("figA2_persistence", {
  ylim <- range(pers$persistence, na.rm = TRUE)
  plot(pers$date, pers$persistence, type = "n", ylim = ylim, xlab = "",
       ylab = "Sum of AR coefficients",
       main = sprintf("Rolling (%dm) core-inflation persistence — descriptive", roll_w))
  shade_phases(ylim)
  lines(pers$date, pers$persistence, col = PAL$crimson, lwd = 2)
  abline(v = break_d, lty = 2)
})

# ---- plateau decomposition table --------------------------------------------------
plateau <- m |>
  filter(date >= break_d %m-% months(12)) |>
  select(date, infl_headline, infl_core, infl_regulated, band_rate)
writeLines(c(
  "# Plateau decomposition: last 12 pre-regime months + post-regime prints",
  "", "| Month | Headline | Core | Regulated | Band rate (CPI t-2) |",
  "|---|---|---|---|---|",
  sprintf("| %s | %.1f | %.1f | %.1f | %s |",
          format(plateau$date, "%Y-%m"), plateau$infl_headline,
          plateau$infl_core, plateau$infl_regulated,
          ifelse(is.na(plateau$band_rate), "-",
                 sprintf("%.1f", plateau$band_rate)))),
  file.path(DIR_TABLES, "table3_plateau.md"))
cat("  table -> output/tables/table3_plateau.md\n")
save_rds(plateau, "inertia_plateau")

n_post <- sum(m$date >= break_d & !is.na(m$infl_core))
cat(sprintf("\nPost-regime observations at this vintage: %d (need >= %d for the formal test)\n",
            n_post, PARAMS$inertia$min_postbreak_obs_for_formal_test))

# ==================================================================================
# PRE-REGISTERED FOLLOW-UP TEST — NOT RUN AT THIS VINTAGE.
# Pre-registered 2026-06. Runnable once >= 12 post-regime observations exist,
# i.e. after the December 2026 CPI print. Do not modify the specification below
# between now and then; if it must change, document the change and the reason
# in the follow-up piece.
#
# (1) Chow-type break in persistence at 2026-01:
#     full <- m |> filter(!is.na(infl_core))
#     X <- stats::embed(full$infl_core, p_bic + 1)   # p_bic from full sample BIC
#     dat <- data.frame(y = X[, 1], X[, -1, drop = FALSE],
#                       date = full$date[-seq_len(p_bic)])
#     strucchange::sctest(y ~ ., data = dat[, -ncol(dat)], type = "Chow",
#                         point = which(dat$date == as.Date("2026-01-01")))
#
# (2) Expectations anchoring by phase (the Obstfeld mechanism in expectations):
#     lm(rem_infl_12m ~ lag(infl_headline) * factor(phase), data = m)
#     Newey-West errors via nw_test(); a rising coefficient in phase 3 is the
#     mechanism showing up in expectations.
# ==================================================================================

message("03_inertia done (descriptive only; formal test pre-registered, NOT run).")
