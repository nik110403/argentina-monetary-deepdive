# closeread story template

Copy this directory per story (never symlink). `story.qmd` has one working
example of every grammar below — delete what you don't use.

## steps.md → story.qmd mapping

| steps.md `kind` | qmd grammar |
|---|---|
| `prose` | plain Markdown section, no `.cr-section` |
| `scrolly` + `focus` | `:::{focus-on="cr-id"}` trigger + a `:::{#cr-id}` sticky |
| `scrolly` + `swap` | same section, later triggers point `focus-on` at a different `#cr-id` |
| `scrolly` + `highlight` | `scale-by`/`pan-to` attrs on the trigger div |
| `scrolly` + `annotate` | text lives inside the OJS sticky itself (scene three) |
| `widget` | ONE OJS cell, `Inputs.select(...)` — at most one per story |
| `grid` | plain Quarto `::: {layout-ncol=3}` of `![caption](fig.png)`, outside any `.cr-section` |

## Data rule (STRATEGY §6, SPEC.md M2 header "Graphs")

Hand-write **≤2 JSONs per story** under `data/`, sourced only from the paper
repo's `data/panel_monthly.csv`, `data/*.csv`, `output/widgets/*.html`
`var SPEC`, or `output/data/*.rds`. No illustrative or rounded-for-effect
numbers. Note the source file in a comment next to the data (see
`data/example.json`). No extractor script — this is a manual, per-story step.

## Brand

`brand/brand.css` carries DESIGN.md's tokens (paper/ink/oxblood/teal,
Fraunces/Atkinson Hyperlegible/Space Grotesk) as custom properties and
retargets closeread's own `--cr-*` variables to them. `brand/header.html`
renders the PDF/repo/vintage meta line and switches the one accent via
front matter `accent: oxblood | teal`. Never edit `_extensions/` — it's
vendored closeread 1.0.1, same commit as the spike.

## Motion

`lib/scrub.js` — `lineDraw`, `countUp`, `hook`. All three snap to their end
state under `prefers-reduced-motion` via `reduced()`. Nothing else; if
closeread can't do an effect, don't build a new engine for it (STRATEGY §6).
