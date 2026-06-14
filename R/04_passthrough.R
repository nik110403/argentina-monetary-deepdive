# Pass-through by phase via Jordà local projections.
# The SVAR is cut (a result that must be disclaimed in advance carries no
# weight). Headline estimate: lpirfs on the full sample. Per-phase estimates:
# manual LPs (transparent on small subsamples; reported with NW errors and
# honest caveats). Feeds Test 2's adjudication between the fiscal and
# exchange-rate anchors. Appendix figure + table.

source("R/00_setup.R")

m <- read_monthly()
require_cols(m, c("infl_headline", "fx_official_a3500", "phase"),
             "04_passthrough")

H <- PARAMS$passthrough$horizon

df <- m |>
  mutate(dlfx = c(NA, diff(log(fx_official_a3500))) * 100) |>
  filter(!is.na(infl_headline), !is.na(dlfx))

# cumulative inflation over t..t+h (%)
for (h in 0:H) {
  df[[paste0("cum", h)]] <- zoo::rollapply(df$infl_headline, h + 1, sum,
                                           align = "left", fill = NA)
}

# ---- manual Jordà LP: cum_h ~ dlfx + controls (1 lag each), by sample -----------
lp_manual <- function(dat, label) {
  bind_rows(lapply(0:H, function(h) {
    d <- dat |> mutate(y = .data[[paste0("cum", h)]],
                       l_pi = dplyr::lag(infl_headline),
                       l_fx = dplyr::lag(dlfx)) |>
      filter(!is.na(y), !is.na(l_pi), !is.na(l_fx))
    if (nrow(d) < 10) {
      if (h == 0) cat(sprintf(
        "  NOTE: '%s' skipped — %d usable obs after lags (need >= 10).\n",
        label, nrow(d)))
      return(NULL)
    }
    fit <- lm(y ~ dlfx + l_pi + l_fx, data = d)
    ct  <- nw_test(fit)
    data.frame(sample = label, h = h, beta = ct["dlfx", "Estimate"],
               se = ct["dlfx", "Std. Error"], n = nrow(d))
  }))
}

irfs <- bind_rows(
  lp_manual(df, "Full sample"),
  lp_manual(df |> filter(phase == 1), "Phase 1 (crawl)"),
  lp_manual(df |> filter(phase == 2), "Phase 2 (IMF band)")
  # Phase 3 deliberately omitted: too few observations (see 03_inertia logic)
)
save_rds(irfs, "passthrough_irfs")

# ---- lpirfs full-sample check (the packaged estimator, as named in the plan) ----
lp_pkg <- tryCatch({
  endog <- df |> select(infl_headline, dlfx) |> as.data.frame()
  lpirfs::lp_lin(endog, lags_endog_lin = 2, trend = 0, shock_type = 0,
                 confint = 1.96, hor = H)
}, error = function(e) {
  message("lpirfs failed (non-fatal, manual LPs above are primary): ",
          conditionMessage(e)); NULL
})
if (!is.null(lp_pkg)) save_rds(lp_pkg, "passthrough_lpirfs")

# ---- outputs ---------------------------------------------------------------------
writeLines(c(
  "# Co-movement of administered depreciation and inflation (appendix)",
  "",
  "Demoted to an appendix in the scorecard reframe: this is descriptive co-movement,",
  "not identified causal pass-through (the depreciation is administered, not a shock).",
  "Jordà local projections, controls: one lag of inflation and depreciation. NW errors.",
  "", "| Sample | h | beta | se | n |", "|---|---|---|---|---|",
  sprintf("| %s | %d | %.3f | %.3f | %d |",
          irfs$sample, irfs$h, irfs$beta, irfs$se, irfs$n)),
  file.path(DIR_TABLES, "table4_passthrough.md"))
cat("  table -> output/tables/table4_passthrough.md\n")

png_fig("figA1_passthrough", {
  cols <- c("Full sample" = PAL$dark, "Phase 1 (crawl)" = PAL$blue,
            "Phase 2 (IMF band)" = PAL$amber)
  ylim <- range(c(irfs$beta + 2 * irfs$se, irfs$beta - 2 * irfs$se), na.rm = TRUE)
  plot(NA, xlim = c(0, H), ylim = ylim, xlab = "Horizon (months)",
       ylab = "Cumulative pp per 1% depreciation",
       main = "Co-movement of administered depreciation and inflation, by phase")
  abline(h = 0, lty = 3)
  for (s in names(cols)) {
    g <- irfs |> filter(sample == s)
    if (!nrow(g)) next
    lines(g$h, g$beta, col = cols[[s]], lwd = 2)
    arrows(g$h, g$beta - 2 * g$se, g$h, g$beta + 2 * g$se, angle = 90,
           code = 3, length = 0.03, col = cols[[s]])
  }
  legend("topleft", names(cols), col = unlist(cols), lwd = 2, bty = "n", cex = 0.8)
})

message("04_passthrough done.")
