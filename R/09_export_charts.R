# Chart.js HTML widgets from the saved chart data (output/data/*.rds).
#
# Follows the taylor-rule widget pattern exactly: standalone <figure> HTML,
# Chart.js 4.4.1 lazy-loaded from jsDelivr (cdn.jsdelivr.net) behind a shared window.__chartjs
# promise, light/dark theme via a MutationObserver on document.body's class
# list, stat cards, HTML legend with data-k swatches, source footer.
# One generic JS renderer is parameterized per figure by a serialized spec.
# Also writes output/widgets/embed_guide.md with iframe snippets.

source("R/00_setup.R")

KICKER <- "Argentina &middot; Deep Dive &middot; 2022&ndash;2026"
SITE   <- "https://nikkhosravipour.com"

# ---- generic JS renderer (JS uses single quotes only; R string is double-quoted)
JS_TEMPLATE <- "
<script>
(function () {
  window.__chartjs = window.__chartjs || new Promise(function(resolve) {
    if (window.Chart) return resolve();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js';
    s.onload = resolve;
    document.head.appendChild(s);
  });
  var canvas = document.getElementById('__ID__');
  if (!canvas) return;
  var SPEC = __SPEC__;
  var scope = canvas.closest('figure');
  var chart;
  function palette() {
    var light = document.body.classList.contains('is-light');
    return {
      tick:    light ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.5)',
      grid:    light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
      yTick:   light ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.7)',
      actual:  light ? '#1C1C1A' : '#E8E6DF',
      blue:    light ? '#185FA5' : '#60a5fa',
      green:   light ? '#1D9E75' : '#34d399',
      amber:   light ? '#BA7517' : '#f59e0b',
      red:     light ? '#D85A30' : '#f87171',
      purple:  light ? '#534AB7' : '#a78bfa',
      crimson: light ? '#A32D2D' : '#ef4444',
      gray:    light ? '#8a8a86' : '#9ca3af',
      band:    light ? 'rgba(185,210,235,0.35)' : 'rgba(96,165,250,0.12)',
      hband:   light ? 'rgba(29,158,117,0.15)'  : 'rgba(52,211,153,0.12)',
      muted:   light ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.55)'
    };
  }
  function alpha(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) +
           ',' + a + ')';
  }
  function render() {
    if (!window.Chart) return;
    var c = palette();
    scope.querySelectorAll('[data-k]').forEach(function(sw) {
      sw.style.background = c[sw.dataset.k] || '#888';
    });
    var deco = {
      id: 'deco',
      beforeDraw: function(ch) {
        var ctx = ch.ctx, ca = ch.chartArea, xs = ch.scales.x, ys = ch.scales.y;
        (SPEC.bands || []).forEach(function(b) {
          var x0 = xs.getPixelForValue(b.from), x1 = xs.getPixelForValue(b.to);
          ctx.save(); ctx.fillStyle = c.band;
          ctx.fillRect(x0, ca.top, x1 - x0, ca.bottom - ca.top); ctx.restore();
        });
        if (SPEC.hband) {
          var y0 = ys.getPixelForValue(SPEC.hband.lo);
          var y1 = ys.getPixelForValue(SPEC.hband.hi);
          ctx.save(); ctx.fillStyle = c.hband;
          ctx.fillRect(ca.left, y1, ca.right - ca.left, y0 - y1);
          if (SPEC.hband.label) {
            ctx.fillStyle = c.muted; ctx.font = '9px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(SPEC.hband.label, ca.right - 4, y1 - 4);
          }
          ctx.restore();
        }
      },
      afterDraw: function(ch) {
        var ctx = ch.ctx, ca = ch.chartArea, xs = ch.scales.x;
        (SPEC.vlines || []).forEach(function(v) {
          var px = xs.getPixelForValue(v.x);
          ctx.save();
          ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(px, ca.top); ctx.lineTo(px, ca.bottom);
          ctx.stroke(); ctx.setLineDash([]);
          if (v.text) {
            ctx.fillStyle = c.muted; ctx.font = '9px system-ui, sans-serif';
            ctx.translate(px - 3, ca.top + 4); ctx.rotate(Math.PI / 2);
            ctx.textAlign = 'left';
            ctx.fillText(v.text, 0, 0);
          }
          ctx.restore();
        });
        if (SPEC.hline !== undefined && SPEC.hline !== null) {
          var ys = ch.scales.y, y0 = ys.getPixelForValue(SPEC.hline);
          ctx.save(); ctx.strokeStyle = c.tick; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(ca.left, y0); ctx.lineTo(ca.right, y0);
          ctx.stroke(); ctx.restore();
        }
      }
    };
    var datasets = SPEC.datasets.map(function(d) {
      var col = c[d.key] || c.actual;
      return {
        label: d.label,
        data: d.data,
        borderColor: col,
        backgroundColor: d.fillAlpha ? alpha(col, d.fillAlpha) : col,
        borderWidth: d.width !== undefined ? d.width : 2,
        borderDash: d.dash ? [5, 4] : undefined,
        pointRadius: 0,
        spanGaps: true,
        tension: 0.15,
        fill: d.fillTo !== undefined ? d.fillTo : false,
        stack: SPEC.stacked ? 'stack0' : undefined,
        yAxisID: d.y2 ? 'y1' : 'y',
        type: d.type || undefined
      };
    });
    var scales = {
      x: {
        stacked: !!SPEC.stacked,
        border: { display: false },
        grid: { color: c.grid },
        ticks: { color: c.tick, font: { size: 10, family: 'system-ui, sans-serif' },
          maxRotation: 0, autoSkip: false,
          callback: function(val, i) {
            return i % (SPEC.xEvery || 1) === 0 ? SPEC.labels[i] : null;
          } }
      },
      y: {
        stacked: !!SPEC.stacked,
        border: { display: false },
        grid: { color: c.grid },
        ticks: { color: c.yTick, font: { size: 10, family: 'system-ui, sans-serif' },
          callback: function(v) { return v + (SPEC.ySuffix || ''); } }
      }
    };
    if (SPEC.y1) {
      scales.y1 = {
        position: 'right', border: { display: false },
        grid: { drawOnChartArea: false },
        ticks: { color: c.yTick, font: { size: 10, family: 'system-ui, sans-serif' },
          callback: function(v) { return v + (SPEC.y1Suffix || ''); } }
      };
    }
    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: SPEC.type,
      plugins: [deco],
      data: { labels: SPEC.labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { top: 18, right: 16, left: 0, bottom: 4 } },
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, title: { display: false } },
        scales: scales
      }
    });
  }
  window.__chartjs.then(function() {
    render();
    new MutationObserver(render).observe(document.body,
      { attributes: true, attributeFilter: ['class'] });
  });
})();
</script>"

# ---- HTML shell (single-quoted R strings; no literal apostrophes) ---------------
stat_card <- function(label, value) {
  paste0('<div style="background:var(--bg-soft);border:1px solid var(--border);',
         'border-radius:6px;padding:8px 12px;"><div style="font-size:0.68rem;',
         'color:var(--muted);text-transform:uppercase;letter-spacing:.05em;',
         'margin-bottom:2px;">', label, '</div><div style="font-size:1.05rem;',
         'font-weight:600;color:var(--text);">', value, '</div></div>')
}

legend_item <- function(key, label) {
  paste0('<span style="display:inline-flex;align-items:center;gap:6px;',
         'font-size:11px;color:var(--muted);"><span data-k="', key,
         '" style="display:inline-block;width:10px;height:10px;',
         'border-radius:2px;background:#888;flex-shrink:0;"></span>',
         label, '</span>')
}

widget <- function(file, id, title, subtitle, stats, legend, height, source_html,
                   spec, aria) {
  spec_json <- jsonlite::toJSON(spec, auto_unbox = TRUE, na = "null", digits = 4)
  stats_html <- if (length(stats)) {
    paste0('<div style="display:grid;grid-template-columns:repeat(',
           length(stats), ',1fr);gap:8px;margin-bottom:12px;">',
           paste0(mapply(stat_card, names(stats), unlist(stats)), collapse = ""),
           '</div>')
  } else ""
  legend_html <- if (length(legend)) {
    paste0('<div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:12px;">',
           paste0(mapply(legend_item, names(legend), unlist(legend)),
                  collapse = ""), '</div>')
  } else ""
  js <- sub("__ID__", id, JS_TEMPLATE, fixed = TRUE)
  js <- sub("__SPEC__", spec_json, js, fixed = TRUE)
  html <- paste0(
    '<figure class="chart-embed" style="margin:0; font-family:var(--font-body);">\n',
    '<p style="margin:0 0 3px;font-size:10px;letter-spacing:0.13em;',
    'text-transform:uppercase;color:var(--muted);">', KICKER, '</p>\n',
    '<p style="margin:0 0 3px;font-size:18px;font-weight:500;color:var(--text);',
    'line-height:1.3;">', title, '</p>\n',
    '<p style="margin:0 0 18px;font-size:12px;color:var(--muted);">', subtitle,
    '</p>\n', stats_html, legend_html,
    '<div style="position:relative; width:100%; height:', height, 'px;">\n',
    '<canvas id="', id, '" role="img" aria-label="', aria, '"></canvas>\n</div>\n',
    '<div style="margin-top:14px;padding-top:10px;border-top:1px solid ',
    'var(--border);display:flex;justify-content:space-between;font-size:10px;',
    'color:var(--muted);letter-spacing:0.02em;"><span>Source: ', source_html,
    ' Author&#8217;s calculations.</span><a href="', SITE,
    '" target="_blank" rel="noopener" style="color:inherit;',
    'text-decoration:underline;">nikkhosravipour.com</a></div>\n</figure>',
    js)
  writeLines(html, file.path(DIR_WIDGETS, file))
  cat(sprintf("  widget -> output/widgets/%s\n", file))
}

# ---- spec helpers ----------------------------------------------------------------
fmt_m <- function(d) format(d, "%Y-%m")
fmt_d <- function(d) format(d, "%Y-%m-%d")

band_idx <- function(dates) {
  out <- list()
  for (i in seq_len(nrow(PHASES))) {
    if (PHASES$phase[i] == 0) next
    idx <- which(dates >= PHASES$start[i] & dates <= PHASES$end[i])
    if (!length(idx)) next
    out[[length(out) + 1]] <- list(from = min(idx) - 1, to = max(idx) - 1)
  }
  out
}

vline_idx <- function(dates, slugs) {
  ev <- EVENTS[EVENTS$slug %in% slugs, ]
  out <- list()
  for (i in seq_len(nrow(ev))) {
    j <- which.min(abs(as.numeric(dates - ev$date[i])))
    if (abs(as.numeric(dates[j] - ev$date[i])) > 7) next
    out[[length(out) + 1]] <- list(x = j - 1, text = ev$slug[i])
  }
  out
}

rds <- function(name) {
  p <- file.path(DIR_OUT, paste0(name, ".rds"))
  if (!file.exists(p)) { message("  SKIP (no rds): ", name); return(NULL) }
  readRDS(p)
}
num <- function(x) ifelse(is.finite(x), round(x, 2), NA)

guide <- c("# Embedding the Argentina widgets", "",
           "Same mechanics as the taylor-rule widgets: Chart.js 4.4.1 from jsDelivr (cdn.jsdelivr.net)",
           "behind `window.__chartjs`, light/dark via `is-light` on `body`.", "",
           "| File | Canvas | Recommended iframe height |",
           "|------|--------|---------------------------|")
embed <- function(file, canvas, rec) {
  guide <<- c(guide, sprintf("| %s | %d px | %d px |", file, canvas, rec))
}

# ==================================================================================
# fig01 decomposition (stacked bars)
fw <- rds("fig01_decomposition")
if (!is.null(fw)) {
  groups <- intersect(c("factor_fx_purchases", "factor_treasury",
                        "factor_sterilization", "factor_interest", "factor_other"),
                      names(fw))
  keys <- c(factor_fx_purchases = "blue", factor_treasury = "crimson",
            factor_sterilization = "amber", factor_interest = "purple",
            factor_other = "gray")
  labs <- c(factor_fx_purchases = "FX purchases", factor_treasury = "Treasury",
            factor_sterilization = "Sterilization", factor_interest = "Interest paid",
            factor_other = "Other")
  ds <- lapply(groups, function(g)
    list(label = labs[[g]], key = keys[[g]], data = num(fw[[g]] / 1000), width = 0))
  peak <- max(abs(fw$factor_fx_purchases), na.rm = TRUE) / 1000
  widget("fig01_decomposition.html", "arg-fig01",
         "Base-Money Creation by Source",
         "Monthly factores de explicaci&oacute;n, ARS bn &middot; the anchor decomposition behind Test 2",
         list("Largest monthly FX-purchase emission" = sprintf("ARS %.0fbn", peak),
              "Factor groups" = length(groups)),
         setNames(as.list(unname(labs[groups])), unname(keys[groups])),
         280,
         '<a href="https://www.bcra.gob.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">BCRA Estad&iacute;sticas API</a>.',
         list(type = "bar", stacked = TRUE, labels = fmt_m(fw$month),
              xEvery = 6, datasets = ds, bands = band_idx(fw$month)),
         "Stacked bar chart of monthly base money creation by source")
  embed("fig01_decomposition.html", 280, 470)
}

# fig02 inflation + band rate
df <- rds("fig02_inflation")
if (!is.null(df)) {
  widget("fig02_inflation_phases.html", "arg-fig02",
         "Monthly Inflation and the Exchange-Rate Rule",
         "Headline and core m/m % against the announced crawl or band-edge rate",
         list("Peak headline m/m" = sprintf("%.1f%%", max(df$infl_headline, na.rm = TRUE)),
              "Months above 2% (post-2025-06)" =
                sum(df$infl_headline > 2 & df$date >= as.Date("2025-06-01"), na.rm = TRUE)),
         list(crimson = "Headline", actual = "Core", blue = "Crawl/band rate"),
         260,
         '<a href="https://www.indec.gob.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">INDEC</a>, BCRA.',
         list(type = "line", labels = fmt_m(df$date), xEvery = 6,
              datasets = list(
                list(label = "Headline", key = "crimson", data = num(df$infl_headline)),
                list(label = "Core", key = "actual", data = num(df$infl_core), dash = TRUE, width = 1.5),
                list(label = "Crawl/band rate", key = "blue", data = num(df$band_rate))),
              bands = band_idx(df$date)),
         "Line chart of monthly inflation with the exchange rate rule overlaid")
  embed("fig02_inflation_phases.html", 260, 450)
}

# fig03 daily gap
df <- rds("fig03_gap")
if (!is.null(df)) {
  ds <- list(list(label = "Blue gap", key = "blue", data = num(df$gap_blue), width = 1.5))
  lg <- list(blue = "Blue vs A3500")
  if ("gap_ccl" %in% names(df)) {
    ds[[2]] <- list(label = "CCL gap", key = "amber", data = num(df$gap_ccl), width = 1)
    lg$amber <- "CCL vs A3500"
  }
  widget("fig03_gap_events.html", "arg-fig03",
         "The Parallel Exchange-Rate Gap",
         "Daily premium of parallel dollars over the official wholesale rate, %",
         list("Peak gap" = sprintf("%.0f%%", max(df$gap_blue, na.rm = TRUE)),
              "Latest" = sprintf("%.1f%%", tail(stats::na.omit(df$gap_blue), 1))),
         lg, 260,
         '<a href="https://bluelytics.com.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">Bluelytics</a>, BCRA A3500, &Aacute;mbito.',
         list(type = "line", labels = fmt_d(df$date), xEvery = 120, datasets = ds,
              bands = band_idx(df$date),
              vlines = vline_idx(df$date, c("caputo_deval", "imf_band",
                                            "ba_election", "us_swap",
                                            "indexed_band_start"))),
         "Daily parallel exchange rate gap with event flags")
  embed("fig03_gap_events.html", 260, 440)
}

# fig04 remonetization
df <- rds("fig04_remonetization")
if (!is.null(df)) {
  widget("fig04_remonetization.html", "arg-fig04",
         "Real Money Balances",
         "Deflated by headline CPI, December 2023 = 100 &middot; the confidence test in one picture",
         list("Real base, trough to latest" =
                sprintf("%.0f &rarr; %.0f", min(df$real_base, na.rm = TRUE),
                        tail(stats::na.omit(df$real_base), 1)),
              "Real M2 latest" = sprintf("%.0f", tail(stats::na.omit(df$real_m2), 1))),
         list(blue = "Real monetary base", green = "Real private transactional M2"),
         260,
         'BCRA, <a href="https://www.indec.gob.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">INDEC</a>.',
         list(type = "line", labels = fmt_m(df$date), xEvery = 6,
              datasets = list(
                list(label = "Real base", key = "blue", data = num(df$real_base)),
                list(label = "Real M2", key = "green", data = num(df$real_m2))),
              bands = band_idx(df$date)),
         "Line chart of real monetary base and real M2")
  embed("fig04_remonetization.html", 260, 440)
}

# fig05 dispersion — CUT from the export in the scorecard reframe. The paper
# concedes the relative-price dispersion chart "does not identify"; the series is
# dropped rather than shown. R/06_dispersion.R is left on disk but unwired from
# run_all.R. (Do not re-add without restoring the script to the orchestration.)

# fig06 ITCRM
df <- rds("fig06_itcrm")
if (!is.null(df)) {
  widget("fig06_itcrm.html", "arg-fig06",
         "Real Appreciation and Band-Binding Risk (ITCRM)",
         "BCRA real multilateral index, monthly mean &middot; lower = stronger peso; sustained real appreciation presses the band&#8217;s weak side &mdash; a durability risk, not a price-stability win",
         list("Appreciation since Dec 2023" =
                sprintf("%.0f%%", 100 * (tail(stats::na.omit(df$itcrm), 1) /
                  df$itcrm[which(df$date == as.Date("2023-12-01"))] - 1))),
         list(purple = "ITCRM"),
         240,
         '<a href="https://www.bcra.gob.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">BCRA</a> ITCRM.',
         list(type = "line", labels = fmt_m(df$date), xEvery = 6,
              datasets = list(list(label = "ITCRM", key = "purple",
                                   data = num(df$itcrm))),
              bands = band_idx(df$date)),
         "Line chart of the real multilateral exchange rate")
  embed("fig06_itcrm.html", 240, 400)
}

# fig07 reserves
df <- rds("fig07_reserves")
if (!is.null(df)) {
  widget("fig07_reserves.html", "arg-fig07",
         "Gross International Reserves",
         "Daily, USD mn &middot; the September&ndash;October 2025 drain and the 2026 purchase program",
         list("Trough" = sprintf("USD %.1fbn", min(df$reserves_gross, na.rm = TRUE) / 1000),
              "Latest" = sprintf("USD %.1fbn", tail(stats::na.omit(df$reserves_gross), 1) / 1000)),
         list(actual = "Gross reserves"),
         260,
         '<a href="https://www.bcra.gob.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">BCRA</a>.',
         list(type = "line", labels = fmt_d(df$date), xEvery = 120,
              datasets = list(list(label = "Reserves", key = "actual",
                                   data = num(df$reserves_gross), width = 1.5)),
              bands = band_idx(df$date),
              vlines = vline_idx(df$date, c("ba_election", "us_swap", "midterms",
                                            "indexed_band_start"))),
         "Daily gross international reserves with event flags")
  embed("fig07_reserves.html", 260, 440)
}

# fig08 comparative
df <- rds("fig08_comparative")
if (!is.null(df)) {
  rels <- sort(unique(df$rel))
  series_for <- function(e) {
    g <- df[df$episode == e, ]
    num(g$infl[match(rels, g$rel)])
  }
  widget("fig08_comparative.html", "arg-fig08",
         "Stabilization Paths Compared",
         "Monthly inflation, aligned at t = 0 (program start) &middot; Brazil broke indexation; Argentina 2026 institutionalized it",
         list("Episodes" = "3", "Window" = "t&minus;12 .. t+30"),
         list(amber = "Israel 1985", green = "Brazil 1994", crimson = "Argentina 2023"),
         260,
         'FRED, <a href="https://www.bcb.gov.br" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">BCB SGS</a>, INDEC.',
         list(type = "line", labels = as.character(rels), xEvery = 6,
              datasets = list(
                list(label = "Israel 1985", key = "amber", data = series_for("Israel 1985")),
                list(label = "Brazil 1994", key = "green", data = series_for("Brazil 1994")),
                list(label = "Argentina 2023", key = "crimson",
                     data = series_for("Argentina 2023"))),
              vlines = list(list(x = which(rels == 0) - 1, text = "t=0"))),
         "Aligned stabilization inflation paths for Israel Brazil and Argentina")
  embed("fig08_comparative.html", 260, 440)
}

# fig09 recursive elasticity
fr <- rds("fig09_recursive")
if (!is.null(fr)) {
  rec <- fr$recursive; rol <- fr$rolling
  rol_full <- num(rec$beta * NA)
  rol_idx <- match(rol$date, rec$date)
  rol_full[rol_idx[!is.na(rol_idx)]] <- num(rol$beta[!is.na(rol_idx)])
  widget("fig09_recursive_elasticity.html", "arg-fig09",
         "Money-Demand Elasticity, Recursively Estimated",
         "ln(M0/P) on ln(expected inflation) &middot; dashed reference: Obstfeld&#8217;s &minus;0.12",
         list("Latest recursive" = sprintf("%.3f", tail(rec$beta, 1)),
              "Obstfeld benchmark" = "&minus;0.12"),
         list(blue = "Recursive (&plusmn;2 NW se)", amber = "Rolling 24m"),
         240,
         'BCRA REM, <a href="https://www.indec.gob.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">INDEC</a>, BCRA.',
         list(type = "line", labels = fmt_m(rec$date), xEvery = 4, hline = -0.12,
              datasets = list(
                list(label = "upper", key = "blue", data = num(rec$beta + 2 * rec$se),
                     width = 0),
                list(label = "lower", key = "blue", data = num(rec$beta - 2 * rec$se),
                     width = 0, fillTo = 0, fillAlpha = 0.15),
                list(label = "Recursive", key = "blue", data = num(rec$beta)),
                list(label = "Rolling 24m", key = "amber", data = rol_full,
                     dash = TRUE, width = 1.5)),
              bands = band_idx(rec$date)),
         "Recursive and rolling money demand elasticity estimates")
  embed("fig09_recursive_elasticity.html", 240, 420)
}

# fig10 crisis window (EMBI left, gap right)
df <- rds("fig10_crisis")
if (!is.null(df)) {
  has_embi <- "embi" %in% names(df) && any(!is.na(df$embi))
  ds <- list(list(label = "Parallel gap", key = "blue", data = num(df$gap_blue),
                  width = 1.6))
  lg <- list(blue = "Parallel gap (%)")
  spec_y1 <- FALSE
  if (has_embi) {
    ds <- list(
      list(label = "EMBI", key = "crimson", data = num(df$embi), width = 1.6),
      list(label = "Parallel gap", key = "blue", data = num(df$gap_blue),
           width = 1.6, y2 = TRUE))
    lg <- list(crimson = "EMBI (bp, left)", blue = "Parallel gap (%, right)")
    spec_y1 <- TRUE
  }
  widget("fig10_embi_crisis.html", "arg-fig10",
         "The September&ndash;October 2025 Sequence",
         "Daily EMBI and parallel gap through the near-collapse and the US Treasury backstop",
         list("Window" = "Aug 15 &ndash; Nov 30, 2025"),
         lg, 260,
         '&Aacute;mbito (semi-official), <a href="https://bluelytics.com.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">Bluelytics</a>.',
         list(type = "line", labels = fmt_d(df$date), xEvery = 10, y1 = spec_y1,
              y1Suffix = "%", datasets = ds,
              vlines = vline_idx(df$date, c("ba_election", "us_swap", "midterms"))),
         "Daily EMBI and parallel gap during the crisis window")
  embed("fig10_embi_crisis.html", 260, 440)
}

# fig11 corridor (level path + 2026 FX flow vs the corridor band)
fc <- rds("fig11_corridor")
if (!is.null(fc)) {
  lvl <- fc$level
  y26 <- fc$path
  # align the 2026 flow series onto the level series' monthly axis
  flow <- rep(NA_real_, nrow(lvl))
  idx <- match(format(y26$month, "%Y-%m"), format(lvl$date, "%Y-%m"))
  flow[idx[!is.na(idx)]] <- y26$cum_fx_gdp[!is.na(idx)]
  widget("fig11_corridor.html", "arg-fig11",
         "Base Money vs the Money-Demand Corridor",
         "Base money as % of GDP against the BCRA&#8217;s Dec-2026 projection, with the cumulative 2026 emission from reserve purchases (GDP at Q4-2025 annual rate)",
         list("Corridor (Dec 2026)" = sprintf("%.1f&ndash;%.1f%% GDP",
                                              fc$corridor[1], fc$corridor[2]),
              "Base money (May 2026)" = sprintf("%.1f%% GDP",
                                                tail(lvl$bm_gdp, 1)),
              "2026 FX emission to date" = sprintf("%.2f%% GDP",
                                                   tail(y26$cum_fx_gdp, 1))),
         list(actual = "Base money / GDP",
              blue = "Cumulative 2026 FX-purchase emission"),
         260,
         '<a href="https://www.bcra.gob.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">BCRA</a>, datos.gob.ar.',
         list(type = "line", labels = fmt_m(lvl$date), xEvery = 3,
              ySuffix = "%",
              hband = list(lo = fc$corridor[1], hi = fc$corridor[2],
                           label = "BCRA money-demand corridor (Dec 2026)"),
              datasets = list(
                list(label = "Base money / GDP", key = "actual",
                     data = num(lvl$bm_gdp), width = 2.5),
                list(label = "Cumulative 2026 FX emission", key = "blue",
                     data = num(flow), width = 2))),
         "Base money to GDP against the BCRA corridor, with the 2026 reserve-purchase flow")
  embed("fig11_corridor.html", 260, 420)
}

# ==================================================================================
# §VI durability exhibits (fig12-14). fig13 is pipeline-derived; fig12/fig14 are
# documentary (IMF CR 2026/105) and carry a "not pipeline-derived" source flag.

DOC_SRC <- paste0('<a href="https://www.imf.org/en/publications/cr/issues/2026/',
  '05/22/argentina-2026-article-iv-consultation-second-review-under-the-extended-',
  'arrangement-under-the-extended-fund-facility-576253" target="_blank" ',
  'rel="noopener" style="color:inherit;text-decoration:underline;">IMF Country ',
  'Report 2026/105</a> (Tables 1, 2, 7, 12) &middot; documentary, not pipeline-derived.')

# fig13 — the remunerated-liability unwind (pipeline)
fu <- rds("fig13_unwind")
if (!is.null(fu)) {
  u <- fu$series
  widget("fig13_unwind.html", "arg-fig13",
         "The Remunerated-Liability Unwind",
         "Monthly sterilization factor, ARS bn &middot; the quasi-fiscal money machine was switched off, not left standing &mdash; the calculation distortion removed at the cost of a one-off base expansion",
         list("Sterilization ceases" = format(fu$cease_month, "%Y-%m"),
              "LEFI elimination one-off" = sprintf("~ARS %.1ftn", fu$elim_val / 1000)),
         list(amber = "Sterilization factor (ARS bn/mo)"),
         260,
         '<a href="https://www.bcra.gob.ar" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">BCRA</a> factores de explicaci&oacute;n.',
         list(type = "bar", labels = fmt_m(u$month), xEvery = 6,
              datasets = list(list(label = "Sterilization", key = "amber",
                                   data = num(u$sterilization), width = 0)),
              bands = band_idx(u$month),
              vlines = vline_idx(u$month, c("phase2", "indexed_band_start"))),
         "Monthly sterilization factor showing the remunerated-liability unwind")
  embed("fig13_unwind.html", 260, 440)
}

# fig12 — gross vs net (NIR) reserves (documentary)
f12 <- rds("fig12_nir")
if (!is.null(f12)) {
  widget("fig12_nir.html", "arg-fig12",
         "Gross vs Net International Reserves",
         "USD bn, end-year &middot; gross reserves recover while NIR stays deeply negative &mdash; the buffer is borrowed and encumbered (swap lines, FX-deposit reserve requirements, Fund credit)",
         list("End-2025 gross" = sprintf("US$%.1fbn", f12$gross[2]),
              "End-2025 NIR" = sprintf("US$%.1fbn", f12$nir[2]),
              "Gross / ARA (2025)" = sprintf("%.0f%%", f12$ara_2025)),
         list(blue = "Gross reserves", crimson = "Net (NIR)"),
         260, DOC_SRC,
         list(type = "bar", labels = f12$years, xEvery = 1,
              datasets = list(
                list(label = "Gross", key = "blue", data = num(f12$gross), width = 0),
                list(label = "NIR", key = "crimson", data = num(f12$nir), width = 0)),
              hline = 0),
         "Grouped bar chart of gross versus net international reserves 2024 to 2026")
  embed("fig12_nir.html", 260, 430)
}

# fig14 — the 2026-28 external maturity wall (documentary)
f14 <- rds("fig14_cover")
if (!is.null(f14)) {
  widget("fig14_cover.html", "arg-fig14",
         "The 2026&ndash;28 External Maturity Wall",
         "USD bn of external amortizations falling due &middot; IMF repurchases plus non-IMF external principal &mdash; the financing need the anchor must roll",
         list("2026" = sprintf("US$%.1fbn", f14$total[1]),
              "2027" = sprintf("US$%.1fbn", f14$total[2]),
              "2028" = sprintf("US$%.1fbn", f14$total[3])),
         list(crimson = "IMF repurchases", amber = "External (non-IMF)"),
         260, DOC_SRC,
         list(type = "bar", stacked = TRUE, labels = f14$years, xEvery = 1,
              datasets = list(
                list(label = "IMF", key = "crimson", data = num(f14$imf), width = 0),
                list(label = "External", key = "amber", data = num(f14$ext), width = 0))),
         "Stacked bar chart of the 2026 to 2028 external maturity wall")
  embed("fig14_cover.html", 260, 430)
}

writeLines(guide, file.path(DIR_WIDGETS, "embed_guide.md"))
cat("  guide -> output/widgets/embed_guide.md\n")
message("09_export_charts done.")
