# Aligned-path comparison (Test 3 support): monthly inflation, t = 0 at
# stabilization start. Israel 1985-07 (multi-anchor heterodox case) and
# Brazil 1994-07 (Real Plan: engineered to BREAK indexation inertia via the
# URV — the precise mirror image of a regime that wrote indexation into its
# exchange-rate rule). Bolivia and Peru: one sentence in prose, no data pull.
# Synthetic control cut entirely.

source("R/00_setup.R")

cpath <- file.path(DIR_DATA, "comparators.csv")
if (!file.exists(cpath))
  stop("data/comparators.csv missing — run ingest_comparators.py first.")

comp <- read.csv(cpath, stringsAsFactors = FALSE) |> mutate(date = as.Date(date))
m <- read_monthly()

T0 <- list(israel = as.Date("1985-07-01"),
           brazil = as.Date("1994-07-01"),
           argentina = as.Date("2023-12-01"))
WINDOW <- c(-12, 30)

monthly_infl <- function(df, series, is_index) {
  x <- df |> filter(series == !!series) |> arrange(date)
  if (is_index) x <- x |> mutate(value = (value / dplyr::lag(value) - 1) * 100)
  x |> select(date, infl = value) |> filter(!is.na(infl))
}

align <- function(x, t0, label) {
  x |> mutate(rel = (year(date) - year(t0)) * 12 + (month(date) - month(t0)),
              episode = label) |>
    filter(rel >= WINDOW[1], rel <= WINDOW[2]) |>
    select(episode, rel, infl)
}

paths <- bind_rows(
  align(monthly_infl(comp, "cpi_israel", TRUE), T0$israel, "Israel 1985"),
  align(monthly_infl(comp, "infl_brazil", FALSE), T0$brazil, "Brazil 1994"),
  align(m |> select(date, infl = infl_headline) |> filter(!is.na(infl)),
        T0$argentina, "Argentina 2023")
)
stopifnot(length(unique(paths$episode)) == 3)
save_rds(paths, "fig08_comparative")

png_fig("fig08_comparative", {
  cols <- c("Israel 1985" = PAL$amber, "Brazil 1994" = PAL$green,
            "Argentina 2023" = PAL$crimson)
  ylim <- range(paths$infl, na.rm = TRUE)
  plot(NA, xlim = WINDOW, ylim = ylim, xlab = "Months from stabilization start",
       ylab = "% m/m", main = "Stabilization paths: monthly inflation, aligned at t = 0")
  abline(v = 0, lty = 2); abline(h = 0, lty = 3)
  for (e in names(cols)) {
    g <- paths |> filter(episode == e) |> arrange(rel)
    lines(g$rel, g$infl, col = cols[[e]], lwd = 2)
  }
  legend("topright", names(cols), col = unlist(cols), lwd = 2, bty = "n", cex = 0.85)
})

# program-features table is written by hand in the piece (qualitative), not here.
message("08_comparative done.")
