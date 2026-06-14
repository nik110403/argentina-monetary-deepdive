# Packages, paths, phases, palette, shared helpers.
# Mirrors the taylor-rule repo's setup pattern.

packages <- c(
  "dplyr",
  "zoo",
  "lubridate",
  "yaml",          # config/params.yaml is the single source of truth
  "urca",
  "lmtest",
  "sandwich",
  "strucchange",
  "lpirfs",
  "fixest",
  "modelsummary",
  "jsonlite"
  # vars and tidysynth deliberately absent: SVAR and synthetic control are cut.
)

user_lib <- Sys.getenv("R_LIBS_USER", unset = "~/.R/library")
user_lib <- path.expand(user_lib)
if (!dir.exists(user_lib)) dir.create(user_lib, recursive = TRUE)
.libPaths(c(user_lib, .libPaths()))

install_if_missing <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    install.packages(pkg, lib = user_lib,
                     dependencies = c("Depends", "Imports", "LinkingTo"),
                     repos = "https://cloud.r-project.org")
  }
}

invisible(lapply(packages, install_if_missing))
invisible(lapply(packages, library, character.only = TRUE))
suppressMessages(library(dplyr))   # reload last so select/filter/lag win

# ---- paths -------------------------------------------------------------------
DIR_DATA    <- "data"
DIR_OUT     <- "output/data"
DIR_TABLES  <- "output/tables"
DIR_FIGURES <- "output/figures"
DIR_WIDGETS <- "output/widgets"
for (d in c(DIR_OUT, DIR_TABLES, DIR_FIGURES, DIR_WIDGETS)) {
  if (!dir.exists(d)) dir.create(d, recursive = TRUE)
}

PARAMS <- yaml::read_yaml("config/params.yaml")
EVENTS <- read.csv("config/events.csv", stringsAsFactors = FALSE) |>
  mutate(date = as.Date(date))

PHASES <- bind_rows(lapply(PARAMS$phases, as.data.frame)) |>
  mutate(start = as.Date(start), end = as.Date(end))

# ---- panel loaders -----------------------------------------------------------
read_monthly <- function() {
  stopifnot(file.exists(file.path(DIR_DATA, "panel_monthly.csv")))
  read.csv(file.path(DIR_DATA, "panel_monthly.csv"), stringsAsFactors = FALSE) |>
    mutate(date = as.Date(date)) |>
    arrange(date)
}

read_daily <- function() {
  stopifnot(file.exists(file.path(DIR_DATA, "panel_daily.csv")))
  read.csv(file.path(DIR_DATA, "panel_daily.csv"), stringsAsFactors = FALSE) |>
    mutate(date = as.Date(date)) |>
    arrange(date)
}

require_cols <- function(df, cols, where) {
  miss <- setdiff(cols, names(df))
  if (length(miss)) {
    stop(sprintf("%s: missing columns %s — check the ingest step.",
                 where, paste(miss, collapse = ", ")), call. = FALSE)
  }
  invisible(df)
}

# ---- econometrics helpers ----------------------------------------------------
# One test function per statistic (project rule). Newey-West throughout for
# time-series OLS; the lag follows the standard 0.75*n^(1/3) rule of thumb.
nw_vcov <- function(m) {
  sandwich::NeweyWest(m, lag = floor(0.75 * stats::nobs(m)^(1/3)),
                      prewhite = FALSE, adjust = TRUE)
}

nw_test <- function(m) lmtest::coeftest(m, vcov. = nw_vcov(m))

save_models <- function(models, stem, title = NULL, notes = NULL) {
  # markdown + html via modelsummary, with NW errors
  vc <- lapply(models, nw_vcov)
  for (fmt in c("md", "html")) {
    out <- file.path(DIR_TABLES, paste0(stem, ".", fmt))
    tryCatch(
      modelsummary(models, vcov = vc, output = out,
                   stars = c("*" = .1, "**" = .05, "***" = .01),
                   title = title, notes = notes,
                   gof_omit = "IC|Log|F|RMSE"),
      error = function(e) {
        message(sprintf("modelsummary failed for %s (%s); writing plain summary",
                        out, conditionMessage(e)))
        writeLines(capture.output(lapply(models, function(m) print(nw_test(m)))),
                   out)
      })
  }
  cat(sprintf("  table -> %s.{md,html}\n", file.path(DIR_TABLES, stem)))
}

# ---- figure helpers ----------------------------------------------------------
PAL <- list(blue = "#185FA5", green = "#1D9E75", amber = "#BA7517",
            red = "#D85A30", purple = "#534AB7", dark = "#1C1C1A",
            crimson = "#A32D2D",
            band = grDevices::adjustcolor("#185FA5", alpha.f = 0.10))

png_fig <- function(name, expr, width = 1600, height = 900, res = 160) {
  path <- file.path(DIR_FIGURES, paste0(name, ".png"))
  grDevices::png(path, width = width, height = height, res = res)
  op <- par(mar = c(3.5, 3.8, 2.5, 1), mgp = c(2.2, 0.6, 0), tcl = -0.3,
            family = "sans", cex.main = 1.0, font.main = 1)
  on.exit({par(op); grDevices::dev.off()}, add = TRUE)
  force(expr)
  cat(sprintf("  png -> %s\n", path))
}

shade_phases <- function(ylim, phases = PHASES) {
  # alternating background shading for phases 1..3 (phase 0 left unshaded)
  for (i in seq_len(nrow(phases))) {
    if (phases$phase[i] == 0) next
    rect(phases$start[i], ylim[1], min(phases$end[i], as.Date(PARAMS$vintage_end)),
         ylim[2], col = PAL$band, border = NA)
  }
}

mark_events <- function(ylim, slugs = NULL, cex = 0.55) {
  ev <- EVENTS
  if (!is.null(slugs)) ev <- ev[ev$slug %in% slugs, ]
  abline(v = ev$date, col = grDevices::adjustcolor(PAL$dark, 0.35), lty = 3)
  text(ev$date, ylim[2], labels = ev$slug, srt = 90, adj = c(1.05, -0.3),
       cex = cex, col = grDevices::adjustcolor(PAL$dark, 0.6))
}

save_rds <- function(obj, name) {
  path <- file.path(DIR_OUT, paste0(name, ".rds"))
  saveRDS(obj, path)
  cat(sprintf("  rds -> %s\n", path))
}

message("Setup complete: packages loaded, dirs ensured, params read.")
