// story/scenes-v2/04-ballot-box.js — S2-6a port of `story/scenes/
// 04-ballot-box.js` (CANVAS-design.md §2 row 4, "The ballot box",
// fig10_embi_crisis) to engine v2 (METHOD-RESET.md §3.1). `RAW`, `paint()`,
// `SPEC_ID` and the caption lookup below are copied verbatim from that
// file (data, not design). Everything else — the state schema, `draw()`,
// axis/annotation placement — is new, written fresh against the engine2
// contract: flat numeric `state` per beat, no full-stage wipe, idempotent
// draw. As-built rule 2 (brief): v1's bespoke per-frame "series name drops
// to the axis strip when the growing end label overlaps it" closure
// (`embiScrubBeat`'s own bbox check) is replaced here by
// `avoidPathCollisions` — a collision case resolved with the shared
// primitive, not a bespoke closure.
import { lineDraw, axisMorph, avoidPathCollisions, labelLeaders, measureEndLabelGutter } from '../../../../scrolly-kit/src/canvas/primitives/index.js';
import { seriesFromSpec, vlinesFromSpec } from '../../../../scrolly-kit/src/canvas/data/seriesFromSpec.js';
import captions from '../captions.json' with { type: 'json' };

const SPEC_ID = 'fig10_embi_crisis';
const CAP = captions.scenes.find((s) => s.id === '04-ballot-box');

const RAW = {"labels":["2025-08-15","2025-08-18","2025-08-19","2025-08-20","2025-08-21","2025-08-22","2025-08-25","2025-08-26","2025-08-27","2025-08-28","2025-08-29","2025-09-01","2025-09-02","2025-09-03","2025-09-04","2025-09-05","2025-09-08","2025-09-09","2025-09-10","2025-09-11","2025-09-12","2025-09-15","2025-09-16","2025-09-17","2025-09-18","2025-09-19","2025-09-22","2025-09-23","2025-09-24","2025-09-25","2025-09-26","2025-09-27","2025-09-29","2025-09-30","2025-10-01","2025-10-02","2025-10-03","2025-10-06","2025-10-07","2025-10-08","2025-10-09","2025-10-10","2025-10-13","2025-10-14","2025-10-15","2025-10-16","2025-10-17","2025-10-20","2025-10-21","2025-10-22","2025-10-23","2025-10-24","2025-10-27","2025-10-28","2025-10-29","2025-10-30","2025-10-31","2025-11-03","2025-11-04","2025-11-05","2025-11-06","2025-11-07","2025-11-10","2025-11-11","2025-11-12","2025-11-13","2025-11-14","2025-11-17","2025-11-18","2025-11-19","2025-11-20","2025-11-21","2025-11-24","2025-11-25","2025-11-26","2025-11-27","2025-11-28"],"datasets":[{"label":"EMBI","key":"crimson","data":[709,706,700,747,753,767,829,850,853,837,829,null,898,893,901,906,1108,1070,1024,1047,1140,1231,1167,1246,1456,1456,1089,1018,898,973,1060,1060,1115,1222,1264,1264,1165,1080,1016,1074,1071,932,932,1026,1004,1029,1089,1048,1075,1123,1081,1081,708,685,666,676,657,665,660,621,638,647,599,598,605,616,612,616,614,601,620,651,635,656,652,653,648]},{"label":"Parallel gap","key":"blue","data":[null,2.01,2.53,2.04,1.58,1.02,0.81,0.2,-0.32,-0.27,1.22,-1.91,-1.33,-1.48,-0.54,-0.4,-3.67,-3.08,-2.46,-1.93,-2.22,-1.16,-1.34,0.58,1.75,2.39,2.76,3.38,3.85,5.28,7.36,null,5.89,5.01,2.89,1.07,0.37,0.72,1.42,2.47,0.91,null,3.51,3.69,4.84,4.89,2.47,2.2,3.38,3.56,2.09,0.95,5.52,-0.74,-0.1,0.44,-0.55,-1.54,-1.57,-1.55,null,-2.53,-0.31,0.25,2,1.15,1.07,1.71,2.31,1.25,-0.12,null,null,0.5,-0.59,-1.24,-1.77]}]};

// Colour authority is captions.json's own `.k data-key` mapping — EMBI is
// the only series a caption span names; Parallel gap stays k-gray per the
// stage grammar ("one accent series + k-gray for everything else, except
// where a caption names >=2 series").
// A7-fix3 P4: EMBI is now painted the story accent (oxblood), not
// k-crimson. A7-fix2 flagged this as a real DESIGN.md §1.5 violation —
// `.big-value` is oxblood in every scene, and CAP.beats[0] names exactly
// ONE series (`data-key="crimson"`), so the one-accent rule applied and
// k-crimson (a SECOND red, licensed only where a caption names >=2
// series) was the wrong colour, not a caption-bound constraint. Fixed at
// the source per the critique's own prescription: recolour the path AND
// retag `captions.json`'s span to `data-key="oxblood"` (base.css) together,
// so the swatch-to-word contract (PRODUCT.md, "no information conveyed by
// colour alone") stays intact rather than desyncing.
function paint(label, hex, token) {
  const s = seriesFromSpec(RAW, label);
  s.color = { hex, token };
  return s;
}
const EMBI = paint('EMBI', 'var(--oxblood)', 'oxblood');
const PARALLEL = paint('Parallel gap', 'var(--k-gray)', 'k-gray');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayLabel(d) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
function fmtBp(v) {
  return `${Math.round(v)} bp`;
}
function fmtPct(v) {
  return `${v.toFixed(1)} %`;
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

// S2-2-fix-b P1-2, lever 1 (same helper as 01-three-regimes.js's/
// 02-confidence.js's own, duplicated rather than shared — scene-local):
// the last DEFINED value of a series, what its own end label will render.
function lastDefinedValue(series) {
  for (let i = series.y.length - 1; i >= 0; i--) {
    if (Number.isFinite(series.y[i])) return series.y[i];
  }
  return null;
}

// Extra margin (beyond the measured minimum) reserved past
// `measureEndLabelGutter`'s own result. This SPEC's dates are DAILY near
// the end (`RAW.labels`'s last ~10 entries are business days a few px
// apart even at 1440px), unlike 01-three-regimes.js's monthly cadence —
// `lineDraw`'s own flip check (`FLIP_THRESHOLD_PX`, 60) compares against
// the stage's TRUE (unshrunk) safe-right edge, not this scene's own
// gutter-reduced range, so a gutter that only just clears the FINAL point
// still leaves the SECOND- and THIRD-to-last points within that 60px true-
// edge zone for several consecutive scrub steps — measured: this produced
// `label-continuity`/`label-anchor-flip` churn on "EMBI" (t=0.85-0.95) at
// every width, the label's own text-anchor flipping back and forth as
// those closely-spaced near-end points crossed the true-edge threshold one
// by one. Reserving extra width pushes EVERY near-end point (not just the
// last) outside that zone, not only the final settled one.
const EDGE_STABILITY_MARGIN_PX = 80;

// §3.1: scales recompute inside `draw` from `stage.safe` every call. Two
// independent y-scales sharing one x — `lineDraw` takes its `{x,y}` pair
// per call, so EMBI (bp) and Parallel gap (%) each get their own domain
// mapped to the same safe rect (a dual-axis read without a second drawn
// axis — §1.5 allows only endpoint/regime ticks, no axis titles, so each
// line's own direct end-label carries its unit instead).
function buildScales(stage, ctx) {
  const [yLo, yHi] = extent([EMBI]);
  const [y2Lo, y2Hi] = extent([PARALLEL]);
  const gutter =
    measureEndLabelGutter(stage, [
      { label: EMBI.label, value: lastDefinedValue(EMBI), fmt: fmtBp, showName: false },
      { label: PARALLEL.label, value: lastDefinedValue(PARALLEL), fmt: fmtPct, showName: false }
    ]) + EDGE_STABILITY_MARGIN_PX;
  const x = ctx.d3.scale.scaleTime().domain(ctx.d3.array.extent(EMBI.x.values)).range([stage.safe.x, stage.safe.x + stage.safe.width - gutter]);
  const y = ctx.d3.scale
    .scaleLinear()
    .domain([Math.min(0, yLo), yHi])
    .nice()
    .range([stage.safe.y + stage.safe.height, stage.safe.y]);
  const y2 = ctx.d3.scale
    .scaleLinear()
    .domain([Math.min(0, y2Lo), Math.max(0, y2Hi)])
    .nice()
    .range([stage.safe.y + stage.safe.height, stage.safe.y]);
  return { x, y, y2 };
}

// §3.1 idempotency (same reasoning as 01-three-regimes.js's own `drawAxis`):
// rebuild from a fresh `<g>` every draw call.
function drawAxis(stage, x) {
  stage.select('g.axis').remove();
  const domain = x.domain();
  const axisG = stage.append('g').attr('class', 'axis').attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(axisG, x, x, 1, { ticks: [domain[0], domain[1]], format: dayLabel });
}

// A7-fix P1-3: EMBI and Parallel gap share one rect on two independent
// domains with no drawn second axis and no series name anywhere on stage
// (only the bare end-of-line VALUE, e.g. "648 bp" — never which series it
// belongs to, or that it isn't on the same scale as the other line). This
// is the "distinct axis attribution" the grammar substitutes for a second
// drawn axis: a direct, coloured, unit-bearing name at the START of each
// line — read together with its own end label, a series is fully
// identified without a legend.
//
// Deliberately NOT given a `data-label` attribute (unlike lineDraw's own
// end label): `avoidPathCollisions`' `excludeSelfSamples` skips a label's
// own series' path samples so a GROWING END label (sitting at the tip of
// its own still-drawing line) doesn't fight its own recent path history —
// correct there, but wrong here. A series name sits at the START of the
// line, a point the path passes through (or right past) on EVERY frame,
// beat after beat — measured: sharing `data-label` with its own path made
// `avoidPathCollisions` never move it off that path (`path-text` hits on
// "EMBI (bp)"/"Parallel gap (%)" at every width). Leaving it unset means
// the pass below treats the series' own path as a real obstacle for its
// name, same as any other series' path would be.
//
// Parallel gap's own name only appears once `parallelReveal > 0` (v1 never
// drew it before its own beat) — `.join()`'s own exit removes it again
// when that flips back to false.
function drawSeriesNames(stage, x, y, y2, parallelReveal) {
  const specs = [
    { series: EMBI, name: 'EMBI (bp)', scale: y, show: true },
    { series: PARALLEL, name: 'Parallel gap (%)', scale: y2, show: parallelReveal > 0 }
  ];
  const entries = specs
    .filter((s) => s.show)
    .map(({ series, name, scale }) => {
      const definedIdx = series.y.findIndex((v) => Number.isFinite(v));
      if (definedIdx < 0) return null;
      return {
        key: series.label,
        name,
        x: x(series.x.values[definedIdx]),
        y: scale(series.y[definedIdx]) - 8,
        fill: (series.color && series.color.hex) || series.color
      };
    })
    .filter(Boolean);
  stage
    .selectAll('text.series-name')
    .data(entries, (d) => d.key)
    .join('text')
    .attr('class', 'label series-name')
    .attr('fill', (d) => d.fill)
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y)
    .text((d) => d.name);
}

// A7-fix P1-3: Parallel gap's own domain straddles zero (`Math.min(0,
// y2Lo)`) — with no drawn axis, "zero" has no reference mark of its own
// (EMBI's domain always starts at/near 0 already, so it didn't need one).
// Opacity tracks `parallelReveal` — meaningless before that series exists.
function drawGapZeroRef(stage, safe, y2, opacity) {
  stage
    .selectAll('line.gap-zero')
    .data([null])
    .join('line')
    .attr('class', 'leader gap-zero')
    .attr('x1', safe.x)
    .attr('x2', safe.x + safe.width)
    .attr('y1', y2(0))
    .attr('y2', y2(0))
    .attr('stroke-dasharray', '3 3')
    .attr('opacity', opacity);
  stage
    .selectAll('text.gap-zero-label')
    .data([null])
    .join('text')
    .attr('class', 'annot gap-zero-label')
    .attr('x', safe.x)
    .attr('y', y2(0) - 4)
    .attr('opacity', opacity)
    .text('0 %');
}

// As-built rule 1: a candidate-position collision cascade must compare
// real, on-screen rects (`getBoundingClientRect()`), never `getBBox()` —
// `getBBox()` excludes a rotated flag's OWN `transform` (SVG spec), which
// would report the pre-rotation (un-rotated) run. Ported verbatim from
// 02-confidence.js's own `realLocalBox`/`FLAG_MARGIN`/`boxesIntersect`/
// `FLAG_ROW_STEP` (no primitive exports this — each scene's own copy, same
// reason 03-treasury.js's/01-three-regimes.js's own local copies exist).
const FLAG_MARGIN = 1;
function boxesIntersect(a, b) {
  return a.x < b.x + b.width + FLAG_MARGIN && a.x + a.width + FLAG_MARGIN > b.x && a.y < b.y + b.height + FLAG_MARGIN && a.y + a.height + FLAG_MARGIN > b.y;
}
const FLAG_ROW_STEP = 10;

function realLocalBox(node, svgRect) {
  const r = node.getBoundingClientRect();
  return { x: r.x - svgRect.x, y: r.y - svgRect.y, width: r.width, height: r.height };
}

// S2-2-fix-c addendum, cause 2 (S2-6a's own "blocked, honest status"):
// ported from 02-confidence.js's own `localLineObstacles`, generalised for
// TWO independently-scaled series (EMBI on `y`, Parallel gap on `y2` —
// unlike panel A's shared single y-scale) — the window is derived from
// PIXELS via `x.invert`, not a fixed day-count, so it scales with whatever
// x-scale density the current viewport actually has; the obstacle's
// vertical extent is the real min/max rendered y of each series across
// every sample in that window (not one sample). `drawVlines`'s own
// candidate cascade never knew a data LINE (not just other text) could
// occupy the same vertical strip as a rotated flag — 02-confidence.js's
// own `drawFlags` already feeds this in, `04-ballot-box.js`'s port omitted
// it (diagnosed, not fixed, prior round).
function localLineObstacles(x, seriesScales, date, halfWidthPx = 15) {
  const cx = x(date);
  const dateLo = x.invert(cx - halfWidthPx);
  const dateHi = x.invert(cx + halfWidthPx);
  const boxes = [];
  for (const { series, scale } of seriesScales) {
    let lo = Infinity;
    let hi = -Infinity;
    const dates = series.x.values;
    for (let i = 0; i < dates.length; i += 1) {
      if (dates[i] < dateLo || dates[i] > dateHi) continue;
      const v = series.y[i];
      if (v == null || !Number.isFinite(v)) continue;
      const py = scale(v);
      if (py < lo) lo = py;
      if (py > hi) hi = py;
    }
    if (!Number.isFinite(lo)) continue;
    boxes.push({ x: cx - halfWidthPx, y: lo - 7, width: halfWidthPx * 2, height: hi - lo + 14 });
  }
  return boxes;
}

// Typographic event flags (§1.5: "never boxed") straight off fig10's own
// SPEC `vlines` — "BA election", "US swap", "Midterms". §3.1 idempotency:
// keyed `.join()` on the flag's own text (same pattern
// 02-confidence.js's own `drawFlags` uses for its own `g.flag`), rebuilt
// every `draw` call rather than appended blindly. `swapWeight` (0..1, a
// tweenable number — §3.1's "categorical differences are numbers the
// follower can tween", same device 01-three-regimes.js's own
// `emphasisColor` uses) replaces v1's one-shot `font-weight` set in
// `swapBeat`'s own `enter()`.
//
// v1 drew these flags flat (fixed `cx+4, safe.y+12`, no collision
// handling) — never checked against a checker, so never caught. Ported to
// this scene FOR THE FIRST TIME here: a three-candidate cascade
// (top-anchored / bottom-anchored, each rotated -90°, cascading right in
// `FLAG_ROW_STEP` steps) — the same device 02-confidence.js's own
// `drawFlags` already uses (measured: three flags close enough in date at
// 390px to overlap flat, `text-text` hits). `extraObstacles` (the OTHER
// labels this scene draws — end labels, series names, the midterm
// callout) is the caller's own now-settled boxes, same call-order
// convention 02-confidence.js's `drawFlags` documents ("flags placed
// LAST, after the lines + their (now-settled) end labels exist").
function drawVlines(stage, x, y, y2, ctx, swapWeight, extraObstacles = []) {
  const safe = stage.safe;
  const svgRect = stage.node().ownerSVGElement.getBoundingClientRect();
  const vlines = vlinesFromSpec(ctx.specs[SPEC_ID]);
  const g = stage.selectAll('g.vlines').data([null]).join('g').attr('class', 'vlines');
  const flagG = g
    .selectAll('g.flag')
    .data(vlines, (d) => d.text)
    .join((enter) => {
      const gg = enter.append('g').attr('class', 'flag');
      gg.append('line').attr('class', 'mark leader');
      gg.append('text').attr('class', 'mark annot');
      return gg;
    });
  flagG
    .select('line.leader')
    .attr('x1', (d) => x(d.x))
    .attr('x2', (d) => x(d.x))
    .attr('y1', safe.y)
    .attr('y2', safe.y + safe.height);

  const flagged = [];
  flagG.each(function each(d) {
    flagged.push({ d, node: this });
  });
  flagged.sort((a, b) => a.d.x - b.d.x);

  const placed = [];
  flagged.forEach(({ d, node }) => {
    const textNode = node.querySelector('text.annot');
    const cx = x(d.x);
    const bottomCandidate = (dx) => {
      const px = cx + 4 + dx;
      const py = safe.y + safe.height - 4;
      return { x: px, y: py, transform: `rotate(-90 ${px} ${py})`, anchor: 'start' };
    };
    const topCandidate = (dx) => {
      const px = cx + 4 + dx;
      const py = safe.y + 12;
      return { x: px, y: py, transform: `rotate(-90 ${px} ${py})`, anchor: 'end' };
    };
    // S2-2-fix-c addendum: one more stagger tier (dx=3*step) — measured,
    // 390: "BA election" sits close enough to the plot's own left edge
    // that its first 6 candidates (0/1/2 stagger steps x top/bottom) never
    // clear "Parallel gap (%)" (a series-name label, ~90px wide, spanning
    // most of that same left region) — the same class of fix just applied
    // to 02-confidence.js's own `drawFlags` (this scene's own sibling
    // device), for the same reason: not enough candidates existed at this
    // width for a real obstacle this wide.
    const candidates = [
      bottomCandidate(0),
      topCandidate(0),
      bottomCandidate(FLAG_ROW_STEP),
      topCandidate(FLAG_ROW_STEP),
      bottomCandidate(FLAG_ROW_STEP * 2),
      topCandidate(FLAG_ROW_STEP * 2),
      bottomCandidate(FLAG_ROW_STEP * 3),
      topCandidate(FLAG_ROW_STEP * 3)
    ];
    const obstacles = [
      ...placed,
      ...localLineObstacles(
        x,
        [
          { series: EMBI, scale: y },
          { series: PARALLEL, scale: y2 }
        ],
        d.x
      ),
      ...extraObstacles
    ];
    textNode.textContent = d.text;
    if (d.text === 'US swap') textNode.setAttribute('font-weight', String(Math.round(400 + swapWeight * 300)));
    else textNode.removeAttribute('font-weight');
    let chosenBox = null;
    for (const cand of candidates) {
      textNode.setAttribute('x', cand.x);
      textNode.setAttribute('y', cand.y);
      textNode.setAttribute('transform', cand.transform);
      textNode.setAttribute('text-anchor', cand.anchor);
      const box = realLocalBox(textNode, svgRect);
      if (!obstacles.some((p) => boxesIntersect(box, p))) {
        chosenBox = box;
        break;
      }
      chosenBox = box; // best-effort: keep the last candidate tried even if it still collides
    }
    placed.push(chosenBox);
  });
}

// b3's callout (CAP.beats[2]): "spread compresses to 648 bp" pinned near
// the Midterms flag (or the series' own last point, if that flag isn't in
// this SPEC). No transform/rotate on this node, so `getBBox()` (local
// space, matching `safeRight`'s own local-space units) is the right tool
// here — unlike the rotated flag cascades rule 1 names, this is the same
// fit-before-draw local-space check 01-three-regimes.js's own
// `drawBandLabels`/`drawZone` use. `display` cleared before re-measuring
// (idempotency: a prior frame may have left it `none`).
function drawMidtermCallout(stage, safe, x, y, ctx, opacity) {
  const vlines = vlinesFromSpec(ctx.specs[SPEC_ID]);
  const midterms = vlines.find((v) => v.text === 'Midterms');
  const definedIdx = [];
  EMBI.y.forEach((v, i) => {
    if (Number.isFinite(v)) definedIdx.push(i);
  });
  const lastIdx = definedIdx[definedIdx.length - 1];
  const calloutX = midterms ? x(midterms.x) : x(EMBI.x.values[lastIdx]);
  const safeRight = safe.x + safe.width;
  const sel = stage.selectAll('text.midterm-callout').data([null]).join('text').attr('class', 'annot midterm-callout').attr('data-label', EMBI.label).attr('display', null);
  sel
    .attr('text-anchor', 'start')
    .attr('x', calloutX)
    .attr('y', y(EMBI.y[lastIdx]) - 10)
    .text(`spread compresses to ${fmtBp(EMBI.y[lastIdx])}`);
  const node = sel.node();
  if (node) {
    const box = node.getBBox();
    if (box.x + box.width > safeRight) {
      sel.attr('text-anchor', 'end').attr('x', safeRight);
    }
  }
  // S2-2-fix-b P1-1 convention: a resolved-opacity-0 label is
  // `display:none` so it isn't a phantom obstacle for the collision pass
  // below, while a positive opacity leaves it a real, correctly-placed one.
  sel.attr('opacity', opacity).attr('display', opacity > 0 ? null : 'none');
}

// `reveal` drives lineDraw's own stroke-dash reveal fraction. No orphaned
// label: the end label lineDraw always creates once at least one point is
// defined (even at reveal 0, at the FIRST defined point) is hidden until
// the line itself has actually started drawing — same
// display:none-not-opacity:0 exemption 01-three-regimes.js's/
// 02-confidence.js's own `drawLine` wrappers use.
function drawLine(stage, series, scales, reveal, fmt, opts = {}) {
  const r = lineDraw(stage, series, scales, reveal, { fmt, ...opts });
  r.path.classed('mark', true);
  if (r.label) {
    r.label.classed('label', true).attr('opacity', reveal > 0 ? 1 : 0).attr('display', reveal > 0 ? null : 'none');
  }
  return r;
}

// §6.1 frame states — flat numeric, identical keys every beat (§3.1).
const F0_FROM = { embiReveal: 0, parallelReveal: 0, swapWeight: 0, calloutOpacity: 0 };

export default {
  id: '04-ballot-box',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  series: [
    { label: EMBI.label, x: EMBI.x, y: EMBI.y },
    { label: PARALLEL.label, x: PARALLEL.x, y: PARALLEL.y }
  ],
  beats: [
    // F0 (scrub, `from` required at i=0 — §3.1): EMBI draws left to right
    // through the 7 Sep BA election loss.
    {
      motion: 'scrub',
      caption: CAP.beats[0],
      from: F0_FROM,
      state: { ...F0_FROM, embiReveal: 1 }
    },
    // F1 (eased): EMBI settles, the Parallel gap draws in alongside it, and
    // the US-swap flag is the event the caption names (bold).
    {
      motion: 'eased',
      caption: CAP.beats[1],
      state: { embiReveal: 1, parallelReveal: 1, swapWeight: 1, calloutOpacity: 0 }
    },
    // F2 (eased): both series settled; a callout on the Midterms flag fades
    // in with the post-midterm compressed EMBI reading.
    {
      motion: 'eased',
      caption: CAP.beats[2],
      state: { embiReveal: 1, parallelReveal: 1, swapWeight: 1, calloutOpacity: 1 }
    }
  ],
  draw(stage, state, ctx) {
    const safe = stage.safe;
    const { x, y, y2 } = buildScales(stage, ctx);
    drawAxis(stage, x);
    drawGapZeroRef(stage, safe, y2, state.parallelReveal);

    drawLine(stage, EMBI, { x, y }, state.embiReveal, fmtBp, { strokeWidth: 1.5 });
    // A7-fix P1-3 / A7-fix2 P2: Parallel gap is the unnamed k-gray series —
    // thinner stroke + reduced opacity so it doesn't out-ink the named
    // EMBI accent line (measured: 0.55, see v1's own comment history).
    drawLine(stage, PARALLEL, { x, y: y2 }, state.parallelReveal, fmtPct, { strokeWidth: 1, opacity: 0.55 });

    drawSeriesNames(stage, x, y, y2, state.parallelReveal);
    drawMidtermCallout(stage, safe, x, y, ctx, state.calloutOpacity);

    // As-built rule 3: annotation/collision passes run LAST, after the
    // lines and the (now-settled) end labels/series names exist. As-built
    // rule 2: replaces v1's bespoke per-frame "series name drops to the
    // axis strip" bbox closure — every text label this scene draws (end
    // labels, series names, the midterm callout) goes through ONE shared
    // pass; `avoidPathCollisions` already treats every node its own
    // `labelSelector` matches as a mutual obstacle (its own `placed`
    // accumulator), so label-vs-label and label-vs-mark collisions are
    // both resolved here without a second, bespoke solver.
    //
    // S2-2-fix-c addendum, cause 1 (S2-6a's own "blocked, honest status"):
    // during F0's own scrub (`state.parallelReveal === 0` — the ONLY beat
    // this is ever true for; F1/F2 both set it to 1 with no `from`, so
    // there is nothing to distinguish a mid-tween sample from a settled
    // one except this scrub beat's own state, this file's own header
    // note), EMBI's growing end label is excluded from this pass — fix-b's
    // own pattern ("a scrub-beat end label tracks its anchor exactly and
    // gets no declutter/avoid during the scrub"), applied here: EMBI's end
    // label already self-excludes against its OWN path
    // (`avoidPathCollisions`' `excludeSelfSamples`), and nothing else this
    // scene draws is even visible yet at F0 (Parallel gap/its series name/
    // the midterm callout all carry `display:none` until their own reveal
    // state turns on) — so this pass had NOTHING real to dodge for EMBI's
    // label during the scrub, only its own collision-avoidance jitter
    // (measured: `rdy` 12-18px, S2-6a's own report). Series names/the
    // callout stay in the pass at every beat — not implicated, and (unlike
    // EMBI's end label) they carry no anchor of their own to track
    // faithfully instead.
    const embiScrub = state.parallelReveal === 0;
    avoidPathCollisions(stage, {
      labelSelector: embiScrub ? 'text.series-name, text.midterm-callout' : '.line-draw-label, text.series-name, text.midterm-callout',
      clampTop: safe.y,
      clampBottom: safe.y + safe.height - 14,
      safeLeft: safe.x
    });
    // S2-2 item 2: hairline back to the true anchor for any end label the
    // pass above moved — series names/the callout carry no
    // `data-anchor-x/y` (lineDraw's own end labels only), so `labelLeaders`
    // naturally skips them (its own `collectLeaderSpecs` requires that
    // attribute pair).
    labelLeaders(stage, '.line-draw-label');

    // Flags placed LAST, after the lines + their now-settled end
    // labels/series names/callout exist — see `drawVlines`' own
    // `extraObstacles` comment. Real boxes (`getBBox()` — none of these
    // nodes carry their own `transform`, so it's a safe, local-space read,
    // same convention 02-confidence.js's `gaLabelBoxes` uses), hidden ones
    // excluded so an invisible label isn't a phantom obstacle.
    const otherLabelBoxes = stage
      .selectAll('.line-draw-label, text.series-name, text.midterm-callout')
      .nodes()
      .filter((n) => n.getAttribute('display') !== 'none')
      .map((n) => n.getBBox());
    drawVlines(stage, x, y, y2, ctx, state.swapWeight, otherLabelBoxes);
  }
};
