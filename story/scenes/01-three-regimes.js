// story/scenes/01-three-regimes.js — CANVAS-design.md §2 row 1 "Three
// regimes" (A5a). Draws fig02_inflation_phases (Headline / Core /
// Crawl-band rate) using only K18 primitives (src/canvas/primitives) +
// the SPEC data adapter (src/canvas/data) — no raw d3-shape line
// generators here, per A5a's brief. `RAW` below is a labels+dataset
// slice of the real widget's own SPEC (output/widgets/
// fig02_inflation_phases.html), byte-identical to what the build's
// `assertScenesMatchSpec` (K18) re-extracts from that file — it deep-
// equals `series` below against a fresh extraction by dataset label, so
// this literal must stay in sync if the widget is ever re-exported.
import { lineDraw, axisMorph, tickCollide, reducedTickSet } from '../../../../scrolly-kit/src/canvas/primitives/index.js';
import { seriesFromSpec, bandsFromSpec } from '../../../../scrolly-kit/src/canvas/data/seriesFromSpec.js';
import captions from '../captions.json' with { type: 'json' };

const SPEC_ID = 'fig02_inflation_phases';
const CAP = captions.scenes.find((s) => s.id === '01-three-regimes');

const RAW = {"labels":["2022-01","2022-02","2022-03","2022-04","2022-05","2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12","2023-01","2023-02","2023-03","2023-04","2023-05","2023-06","2023-07","2023-08","2023-09","2023-10","2023-11","2023-12","2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"],"datasets":[{"label":"Headline","key":"crimson","data":[null,4.69,6.73,6.05,5.05,5.3,7.41,6.97,6.17,6.35,4.92,5.12,6.03,6.63,7.68,8.4,7.77,5.95,6.34,12.44,12.75,8.3,12.81,25.47,20.61,13.24,11.01,8.83,4.18,4.58,4.03,4.17,3.47,2.69,2.43,2.7,2.21,2.4,3.73,2.78,1.5,1.62,1.9,1.88,2.08,2.34,2.47,2.85,2.88,2.9,3.38,2.58,2.15]},{"label":"Core","key":"actual","data":[null,4.45,6.4,6.71,5.2,5.08,7.33,6.8,5.51,5.55,4.76,5.25,5.35,7.69,7.21,8.4,7.84,6.49,6.5,13.79,13.43,8.81,13.4,28.26,20.22,12.29,9.41,6.3,3.73,3.65,3.79,4.12,3.26,2.92,2.71,3.2,2.4,2.92,3.19,3.21,2.2,1.71,1.48,2.04,1.9,2.22,2.64,3.03,2.63,3.08,3.19,2.29,1.9]},{"label":"Crawl/band rate","key":"blue","data":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,2.47,2.85,2.88,2.9,3.38]}]};

// Colour authority is captions.json's own `.k data-key` mapping (its
// _meta: "the scene maps data-key to the series colour"), not
// seriesFromSpec's nearest-token guess — fig02's near-black Core line
// (SPEC `key: "actual"`) is RGB-nearest to k-crimson, not the k-gray the
// caption actually names for it.
function paint(label, hex, token) {
  const s = seriesFromSpec(RAW, label);
  s.color = { hex, token };
  return s;
}
const HEADLINE = paint('Headline', 'var(--k-crimson)', 'k-crimson');
const CORE = paint('Core', 'var(--k-gray)', 'k-gray');
const CRAWL = paint('Crawl/band rate', 'var(--k-blue)', 'k-blue');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// A7-fix5 step 3: even with the corrected 5-tick boundary set (above),
// the last two ticks — "Jan 2026" (interior) and "May 2026" (domain
// endpoint) — still overlap on ≤860px (measured: 768/390, both themes).
// Short year form on the same breakpoint tickClampBottom already uses
// buys back just enough width to clear it, nothing else changes.
function monthLabel(d) {
  const y = d.getUTCFullYear();
  const short = typeof matchMedia === 'function' && matchMedia('(max-width: 860px)').matches;
  return `${MONTHS[d.getUTCMonth()]} ${short ? `'${String(y).slice(-2)}` : y}`;
}
function fmtPct(v) {
  return `${v.toFixed(1)} %`;
}

// A8-register-h item 9 (critique §10, §D(1) magnitude legibility): "the
// series maximum — 25.5 %, the number the whole story opens on — is
// unlabeled". `lineDraw`'s own end label only ever marks the LAST point
// drawn, not the series' own maximum (Dec 2023, mid-series) — a direct
// value label there is added separately, in every beat where the
// headline is drawn fully settled (2-4; beat 1 is the scrub that draws
// it, so the max is off-screen-left of the drawing head for most of that
// beat's own dwell and gets its own end label as it passes through
// naturally). Derived live from `HEADLINE.y` (never hardcoded), laid out
// post-geometry with the same real-bbox candidate cascade `03-treasury.js`
// (`drawLefiFlags`/`annotateRegimeTotal`) uses — `boxesIntersect`
// reproduced locally for the same reason that file's own copy is: no
// primitive exports it (`src/canvas/primitives/index.js`).
function boxesIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function annotateHeadlineMax(stage, safe, x, y) {
  let maxI = -1;
  let maxV = -Infinity;
  HEADLINE.y.forEach((v, i) => {
    if (Number.isFinite(v) && v > maxV) {
      maxV = v;
      maxI = i;
    }
  });
  if (maxI < 0) return;
  const cx = x(HEADLINE.x.values[maxI]);
  const cy = y(maxV);
  const existing = stage
    .selectAll('text.label, text.annot, .mark.leader')
    .nodes()
    .map((n) => n.getBBox());
  const candidates = [
    { x: cx, y: cy - 10, anchor: 'middle' },
    { x: Math.min(cx + 6, safe.x + safe.width - 4), y: cy - 4, anchor: 'start' },
    { x: Math.max(cx - 6, safe.x + 4), y: cy - 4, anchor: 'end' },
    { x: cx, y: cy + 18, anchor: 'middle' }
  ];
  const label = stage.append('text').attr('class', 'label headline-max').text(fmtPct(maxV));
  const node = label.node();
  let chosen = candidates[0];
  for (const cand of candidates) {
    label.attr('x', cand.x).attr('y', cand.y).attr('text-anchor', cand.anchor);
    const box = node.getBBox();
    if (!existing.some((o) => boxesIntersect(box, o))) {
      chosen = cand;
      break;
    }
  }
  label.attr('x', chosen.x).attr('y', chosen.y).attr('text-anchor', chosen.anchor);
}

function extent(seriesList) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of seriesList) {
    for (const v of s.y) {
      if (Number.isFinite(v)) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
  }
  return [lo, hi];
}

function buildScales(stage, ctx) {
  const [lo, hi] = extent([HEADLINE, CORE, CRAWL]);
  const x = ctx.d3.scale
    .scaleTime()
    .domain(ctx.d3.array.extent(HEADLINE.x.values))
    .range([stage.safe.x, stage.safe.x + stage.safe.width]);
  const y = ctx.d3.scale
    .scaleLinear()
    .domain([Math.min(0, lo), hi])
    .nice()
    .range([stage.safe.y + stage.safe.height, stage.safe.y]);
  return { x, y };
}

// A7-fix4 P1(c) / A8 (v3 §B): the live viewport-space Y a staggered
// protected tick's own bottom edge may never cross — tickCollide.js's own
// header comment explains why this is measured, not a guessed padding
// budget. Simply the stage's own true outer edge now (below): the mat can
// no longer be anywhere near it (A8 made that impossible by construction,
// not by measuring). NOT `stage.height - stage.padding` (a tempting first
// guess) — that value is the axis LINE's own y-position, not a boundary
// past it: `stage.safe` already reserves exactly `stage.padding` px of
// headroom below the axis line for a single row of tick text to grow
// into — subtracting `padding` a second time here left row 0's own text
// already consuming the entire budget, so the clamp collapsed every row-1
// offset to ~0px (measured: `translate(0, 0)` on ticks pass 1 had
// legitimately assigned to row 1).
function tickClampBottom(stage) {
  const svgRect = stage.node().getBoundingClientRect();
  let bottom = svgRect.top + stage.height;
  // A8 (v3 §B, supersedes the A7-fix4 mat-overlap check this used to run):
  // overlap between the caption mat and the stage is now impossible by
  // construction on BOTH breakpoints — ≤860 the mat is `position:fixed`
  // to the viewport bottom, physically outside `.stage`'s own `60svh`
  // sticky box (canvas.css), and >860 the mat lives in a reserved column
  // the stage's own (narrower) CSS width never reaches. There is no
  // longer a live mat rect to measure or clamp against; `bottom` is
  // simply the stage's own real bottom edge.
  return bottom;
}

// A7-fix5 (tribunal-verified root cause): fig02's `bands` are inclusive
// index RANGES (`{from:23,to:38},{from:39,to:47},{from:48,to:52}`) — the
// old `bands.flatMap((b) => [b.from, b.to])` emitted BOTH edges of every
// regime CHANGE (a band's `to` and the next band's `from`, one month
// apart — Mar 2025 + Apr 2025; Dec 2025 + Jan 2026) as if they were two
// separate boundaries, not one transition: 7 ticks where the design
// means 5, hence the crowding/overlap on ≤1280px. Keep every band's
// `from`; keep a band's `to` only when no other band starts the very
// next month (a genuine end, e.g. the dataset's last band, not the eve
// of the next band's start).
function monthsApart(a, b) {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

// Stage grammar (§1.5): "only endpoint ticks + regime-boundary ticks; no
// axis titles" — boundary ticks come straight off the SPEC's own `bands`
// (the same three regime windows the bars slide in from in beat 1).
function drawAxis(stage, x, ctx) {
  const bands = bandsFromSpec(ctx.specs[SPEC_ID]);
  const domain = x.domain();
  const genuineEnds = bands.filter((b) => !bands.some((other) => other !== b && monthsApart(b.to, other.from) === 1));
  // A7-fix2 P2-7a follow-up: a band boundary that happens to land exactly
  // ON a domain endpoint (this SPEC's own last regime `to` IS the
  // dataset's last date) used to draw "May 2026" twice at identical
  // coordinates — both survived tickCollide's protection once boundaries
  // became unconditionally kept. De-duplicate against the endpoints here,
  // at the source, rather than teach the collision primitive to reason
  // about two DIFFERENT protected ticks sharing one pixel.
  const boundaries = [...new Set([...bands.map((b) => b.from), ...genuineEnds.map((b) => b.to)])]
    .filter((d) => d.getTime() !== domain[0].getTime() && d.getTime() !== domain[domain.length - 1].getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  // A8-register-f item 12 (Fable ruling, closes the scene-1 @390 BLOCKED
  // verdict — two prior waves proved `tickCollide`'s own stagger model
  // cannot fit all 5 ticks at this width, `clampBottom` itself the
  // binding constraint, not row count): below 430px this scene declares a
  // reduced tick set instead of asking the primitive for a row it cannot
  // use — the two domain endpoints (always kept) plus December 2023, the
  // one interior boundary this scene's own first caption names by date
  // ("Monthly inflation ran at 25.5 % in December 2023") and where the
  // disinflation this whole scene narrates begins. April 2025 and January
  // 2026 drop only at this width; the full 5-tick set (and 1440's own
  // layout) is untouched — `reducedTickSet` returns the unfiltered list
  // whenever `narrow` is false.
  const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 430px)').matches;
  const isDec2023 = (d) => d.getUTCFullYear() === 2023 && d.getUTCMonth() === 11;
  const ticks = reducedTickSet(domain, boundaries, narrow, isDec2023);
  const activeBoundaries = narrow ? boundaries.filter(isDec2023) : boundaries;
  const g = stage
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(g, x, x, 1, { ticks, format: monthLabel });
  // A7-fix P2-7: regime-boundary ticks are the interior ticks §1.5
  // mandates and this scene's own captions name — `protect: boundaries`
  // keeps them all; only a non-boundary neighbour (there are none in this
  // scene's own tick list today) would ever yield instead. At the reduced
  // width, `activeBoundaries` is the same one-tick reduced set `ticks`
  // above carries — nothing to protect against dropping that isn't
  // already the ONLY interior tick rendered.
  tickCollide(g, { protect: activeBoundaries, clampBottom: tickClampBottom(stage) });
}

// b1 (scrub, CAP.beats[0]): headline draws left to right with scroll.
function headlineBeat() {
  let x;
  let y;
  return {
    motion: 'scrub',
    caption: CAP.beats[0],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x, ctx);
    },
    update(stage, t) {
      const r = lineDraw(stage, HEADLINE, { x, y }, t, { fmt: fmtPct });
      r.path.classed('mark', true);
      if (r.label) r.label.classed('label', true);
    }
  };
}

// b2 (eased, CAP.beats[1]): the three regime bands slide in under the
// (now-settled) headline line.
function regimeBandsBeat() {
  let x;
  let y;
  let bands;
  let safe;
  return {
    motion: 'eased',
    caption: CAP.beats[1],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      safe = stage.safe;
      stage.append('g').attr('class', 'regime-bands');
      drawAxis(stage, x, ctx);
      lineDraw(stage, HEADLINE, { x, y }, 1, { fmt: fmtPct }).path.classed('mark', true);
      annotateHeadlineMax(stage, safe, x, y);
      bands = bandsFromSpec(ctx.specs[SPEC_ID]);
    },
    update(stage, t) {
      stage
        .select('g.regime-bands')
        .selectAll('rect.mark')
        .data(bands)
        .join('rect')
        .attr('class', 'mark')
        .attr('y', safe.y)
        .attr('height', safe.height)
        .attr('x', (d) => x(d.from))
        // A7-fix2 P3-9b: `x(d.to) - x(d.from)` is occasionally a hair
        // negative (float rounding when two adjacent boundaries land on
        // near-identical pixel positions), which threw a live `<rect
        // width>` console error on scene entry — clamp rather than let an
        // SVG attribute go negative.
        .attr('width', (d) => Math.max(0, (x(d.to) - x(d.from)) * t))
        // A8-register-h item 6 (critique §6, "same .14 x3 composite in
        // 01-three-regimes.js"): an `opacity` attribute composites at
        // render time, silently dropping whatever contrast the fill's own
        // colour declares (site DESIGN.md §6, quoted in scrolly-kit's own
        // DESIGN.md Colors section). Pre-mixed with `--paper` instead —
        // one real, static colour at the same 14% strength, themed
        // automatically since `--paper` swaps light/dark.
        .attr('fill', 'color-mix(in oklab, var(--k-gray) 14%, var(--paper))');
    }
  };
}

// b3 (eased, CAP.beats[2]): an authored 2-3 % band (not a SPEC series)
// shades in — "nine months above 2 % since mid-2025".
function twoThreeBandBeat() {
  let x;
  let y;
  let safe;
  return {
    motion: 'eased',
    caption: CAP.beats[2],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      safe = stage.safe;
      stage
        .append('rect')
        .attr('class', 'mark zone')
        .attr('x', safe.x)
        .attr('y', y(3))
        .attr('height', Math.max(0, y(2) - y(3)))
        .attr('width', 0)
        // A8-register-h item 6: pre-mixed colour, not an opacity
        // composite — see `regimeBandsBeat`'s own comment above.
        .attr('fill', 'color-mix(in oklab, var(--oxblood) 14%, var(--paper))');
      drawAxis(stage, x, ctx);
      lineDraw(stage, HEADLINE, { x, y }, 1, { fmt: fmtPct }).path.classed('mark', true);
      // A8-register-c item 4 (§1.5: "annotations are typographic … never
      // boxed"): the label used to sit centred INSIDE the shaded zone
      // rect (`y(2.5)`, the band's own vertical mid-point) — the band's
      // own height (`y(2)-y(3)`, a 1-percentage-point span) is only a
      // little taller than the text itself, so the translucent fill read
      // as a padded box background behind it (critic: "renders as a
      // filled grey box with the text inside it", both viewports). The
      // zone rect stays (a real data mark — the 2-3% reference band, same
      // idiom as `drawGapZeroRef`'s dashed zero-line elsewhere in this
      // primitive set) but the TEXT moves above it, off the fill
      // entirely, connected by a short hairline `leader` — the same
      // text+leader pattern `drawVlines`/`drawGapZeroRef` (04-ballot-
      // box.js) already establish for every other typographic annotation
      // in this codebase.
      stage
        .append('line')
        .attr('class', 'leader')
        .attr('x1', safe.x + 4)
        .attr('x2', safe.x + 4)
        .attr('y1', y(3) - 16)
        .attr('y2', y(3));
      stage
        .append('text')
        .attr('class', 'annot')
        .attr('x', safe.x + 4)
        .attr('y', y(3) - 20)
        .text('2-3 % since mid-2025');
      annotateHeadlineMax(stage, safe, x, y);
    },
    update(stage, t) {
      // A8-register-f item 7 (closes critique's negative `<rect width>`
      // class, root cause `src/canvas/engine/index.js`'s own `tween()`,
      // now clamped at the source too): defensive clamp here as well,
      // same pattern `02-confidence.js`'s `wipeBeat` already applies to
      // its own clip rect — `t` should already be inside [0,1] by the
      // time it reaches here, but this scene turns it straight into an
      // SVG geometry attribute, so it costs nothing to guarantee locally.
      const clampedT = Math.max(0, Math.min(1, t));
      stage.select('rect.zone').attr('width', safe.width * clampedT);
    }
  };
}

// b4 (eased, CAP.beats[3]): the crawl/band ceiling draws in, settled 2-3 %
// zone and headline still in view — it crosses above headline in 2026.
function crawlBeat() {
  let x;
  let y;
  let safe;
  return {
    motion: 'eased',
    caption: CAP.beats[3],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      safe = stage.safe;
      stage
        .append('rect')
        .attr('class', 'mark zone')
        .attr('x', safe.x)
        .attr('y', y(3))
        .attr('width', safe.width)
        .attr('height', Math.max(0, y(2) - y(3)))
        // A8-register-h item 6: pre-mixed colour, not an opacity
        // composite — see `regimeBandsBeat`'s own comment above.
        .attr('fill', 'color-mix(in oklab, var(--oxblood) 14%, var(--paper))');
      drawAxis(stage, x, ctx);
      lineDraw(stage, HEADLINE, { x, y }, 1, { fmt: fmtPct }).path.classed('mark', true);
      annotateHeadlineMax(stage, safe, x, y);
    },
    update(stage, t) {
      const r = lineDraw(stage, CRAWL, { x, y }, t, { fmt: fmtPct });
      r.path.classed('mark', true);
      if (r.label) r.label.classed('label', true);
    }
  };
}

export default {
  id: '01-three-regimes',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  data: (ctx) => ctx.specs[SPEC_ID],
  series: [
    { label: HEADLINE.label, x: HEADLINE.x, y: HEADLINE.y },
    { label: CORE.label, x: CORE.x, y: CORE.y },
    { label: CRAWL.label, x: CRAWL.x, y: CRAWL.y }
  ],
  beats: [headlineBeat(), regimeBandsBeat(), twoThreeBandBeat(), crawlBeat()]
};
