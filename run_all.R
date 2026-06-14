run_script <- function(path) {
  cat(sprintf("\n[%s]  Starting %s\n", format(Sys.time(), "%H:%M:%S"), path))
  tryCatch(
    {
      source(path, local = new.env(parent = globalenv()))
      cat(sprintf("[%s]  Finished %s\n", format(Sys.time(), "%H:%M:%S"), path))
    },
    error = function(e) {
      cat(sprintf("[%s]  ERROR in %s:\n  %s\n",
                  format(Sys.time(), "%H:%M:%S"), path, conditionMessage(e)))
      stop(sprintf("Pipeline halted at %s", path), call. = FALSE)
    }
  )
}

cat("==========================================================================\n")
cat(sprintf("Pipeline start  %s\n", format(Sys.time(), "%Y-%m-%d %H:%M:%S")))
cat("==========================================================================\n")

run_script("R/01_descriptives.R")
run_script("R/02_money_demand.R")
run_script("R/03_inertia.R")
run_script("R/04_passthrough.R")
run_script("R/05_events.R")
# R/06_dispersion.R is unwired in the scorecard reframe — the relative-price
# dispersion chart "does not identify" and was cut from the export. The script is
# kept on disk; re-add this line to restore it to the pipeline.
run_script("R/07_decomposition.R")
run_script("R/08_comparative.R")
run_script("R/10_durability.R")   # §VI durability exhibits (fig12 NIR, fig13 unwind, fig14 wall)

cat("\n==========================================================================\n")
cat(sprintf("Pipeline end    %s   (charts: make charts -> R/09_export_charts.R)\n",
            format(Sys.time(), "%Y-%m-%d %H:%M:%S")))
cat("==========================================================================\n")

expected <- c(
  "output/tables/table1_phase_summary.md",
  "output/tables/table2_money_demand.md",
  "output/tables/table2b_breakpoints.md",
  "output/tables/table2c_sensitivity.md",
  "output/tables/table3_plateau.md",
  "output/tables/table4_passthrough.md",
  "output/tables/table5_events.md",
  "output/data/fig01_decomposition.rds",
  "output/data/fig02_inflation.rds",
  "output/data/fig03_gap.rds",
  "output/data/fig04_remonetization.rds",
  "output/data/fig06_itcrm.rds",
  "output/data/fig07_reserves.rds",
  "output/data/fig08_comparative.rds",
  "output/data/fig09_recursive.rds",
  "output/data/fig10_crisis.rds",
  "output/data/fig11_corridor.rds",
  "output/data/fig12_nir.rds",
  "output/data/fig13_unwind.rds",
  "output/data/fig14_cover.rds",
  "output/figures/fig01_decomposition.png",
  "output/figures/fig02_inflation_phases.png",
  "output/figures/fig03_gap_events.png",
  "output/figures/fig04_remonetization.png",
  "output/figures/fig06_itcrm.png",
  "output/figures/fig07_reserves.png",
  "output/figures/fig08_comparative.png",
  "output/figures/fig09_recursive_elasticity.png",
  "output/figures/fig10_embi_crisis.png",
  "output/figures/fig11_corridor.png",
  "output/figures/fig12_nir.png",
  "output/figures/fig13_unwind.png",
  "output/figures/fig14_cover.png"
)

cat("\nOutput files:\n")
for (f in expected) {
  if (file.exists(f)) {
    cat(sprintf("  [OK]  %-50s (%s)\n", f,
                format(file.size(f), big.mark = ",", scientific = FALSE)))
  } else {
    cat(sprintf("  [!!]  %-50s NOT FOUND\n", f))
  }
}
cat("\n")
