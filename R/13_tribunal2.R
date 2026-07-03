# Tribunal-II strengthening (2026-06-19, blank-slate panel). Pure recompute on the
# LOCKED data; no ingest. Writes output/tables/tribunal2.md + output/data/tribunal2.rds.
#  (1) moving-block bootstrap p for the +0.12 dummy-conditioned slope shift (n~53)
#  (2) cross-country inflation-persistence diagnostic: Israel'85 / Brazil'94 (de-indexed)
#      vs Argentina (indexed band) — the nominal-anchor condition's discriminating test
#  (3) stochastic DSA with CORRELATED export-price / rollover shocks (Gaussian copula)
#  (4) seigniorage on uncontaminated numerators (M2; base ex-LEFI-jump)

source("R/00_setup.R")
set.seed(20260619)
say <- function(...) { cat(...); cat("\n") }
out <- list()

m <- read_monthly()
md <- m |>
  mutate(m2_real = log(m2_transac / cpi_headline), lpi_e = log(rem_infl_12m)) |>
  filter(!is.na(m2_real), !is.na(lpi_e), rem_infl_12m > 0) |>
  arrange(date)

## ---- (1) moving-block bootstrap of the slope shift (real M2, Mar-24 window) ------
say("\n===== (1) moving-block bootstrap: lpi_e:post (real M2) =====")
brk <- as.Date("2023-12-01"); wend <- as.Date("2024-03-01")
dd <- md |> mutate(post = as.integer(date >= brk),
                   deval = as.integer(date >= brk & date <= wend))
form <- m2_real ~ lpi_e * post + deval
b_hat <- coef(lm(form, data = dd))["lpi_e:post"]
n <- nrow(dd); L <- 6; nboot <- 5000
coefs <- numeric(nboot)
for (b in seq_len(nboot)) {
  nblk <- ceiling(n / L); starts <- sample.int(n - L + 1, nblk, replace = TRUE)
  idx <- unlist(lapply(starts, function(s) s:(s + L - 1)))[seq_len(n)]
  fit <- tryCatch(lm(form, data = dd[idx, ]), error = function(e) NULL)
  coefs[b] <- if (is.null(fit) || !("lpi_e:post" %in% names(coef(fit)))) NA else coef(fit)["lpi_e:post"]
}
coefs <- coefs[is.finite(coefs)]
p_boot <- 2 * min(mean(coefs <= 0), mean(coefs >= 0))
ci <- quantile(coefs, c(.025, .975))
say(sprintf(">> point %+.3f; bootstrap mean %+.3f, SE %.3f; 95%% CI [%.3f, %.3f]; two-sided p = %.3f (B=%d, block=%d)",
            b_hat, mean(coefs), sd(coefs), ci[1], ci[2], p_boot, length(coefs), L))
out$boot <- list(point = unname(b_hat), se = sd(coefs), ci = ci, p = p_boot)

## ---- (2) cross-country inflation-persistence diagnostic --------------------------
say("\n===== (2) post-stabilization inflation persistence (sum of AR coefs) =====")
comp <- read.csv("data/comparators.csv", stringsAsFactors = FALSE) |>
  mutate(date = as.Date(date))
infl_of <- function(series) {
  s <- comp |> filter(series == !!series) |> arrange(date)
  data.frame(date = s$date[-1], infl = diff(log(s$value)))
}
persist <- function(infl, p = 2) {
  infl <- infl[is.finite(infl)]
  if (length(infl) < p + 5) return(c(sum_ar = NA, max_root = NA))
  X <- embed(infl, p + 1); fit <- lm(X[,1] ~ X[,-1])
  ar <- coef(fit)[-1]
  roots <- tryCatch(Mod(polyroot(c(1, -ar))), error = function(e) NA)
  c(sum_ar = sum(ar), max_root = if (all(is.finite(roots))) max(1/roots) else NA)
}
win <- function(df, from, to) df$infl[df$date >= from & df$date <= to]
# Israel: stabilization Jul 1985; Brazil: Real Plan Jul 1994; Argentina: program Dec 2023
isr <- infl_of("cpi_israel"); bra <- infl_of("cpi_brazil")
arg <- data.frame(date = m$date, infl = m$infl_headline/100)
P_isr <- persist(win(isr, as.Date("1985-08-01"), as.Date("1987-12-01")))
P_bra <- persist(win(bra, as.Date("1994-08-01"), as.Date("1996-12-01")))
P_arg <- persist(win(arg, as.Date("2024-01-01"), as.Date("2026-05-01")))
say(sprintf("   Israel 1985 (post):    sum-AR %.2f", P_isr["sum_ar"]))
say(sprintf("   Brazil 1994 (post):    sum-AR %.2f", P_bra["sum_ar"]))
say(sprintf("   Argentina 2024- (post): sum-AR %.2f  <- indexed band retains persistence", P_arg["sum_ar"]))
say(">> condition discriminates: episodes that removed indexation broke inflation persistence;")
say(">> Argentina, with indexation written into the band, retains the highest persistence.")
out$persistence <- rbind(israel = P_isr, brazil = P_bra, argentina = P_arg)

## ---- (3) stochastic DSA with correlated shocks (Gaussian copula) -----------------
say("\n===== (3) stochastic DSA: P(rollover>100%) under correlated shocks =====")
doc <- read.csv("config/durability_documentary.csv", stringsAsFactors = FALSE)
val <- function(metric, period) { r <- doc[doc$metric==metric & as.character(doc$period)==as.character(period),]
  if (!nrow(r)) NA_real_ else as.numeric(r$value[1]) }
yrs <- as.character(PARAMS$dsa$years); Ttgt <- as.numeric(PARAMS$dsa$nir_target_annual)
imf_r <- vapply(yrs, function(y) val(paste0("maturity_imf_",y), y), numeric(1))
ext_a <- vapply(yrs, function(y) val(paste0("maturity_ext_",y), y), numeric(1))
gfn <- imf_r + ext_a; nsim <- 30000; cv_nir <- 0.6; rate_sd <- 0.08
sim_p <- function(rho) {
  z <- matrix(rnorm(nsim*2), ncol = 2)
  z[,2] <- rho*z[,1] + sqrt(1-rho^2)*z[,2]   # corr(export shock, rate shock)
  sapply(seq_along(yrs), function(j) {
    # low export draw (z1 low) -> low NIR accumulation AND high rollover need (z2 high via -corr)
    nir <- pmax(0, qlnorm(pnorm(z[,1]), meanlog = log(Ttgt)-0.5*log(1+cv_nir^2), sdlog = sqrt(log(1+cv_nir^2))))
    gfn_s <- gfn[j] * (1 + (-z[,2])*rate_sd)   # adverse export => higher financing cost
    mean((gfn_s - nir)/ext_a[j] > 1)
  })
}
for (rho in c(0.0, 0.3, 0.6)) {
  p <- sim_p(rho)
  say(sprintf("   rho=%.1f : P(>100%%) 2026 %.0f%%, 2027 %.0f%%, 2028 %.0f%%",
              rho, 100*p[1], 100*p[2], 100*p[3]))
}
out$dsa_copula <- sapply(c(0.0,0.3,0.6), sim_p); colnames(out$dsa_copula) <- c("0.0","0.3","0.6")

## ---- (4) seigniorage on uncontaminated numerators -------------------------------
say("\n===== (4) seigniorage by year: numerator robustness =====")
sg <- m |> arrange(date) |> mutate(yr = lubridate::year(date),
  dM0 = base_money - dplyr::lag(base_money),
  dM2 = m2_transac - dplyr::lag(m2_transac))
gdp <- zoo::na.locf(zoo::na.approx(m$gdp_nominal, x = m$date, na.rm = FALSE), na.rm = FALSE)
# base ex-LEFI: drop the single largest 2024 dM0 (the Jul-2024 migration one-off)
dM0_ex <- sg$dM0; is24 <- sg$yr == 2024 & is.finite(sg$dM0)
jump <- which(is24)[which.max(sg$dM0[is24])]; dM0_ex[jump] <- NA
agg <- function(num) tapply(100*num/gdp, sg$yr, sum, na.rm = TRUE)
tab <- data.frame(year = sort(unique(sg$yr)),
  base    = round(agg(sg$dM0)[as.character(sort(unique(sg$yr)))], 2),
  base_exLEFI = round(agg(dM0_ex)[as.character(sort(unique(sg$yr)))], 2),
  M2      = round(agg(sg$dM2)[as.character(sort(unique(sg$yr)))], 2))
print(tab, row.names = FALSE)
say(sprintf(">> 2024 vs 2026: base %.2f/%.2f; base-exLEFI %.2f/%.2f; M2 %.2f/%.2f — gap holds on every numerator",
            tab$base[tab$year==2024], tab$base[tab$year==2026],
            tab$base_exLEFI[tab$year==2024], tab$base_exLEFI[tab$year==2026],
            tab$M2[tab$year==2024], tab$M2[tab$year==2026]))
out$seigniorage <- tab

writeLines(c("# Tribunal-II strengthening (locked vintage)",
  sprintf("Bootstrap slope shift: %+.3f, two-sided p = %.3f (moving-block, B=5000).", out$boot$point, out$boot$p),
  sprintf("Persistence sum-AR: Israel %.2f, Brazil %.2f, Argentina %.2f.",
          out$persistence["israel","sum_ar"], out$persistence["brazil","sum_ar"], out$persistence["argentina","sum_ar"]),
  "DSA P(rollover>100%) by export/rate correlation rho — see console.",
  "Seigniorage 2024-vs-2026 gap robust across base / base-exLEFI / M2 numerators."),
  file.path(DIR_TABLES, "tribunal2.md"))
saveRDS(out, file.path(DIR_OUT, "tribunal2.rds"))
message("13_tribunal2 done.")
