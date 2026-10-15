// story/scenes/05-reserves.js — CANVAS-design.md §2 row 5 "What holds the
// peso" (A5b). Draws fig12_nir (Gross / NIR, USD bn, end-year) only — "No
// fig01 overlay, no fig07 mixing" — using only K18 primitives + the SPEC
// data adapter. `RAW` is a labels+dataset slice of the real widget's own
// SPEC (output/widgets/fig12_nir.html), byte-identical to what the
// build's `assertScenesMatchSpec` re-extracts by dataset label.
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

// Direct on-bar value labels (§1.5: "direct end-of-line / on-bar labels",
// the grammar's replacement for a legend) — one `<text>` per bar, placed
// just outside the bar's own extreme edge (above for a positive bar,
// below for a negative one).
//
// A8-register-e item 4 (closes the residual `series-label-count`, scene
// 5/6 beat 0, "expected 3, actual 0"): every call site used to gate this
// behind `if (t >= 1)` in the beat's own `update` — the label only ever
// existed in the DOM once the grow tween had FULLY settled, so any sample
// taken mid-tween (including the harness's own settle window, which does
// not wait for `t` to hit exact IEEE `1`) saw zero labels. Called
// unconditionally now (still guarded by `t > 0` — no bar, no label, the
// grammar's own fit-before-draw rule), with `t` threaded through so the
// label's own Y tracks the bar's CURRENT top as it grows, not just its
// settled one — the text itself stays the bar's real, final value
// (`fmtUsd(d.v)`, never a tweened number) since the value being counted UP
// visually is a distinct effect (`numberCount`) this primitive doesn't
// need to reproduce; only its VERTICAL POSITION needs to ride the tween.
function labelBars(stage, series, x, y, cls, t = 1) {
  const clampedT = Math.max(0, Math.min(1, t));
  stage
    .selectAll(`text.${cls}`)
    .data(
      series.x.values.map((cat, i) => ({ cat, v: series.y[i], cur: series.y[i] * clampedT })),
      (d) => d.cat
    )
    .join('text')
    .attr('class', `label ${cls}`)
    .attr('x', (d) => x(d.cat) + x.bandwidth() / 2)
    .attr('y', (d) => (d.cur >= 0 ? y(d.cur) - 6 : y(d.cur) + 14))
    .attr('text-anchor', 'middle')
    .text((d) => fmtUsd(d.v));
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
  const [lo, hi] = extent([GROSS, NIR]);
  const x = ctx.d3.scale
    .scaleBand()
    .domain(GROSS.x.values)
    .range([stage.safe.x, stage.safe.x + stage.safe.width])
    .padding(0.35);
  const y = ctx.d3.scale
    .scaleLinear()
    .domain([Math.min(0, lo), Math.max(0, hi)])
    .nice()
    .range([stage.safe.y + stage.safe.height, stage.safe.y]);
  return { x, y };
}

function drawAxis(stage, x) {
  const g = stage
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(g, x, x, 1, { ticks: x.domain() });
}

function drawZeroLine(stage, x, y) {
  stage
    .append('line')
    .attr('class', 'axis')
    .attr('x1', stage.safe.x)
    .attr('x2', stage.safe.x + stage.safe.width)
    .attr('y1', y(0))
    .attr('y2', y(0));
}

// Diagonal hatch pattern for the 2026 (projected) bars — the only
// non-typographic, non-colour way this grammar has to mark "projection"
// on a bar without a legend or a boxed callout.
function ensureHatchDefs(stage, id, strokeVar) {
  let defs = stage.select('defs');
  if (defs.empty()) defs = stage.append('defs');
  if (!defs.select(`#${id}`).empty()) return;
  const pattern = defs
    .append('pattern')
    .attr('id', id)
    .attr('width', 6)
    .attr('height', 6)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('patternTransform', 'rotate(45)');
  pattern.append('rect').attr('width', 6).attr('height', 6).attr('fill', 'var(--paper)');
  pattern.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', strokeVar).attr('stroke-width', 2);
}

// b1 (eased, CAP.beats[0]): Gross bars grow in on their own.
function grossBeat() {
  let x;
  let y;
  return {
    motion: 'eased',
    caption: CAP.beats[0],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawZeroLine(stage, x, y);
    },
    update(stage, t) {
      const rects = barsBuild(stage, [GROSS], { x, y }, t, { stack: false });
      rects.classed('mark', true);
      if (t > 0) labelBars(stage, GROSS, x, y, 'gross-label', t);
    }
  };
}

// A8-register-h item 5 (critique §5): reproduced locally, same reason
// `03-treasury.js`/`01-three-regimes.js`'s own copies are — no primitive
// exports it (`src/canvas/primitives/index.js`).
function boxesIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// A8-register-h item 5 (critique §5): "≈ USD 39 bn encumbered" and the
// NIR-2025 on-bar label ("−11.8 bn") collided at x≈480-630, y≈520, the
// first also painted over the blue bar — the annotation was placed once,
// in `enter()`, at a fixed `cx+6` (the SAME x as the on-bar labels
// straight above/below it) before `labelBars` had even drawn NIR's own
// label for this beat. Moved to run from `update()` once NIR's own tween
// settles (`t >= 1`, the same "re-run once real geometry exists" idiom
// `03-treasury.js`'s `drawLefiFlags`/register-g use), laid out with a
// real-bbox candidate cascade against BOTH on-bar labels' own live
// `getBBox()` — not a guessed offset — the same "real, not estimated"
// obstacle standard those files' own comments name.
function annotateEncumbrance(stage, safe, x, y, encIdx) {
  const cx = x('2025') + x.bandwidth() / 2;
  const midY = (y(GROSS.y[encIdx]) + y(NIR.y[encIdx])) / 2;
  const existing = stage
    .selectAll('text.gross-label, text.nir-label')
    .nodes()
    .map((n) => n.getBBox());
  const candidates = [
    { x: cx + 10, y: midY, anchor: 'start' },
    { x: cx - 10, y: midY, anchor: 'end' },
    { x: Math.min(cx + 10, safe.x + safe.width - 4), y: midY - 18, anchor: 'start' },
    { x: Math.min(cx + 10, safe.x + safe.width - 4), y: midY + 18, anchor: 'start' },
    { x: Math.max(cx - 10, safe.x + 4), y: midY - 18, anchor: 'end' },
    { x: Math.max(cx - 10, safe.x + 4), y: midY + 18, anchor: 'end' }
  ];
  const label = stage.select('text.encumbrance');
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

// b2 (eased, CAP.beats[1]): Gross settles, NIR peels out below zero, and
// the gap between them (encumbrance) gets a typographic bracket + label.
function nirBeat() {
  let x;
  let y;
  let safe;
  let placed = false;
  return {
    motion: 'eased',
    caption: CAP.beats[1],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      placed = false;
      ({ x, y } = buildScales(stage, ctx));
      safe = stage.safe;
      drawAxis(stage, x);
      drawZeroLine(stage, x, y);
      barsBuild(stage, [GROSS], { x, y }, 1, { stack: false }).classed('mark', true);
      labelBars(stage, GROSS, x, y, 'gross-label');
      const encIdx = GROSS.x.values.indexOf('2025');
      const cx = x('2025') + x.bandwidth() / 2;
      stage
        .append('line')
        .attr('class', 'mark leader')
        .attr('x1', cx)
        .attr('x2', cx)
        .attr('y1', y(GROSS.y[encIdx]))
        .attr('y2', y(NIR.y[encIdx]))
        .attr('opacity', 0);
      // Placeholder position (pre-geometry) — `annotateEncumbrance`
      // (below) repositions it for real once NIR's own on-bar label
      // exists to test against.
      stage
        .append('text')
        .attr('class', 'annot encumbrance')
        .attr('x', cx + 10)
        .attr('y', (y(GROSS.y[encIdx]) + y(NIR.y[encIdx])) / 2)
        .attr('opacity', 0)
        .text('≈ USD 39 bn encumbered');
    },
    update(stage, t) {
      const rects = barsBuild(stage, [NIR], { x, y }, t, { stack: false });
      rects.classed('mark', true);
      if (t > 0) labelBars(stage, NIR, x, y, 'nir-label', t);
      stage.selectAll('line.leader, text.encumbrance').attr('opacity', t);
      if (t >= 1 && !placed) {
        const encIdx = GROSS.x.values.indexOf('2025');
        annotateEncumbrance(stage, safe, x, y, encIdx);
        placed = true;
      }
    }
  };
}

// b3 (eased, CAP.beats[2]): both series settled; the 2026 bars (a
// projection, not an outturn) get the hatch treatment + label.
function projectionBeat() {
  let x;
  let y;
  return {
    motion: 'eased',
    caption: CAP.beats[2],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawZeroLine(stage, x, y);
      ensureHatchDefs(stage, 'hatch-gross-2026', 'var(--k-blue)');
      ensureHatchDefs(stage, 'hatch-nir-2026', 'var(--k-crimson)');
      const grossRects = barsBuild(stage, [GROSS], { x, y }, 1, { stack: false }).classed('mark', true);
      grossRects.attr('fill', (d) => (d.cat === '2026' ? 'url(#hatch-gross-2026)' : d.color.hex));
      labelBars(stage, GROSS, x, y, 'gross-label');
      stage
        .append('text')
        .attr('class', 'annot projection-label')
        .attr('x', x('2026') + x.bandwidth() / 2)
        .attr('y', stage.safe.y + 12)
        .attr('text-anchor', 'middle')
        .attr('opacity', 0)
        .text('IMF projection');
    },
    update(stage, t) {
      const nirRects = barsBuild(stage, [NIR], { x, y }, t, { stack: false });
      nirRects.classed('mark', true);
      if (t >= 1) {
        nirRects.attr('fill', (d) => (d.cat === '2026' ? 'url(#hatch-nir-2026)' : d.color.hex));
      }
      if (t > 0) labelBars(stage, NIR, x, y, 'nir-label', t);
      stage.select('text.projection-label').attr('opacity', t);
    }
  };
}

export default {
  id: '05-reserves',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  data: (ctx) => ctx.specs[SPEC_ID],
  series: [
    { label: GROSS.label, x: GROSS.x, y: GROSS.y },
    { label: NIR.label, x: NIR.x, y: NIR.y }
  ],
  beats: [grossBeat(), nirBeat(), projectionBeat()]
};
