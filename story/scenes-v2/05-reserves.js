// story/scenes-v2/05-reserves.js — S2-6a port of `story/scenes/
// 05-reserves.js` (CANVAS-design.md §2 row 5, "What holds the peso",
// fig12_nir) to engine v2 (METHOD-RESET.md §3.1). `RAW`, `paint()`,
// `SPEC_ID` and the caption lookup below are copied verbatim from that
// file (data, not design — `assertScenesMatchSpec` re-extracts by dataset
// label). Everything else — the state schema, `draw()`, and all
// axis/annotation placement — is new, written fresh against the engine2
// contract: flat numeric `state` per beat, no full-stage wipe, and every
// mark/label join kept idempotent (brief: "ensureHatchDefs ... Make it
// idempotent by id — `draw` runs every frame").
import { barsBuild, axisMorph } from '../../../../scrolly-kit/src/canvas/primitives/index.js';
import { seriesFromSpec } from '../../../../scrolly-kit/src/canvas/data/seriesFromSpec.js';
import captions from '../captions.json' with { type: 'json' };

const SPEC_ID = 'fig12_nir';
const CAP = captions.scenes.find((s) => s.id === '05-reserves');

const RAW = {"labels":["2024","2025","2026"],"datasets":[{"label":"Gross","key":"blue","data":[16.6,27.6,36.1]},{"label":"NIR","key":"crimson","data":[-2.4,-11.8,-1.8]}]};

// Colour authority is captions.json's own `.k data-key` mapping — matches
// each dataset's own SPEC `key` here (Gross: blue, NIR: crimson).
function paint(label, hex, token) {
  const s = seriesFromSpec(RAW, label);
  s.color = { hex, token };
  return s;
}
const GROSS = paint('Gross', 'var(--k-blue)', 'k-blue');
const NIR = paint('NIR', 'var(--k-crimson)', 'k-crimson');

function fmtUsd(v) {
  return `${v >= 0 ? '' : '−'}USD ${Math.abs(v).toFixed(1)} bn`;
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
const [LO, HI] = extent([GROSS, NIR]);

// Fixed headroom reserved at the top of the plot for the "IMF projection"
// annotation (F2), which sits at a fixed `safe.y + 12` regardless of
// viewport — measured: without this, the tallest bar's own on-bar value
// label (drawn just above the bar) can end up close enough to that fixed
// annotation to collide at narrow viewports (390px: "USD 36.1 bn" vs "IMF
// projection", checker rule=text-text). Reserving a fixed px band (rather
// than a percentage) keeps the gap constant across every width, the same
// "measured, not guessed" standard `measureEndLabelGutter` uses elsewhere.
const TOP_GUTTER_PX = 28;

// §3.1: scales recompute inside `draw` from `stage.safe` every call, so a
// resize is just a redraw. No end-label gutter needed on x (unlike
// 01-three-regimes.js/02-confidence.js) — bar labels sit centred on their
// own bar, not at a line's terminus near the safe area's right edge.
function buildScales(stage, ctx) {
  const x = ctx.d3.scale.scaleBand().domain(GROSS.x.values).range([stage.safe.x, stage.safe.x + stage.safe.width]).padding(0.35);
  const y = ctx.d3.scale
    .scaleLinear()
    .domain([Math.min(0, LO), Math.max(0, HI)])
    .nice()
    .range([stage.safe.y + stage.safe.height, stage.safe.y + TOP_GUTTER_PX]);
  return { x, y };
}

// §3.1 idempotency (same reasoning as 01-three-regimes.js's own `drawAxis`):
// rebuild from a fresh `<g>` every draw call rather than re-`.call()`ing a
// persisted one.
function drawAxis(stage, x) {
  stage.select('g.axis').remove();
  const axisG = stage.append('g').attr('class', 'axis').attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(axisG, x, x, 1, { ticks: x.domain() });
}

function drawZeroLine(stage, x, y) {
  stage
    .selectAll('line.zero')
    .data([null])
    .join('line')
    .attr('class', 'axis zero')
    .attr('x1', stage.safe.x)
    .attr('x2', stage.safe.x + stage.safe.width)
    .attr('y1', y(0))
    .attr('y2', y(0));
}

// Diagonal hatch pattern for the 2026 (projected) bars — the only
// non-typographic, non-colour way this grammar has to mark "projection" on
// a bar without a legend or a boxed callout. Idempotent by id (brief) — a
// second `draw` call for the same `id` is a no-op, `defs` is joined not
// appended blindly.
function ensureHatchDefs(stage, id, strokeVar) {
  const defs = stage.selectAll('defs').data([null]).join('defs');
  defs
    .selectAll(`pattern#${id}`)
    .data([null])
    .join((enter) => {
      const pattern = enter
        .append('pattern')
        .attr('id', id)
        .attr('width', 6)
        .attr('height', 6)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)');
      pattern.append('rect').attr('width', 6).attr('height', 6).attr('fill', 'var(--paper)');
      pattern.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', strokeVar).attr('stroke-width', 2);
      return pattern;
    });
}

// Direct on-bar value labels (§1.5: "direct end-of-line / on-bar labels",
// the grammar's replacement for a legend) — one `<text>` per bar, placed
// just outside the bar's own extreme edge (above for a positive bar, below
// for a negative one). `t` (this series' own reveal fraction) both gates
// the join (no bar, no label — the fit-before-draw grammar; an empty data
// array at t<=0 lets `.join()`'s own exit remove any stale node) and
// drives the label's own y so it tracks the bar's CURRENT top as it grows.
function labelBars(stage, series, x, y, cls, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  stage
    .selectAll(`text.${cls}`)
    .data(clampedT > 0 ? series.x.values.map((cat, i) => ({ cat, v: series.y[i], cur: series.y[i] * clampedT })) : [], (d) => d.cat)
    .join('text')
    .attr('class', `label ${cls}`)
    .attr('x', (d) => x(d.cat) + x.bandwidth() / 2)
    .attr('y', (d) => (d.cur >= 0 ? y(d.cur) - 6 : y(d.cur) + 14))
    .attr('text-anchor', 'middle')
    .text((d) => fmtUsd(d.v));
}

// As-built rule 1 (brief): a candidate-position collision cascade must
// compare real, on-screen rects (`getBoundingClientRect()`), never
// `getBBox()` — applied here too, not only in 03-treasury.js's flag
// cascade, per the brief's "expect this in every scene you port" (item 2).
function boxesIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// A candidate-position cascade against the two on-bar labels' own real
// (current-frame) boxes — never a guessed offset. Runs every frame (§3.1);
// idempotent, since it always recomputes from the currently-drawn labels.
function annotateEncumbrance(stage, safe, x, y, encIdx, opacity) {
  const cx = x('2025') + x.bandwidth() / 2;
  const midY = (y(GROSS.y[encIdx]) + y(NIR.y[encIdx])) / 2;
  const existing = stage
    .selectAll('text.gross-label, text.nir-label')
    .nodes()
    .map((n) => n.getBoundingClientRect());
  const candidates = [
    { x: cx + 10, y: midY, anchor: 'start' },
    { x: cx - 10, y: midY, anchor: 'end' },
    { x: Math.min(cx + 10, safe.x + safe.width - 4), y: midY - 18, anchor: 'start' },
    { x: Math.min(cx + 10, safe.x + safe.width - 4), y: midY + 18, anchor: 'start' },
    { x: Math.max(cx - 10, safe.x + 4), y: midY - 18, anchor: 'end' },
    { x: Math.max(cx - 10, safe.x + 4), y: midY + 18, anchor: 'end' }
  ];
  const label = stage.selectAll('text.encumbrance').data([null]).join('text').attr('class', 'annot encumbrance').text('≈ USD 39 bn encumbered');
  const node = label.node();
  let chosen = candidates[0];
  for (const cand of candidates) {
    label.attr('x', cand.x).attr('y', cand.y).attr('text-anchor', cand.anchor);
    const box = node.getBoundingClientRect();
    if (!existing.some((o) => boxesIntersect(box, o))) {
      chosen = cand;
      break;
    }
  }
  label.attr('x', chosen.x).attr('y', chosen.y).attr('text-anchor', chosen.anchor).attr('opacity', opacity);
  stage
    .selectAll('line.leader')
    .data([null])
    .join('line')
    .attr('class', 'mark leader')
    .attr('x1', cx)
    .attr('x2', cx)
    .attr('y1', y(GROSS.y[encIdx]))
    .attr('y2', y(NIR.y[encIdx]))
    .attr('opacity', opacity);
}

// §6.1 frame states — flat numeric, identical keys every beat (§3.1).
const F0_FROM = { grossReveal: 0, nirReveal: 0, projectionOpacity: 0 };

export default {
  id: '05-reserves',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  series: [
    { label: GROSS.label, x: GROSS.x, y: GROSS.y },
    { label: NIR.label, x: NIR.x, y: NIR.y }
  ],
  beats: [
    // F0 (eased, `from` seeds a real grow-in on scene entry — same pattern
    // as 02-confidence.js's own F0): Gross bars grow in on their own.
    {
      motion: 'eased',
      caption: CAP.beats[0],
      from: F0_FROM,
      state: { ...F0_FROM, grossReveal: 1 }
    },
    // F1 (eased): Gross stays settled, NIR peels out below zero, the
    // encumbrance bracket + label appear.
    {
      motion: 'eased',
      caption: CAP.beats[1],
      state: { grossReveal: 1, nirReveal: 1, projectionOpacity: 0 }
    },
    // F2 (eased): both series settled; the 2026 bars (a projection, not an
    // outturn) get the hatch treatment + "IMF projection" label.
    {
      motion: 'eased',
      caption: CAP.beats[2],
      state: { grossReveal: 1, nirReveal: 1, projectionOpacity: 1 }
    }
  ],
  draw(stage, state, ctx) {
    const safe = stage.safe;
    const { x, y } = buildScales(stage, ctx);
    drawAxis(stage, x);
    drawZeroLine(stage, x, y);
    ensureHatchDefs(stage, 'hatch-gross-2026', 'var(--k-blue)');
    ensureHatchDefs(stage, 'hatch-nir-2026', 'var(--k-crimson)');

    const projecting = state.projectionOpacity >= 1;
    const grossRects = barsBuild(stage, [GROSS], { x, y }, state.grossReveal, { stack: false }).classed('mark', true);
    grossRects.attr('fill', (d) => (projecting && d.cat === '2026' ? 'url(#hatch-gross-2026)' : (d.color && d.color.hex) || d.color));
    labelBars(stage, GROSS, x, y, 'gross-label', state.grossReveal);

    const nirRects = barsBuild(stage, [NIR], { x, y }, state.nirReveal, { stack: false }).classed('mark', true);
    nirRects.attr('fill', (d) => (projecting && d.cat === '2026' ? 'url(#hatch-nir-2026)' : (d.color && d.color.hex) || d.color));
    labelBars(stage, NIR, x, y, 'nir-label', state.nirReveal);

    const encIdx = GROSS.x.values.indexOf('2025');
    annotateEncumbrance(stage, safe, x, y, encIdx, state.nirReveal);

    stage
      .selectAll('text.projection-label')
      .data([null])
      .join('text')
      .attr('class', 'annot projection-label')
      .attr('x', x('2026') + x.bandwidth() / 2)
      .attr('y', safe.y + 12)
      .attr('text-anchor', 'middle')
      .attr('opacity', state.projectionOpacity)
      .text('IMF projection');
  }
};
