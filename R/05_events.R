# The one formal event study: September-October 2025 (near-collapse sequence).
# Windows -10..+10 trading days around each event_study-flagged registry date;
# abnormal change in the parallel gap and EMBI vs the mean of t-30..t-11.
# Other registry dates are chart annotations only (no study panels).
#
# Inference (revised): the simple t-test is gone — daily levels are serially
# correlated, which collapsed its SE to an incredible t = -47.70. Headline
# inference is now a PLACEBO distribution: the identical abnormal-mean statistic
# recomputed on a pool of non-event pseudo-event dates, giving an empirical
# two-sided p-value. A moving-block bootstrap supplies the estimate's SE, and a
# Newey-West t is kept as a third, secondary column. Pure recompute on the
# locked panel — no ingest.
#
# Produces fig10 (EMBI + gap over the crisis window) and stores the placebo
# draws inside event_study.rds for the appendix exhibit.

source("R/00_setup.R")

d <- read_daily()
require_cols(d, c("gap_blue"), "05_events")
has_embi <- "embi" %in% names(d)

wpre  <- PARAMS$event_study$window_pre
wpost <- PARAMS$event_study$window_post
bpre  <- PARAMS$event_study$baseline_pre   # c(30, 11)
nboot <- PARAMS$event_study$n_boot
blen  <- PARAMS$event_study$block_len
guard <- PARAMS$event_study$placebo_guard
set.seed(PARAMS$event_study$boot_seed)
# The full placebo pool spans 2022 hyperinflation, whose daily volatility widens
# the null and biases the empirical p UPWARD (toward non-significance) — surviving
# results are therefore conservative. A second pool restricted to the post-Dec-2023
# stabilization regime (comparable volatility) is reported alongside as robustness.
regime_start <- as.Date(PHASES$start[PHASES$phase == 1][1])   # 2023-12-01

ev <- EVENTS |> filter(event_study == "yes")
stopifnot(nrow(ev) > 0)
cat("Event-study dates (verify any flagged VERIFY in config/events.csv!):\n")
print(ev[, c("date", "slug", "confirmed")])

trading <- d |> filter(!is.na(gap_blue)) |> arrange(date)

# ---- core statistic: abnormal post-window mean at trading-row index i0 -----------
# baseline = mean of t-30..t-11; abnormal_t = x_t - baseline over t0..t+wpost;
# the statistic is the mean of that post-window abnormal vector.
abnormal_at <- function(x, i0) {
  pre_idx  <- (i0 - bpre[1]):(i0 - bpre[2])
  post_idx <- i0:(i0 + wpost)
  if (min(pre_idx) < 1 || max(post_idx) > length(x)) return(NULL)
  base <- mean(x[pre_idx], na.rm = TRUE)
  ab   <- x[post_idx] - base
  if (anyNA(c(base, ab))) return(NULL)
  list(base = base, ab = ab, post_idx = post_idx)
}

# ---- moving-block bootstrap SE of a post-window abnormal mean --------------------
mbb_se <- function(ab) {
  n <- length(ab)
  if (n < 2) return(NA_real_)
  nblk <- ceiling(n / blen)
  starts_max <- n - blen + 1
  means <- numeric(nboot)
  for (b in seq_len(nboot)) {
    starts <- sample.int(starts_max, nblk, replace = TRUE)
    idx <- unlist(lapply(starts, function(s) s:(s + blen - 1)))[seq_len(n)]
    means[b] <- mean(ab[idx])
  }
  stats::sd(means)
}

# ---- placebo pool for a series: the abnormal-mean statistic on non-event dates ---
# Excludes any pseudo-event within `guard` trading rows of a real flagged event.
placebo_dist <- function(x, ds, event_rows, min_date = NULL) {
  lo <- bpre[1] + 1
  hi <- length(x) - wpost
  cand <- lo:hi
  if (length(event_rows))
    cand <- cand[vapply(cand, function(i)
      all(abs(i - event_rows) > guard), logical(1))]
  if (!is.null(min_date)) cand <- cand[ds[cand] >= min_date]
  vals <- vapply(cand, function(i) {
    r <- abnormal_at(x, i)
    if (is.null(r)) NA_real_ else mean(r$ab)
  }, numeric(1))
  vals[is.finite(vals)]
}

study_series <- function(series) {
  x <- trading[[series]]
  ok <- !is.na(x)
  # work on the densely-observed subseries so trading-row spacing is uniform
  xs <- x[ok]; ds <- trading$date[ok]
  event_rows <- vapply(ev$date, function(ed) {
    j <- which.min(abs(as.numeric(ds - ed)))
    if (abs(as.numeric(ds[j] - ed)) > 5) NA_integer_ else j
  }, integer(1))
  ev_clean  <- stats::na.omit(event_rows)
  placebo   <- placebo_dist(xs, ds, ev_clean)                          # full pool
  placebo_n <- placebo_dist(xs, ds, ev_clean, min_date = regime_start) # narrow pool
  out_tab <- list(); out_win <- list()
  for (k in seq_len(nrow(ev))) {
    i0 <- event_rows[k]
    if (is.na(i0)) next
    r <- abnormal_at(xs, i0)
    if (is.null(r)) next
    est <- mean(r$ab)
    boot_se <- mbb_se(r$ab)
    # empirical two-sided placebo p, full and narrow (post-Dec-2023) pools
    pval   <- (1 + sum(abs(placebo)   >= abs(est))) / (1 + length(placebo))
    pval_n <- (1 + sum(abs(placebo_n) >= abs(est))) / (1 + length(placebo_n))
    # Newey-West t on the post-window abnormal vector (secondary)
    nwt <- tryCatch(
      nw_test(lm(r$ab ~ 1))["(Intercept)", "t value"],
      error = function(e) NA_real_)
    out_tab[[length(out_tab) + 1]] <- data.frame(
      slug = ev$slug[k], series = series, baseline = r$base,
      mean_abnormal_post = est, boot_se = boot_se,
      placebo_p = pval, placebo_p_narrow = pval_n, nw_t = unname(nwt),
      n_post = length(r$ab), n_placebo = length(placebo),
      n_placebo_narrow = length(placebo_n))
    out_win[[length(out_win) + 1]] <- data.frame(
      rel_day = -wpre:wpost,
      date = ds[(i0 - wpre):(i0 + wpost)],
      abnormal = xs[(i0 - wpre):(i0 + wpost)] - r$base,
      slug = ev$slug[k], series = series)
  }
  list(table = bind_rows(out_tab), windows = bind_rows(out_win),
       placebo = rbind(
         data.frame(series = series, pool = "full",   abnormal_mean = placebo),
         data.frame(series = series, pool = "narrow", abnormal_mean = placebo_n)))
}

series_set <- c("gap_blue", if (has_embi) "embi")
res <- lapply(series_set, study_series)
tab     <- bind_rows(lapply(res, `[[`, "table"))
windows <- bind_rows(lapply(res, `[[`, "windows"))
placebo <- bind_rows(lapply(res, `[[`, "placebo"))
stopifnot(nrow(tab) > 0)
save_rds(list(table = tab, windows = windows, placebo = placebo), "event_study")

writeLines(c(
  "# Event study: September-October 2025 sequence",
  "",
  sprintf("Abnormal change vs the mean of t-%d..t-%d. Headline inference is a placebo",
          bpre[1], bpre[2]),
  sprintf("distribution: the same post-window (t0..t+%d) abnormal mean recomputed on every",
          wpost),
  "non-event trading day (excluding a +/- placebo-guard band around the real events);",
  "`placebo p` is the two-sided empirical rank of the actual abnormal in that null.",
  sprintf("`boot se` is a moving-block bootstrap SE (block = %d, B = %d). The Newey-West t",
          blen, nboot),
  "is secondary and reported only for continuity with the prior draft.",
  "",
  "`placebo p (full)` draws pseudo-events from the whole sample; `placebo p (narrow)`",
  "restricts the pool to the post-Dec-2023 stabilization regime (comparable volatility).",
  "The full pool spans 2022 hyperinflation, which widens the null and biases p upward,",
  "so a result that survives BOTH pools is the robust one.",
  "", "| Event | Series | Baseline | Mean abnormal (post) | Boot SE | Placebo p (full) | Placebo p (narrow) | NW t | n post | n plac. full | n plac. narrow |",
  "|---|---|---|---|---|---|---|---|---|---|---|",
  sprintf("| %s | %s | %.1f | %+.1f | %.2f | %.3f | %.3f | %.2f | %d | %d | %d |",
          tab$slug, tab$series, tab$baseline, tab$mean_abnormal_post,
          tab$boot_se, tab$placebo_p, tab$placebo_p_narrow, tab$nw_t,
          tab$n_post, tab$n_placebo, tab$n_placebo_narrow)),
  file.path(DIR_TABLES, "table5_events.md"))
cat("  table -> output/tables/table5_events.md\n")

# ---- fig10: the crisis window, daily, annotated ----------------------------------
crisis <- d |> filter(date >= as.Date("2025-08-15"), date <= as.Date("2025-11-30"))
save_rds(crisis, "fig10_crisis")
png_fig("fig10_embi_crisis", {
  par(mfrow = c(2, 1), mar = c(2.5, 3.8, 2, 1))
  if (has_embi) {
    ylim <- range(crisis$embi, na.rm = TRUE)
    plot(crisis$date, crisis$embi, type = "l", col = PAL$crimson, lwd = 1.6,
         xlab = "", ylab = "bp", main = "EMBI Argentina — Sep-Oct 2025")
    mark_events(ylim, slugs = ev$slug, cex = 0.6)
  }
  ylim <- range(crisis$gap_blue, na.rm = TRUE)
  plot(crisis$date, crisis$gap_blue, type = "l", col = PAL$blue, lwd = 1.6,
       xlab = "", ylab = "%", main = "Parallel gap")
  mark_events(ylim, slugs = ev$slug, cex = 0.6)
})

message("05_events done.")
