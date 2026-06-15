# Embedding the Argentina widgets

> **Canonical method for personal.site is inline `html-embed`, not iframes.**
> Paste the figure's `<figure>`+`<canvas>`+`<script>` fragment into the post
> markdown wrapped in a ` ```html-embed ` fence. Chart.js must load from
> `cdn.jsdelivr.net` (the site CSP blocks every other CDN). No hardcoded
> `nonce=`, no inline `on*=` handlers. Full rules:
> `~/.claude/_shared/chart-embed-contract.md`. The iframe heights below are
> legacy — only valid if the site explicitly serves these standalone files.

Same mechanics as the taylor-rule widgets: Chart.js 4.4.1 from jsDelivr (cdn.jsdelivr.net)
behind `window.__chartjs`, light/dark via `is-light` on `body`.

| File | Canvas | Recommended iframe height |
|------|--------|---------------------------|
| fig01_decomposition.html | 280 px | 470 px |
| fig02_inflation_phases.html | 260 px | 450 px |
| fig03_gap_events.html | 260 px | 440 px |
| fig04_remonetization.html | 260 px | 440 px |
| fig06_itcrm.html | 240 px | 400 px |
| fig07_reserves.html | 260 px | 440 px |
| fig08_comparative.html | 260 px | 440 px |
| fig09_recursive_elasticity.html | 240 px | 420 px |
| fig10_embi_crisis.html | 260 px | 440 px |
| fig11_corridor.html | 260 px | 420 px |
| fig13_unwind.html | 260 px | 440 px |
| fig12_nir.html | 260 px | 430 px |
| fig14_cover.html | 260 px | 430 px |
