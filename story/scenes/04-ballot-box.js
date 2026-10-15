// story/scenes/04-ballot-box.js — CANVAS-design.md §2 row 4 "The ballot
// box" (A5b). Draws fig10_embi_crisis (EMBI / Parallel gap, daily, 3
// event vlines) using only K18 primitives (src/canvas/primitives) + the
// SPEC data adapter, per A5a's established conventions. `RAW` is a
// labels+dataset slice of the real widget's own SPEC (output/widgets/
// fig10_embi_crisis.html), byte-identical to what the build's
// `assertScenesMatchSpec` re-extracts by dataset label.
import { lineDraw, axisMorph } from '../../../../scrolly-kit/src/canvas/primitives/index.js';
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

// Two independent y-scales sharing one x — `lineDraw` takes its `{x,y}`
// pair per call, so EMBI (bp) and Parallel gap (%) each get their own
// domain mapped to the same safe rect (a dual-axis read without a second
// drawn axis — §1.5 allows only endpoint/regime ticks, no axis titles, so
// each line's own direct end-label carries its unit instead).
function buildScales(stage, ctx) {
  const [yLo, yHi] = extent([EMBI]);
  const [y2Lo, y2Hi] = extent([PARALLEL]);
  const x = ctx.d3.scale
    .scaleTime()
    .domain(ctx.d3.array.extent(EMBI.x.values))
    .range([stage.safe.x, stage.safe.x + stage.safe.width]);
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

function drawAxis(stage, x) {
  const domain = x.domain();
  const g = stage
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(g, x, x, 1, { ticks: [domain[0], domain[1]], format: dayLabel });
}

// A7-fix P1-3: EMBI and Parallel gap share one rect on two independent
// domains with no drawn second axis and no series name anywhere on stage
// (only the bare end-of-line VALUE, e.g. "648 bp" — never which series it
// belongs to, or that it isn't on the same scale as the other line). This
// is the "distinct axis attribution" the grammar substitutes for a second
// drawn axis: a direct, coloured, unit-bearing name at the START of each
// line — read together with its own end label, a series is fully
// identified without a legend.
function drawSeriesName(stage, x, y, series, name) {
  const definedIdx = series.y.findIndex((v) => Number.isFinite(v));
  if (definedIdx < 0) return null;
  return stage
    .append('text')
    .attr('class', 'label series-name')
    .attr('fill', (series.color && series.color.hex) || series.color)
    .attr('x', x(series.x.values[definedIdx]))
    .attr('y', y(series.y[definedIdx]) - 8)
    .text(name);
}

// A8-register-f item 10 (closes critique's own scene-4 residual, "'EMBI
// (bp)' axis-name label collides with a series label"): real 2D bbox
// overlap, same helper `02-confidence.js`'s own `drawVlines` already
// uses.
function boxesIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// A7-fix P1-3: Parallel gap's own domain straddles zero (`Math.min(0,
// y2Lo)`) — with no drawn axis, "zero" has no reference mark of its own
// (EMBI's domain always starts at/near 0 already, so it didn't need one).
function drawGapZeroRef(stage, safe, y2) {
  stage
    .append('line')
    .attr('class', 'leader')
    .attr('x1', safe.x)
    .attr('x2', safe.x + safe.width)
    .attr('y1', y2(0))
    .attr('y2', y2(0))
    .attr('stroke-dasharray', '3 3');
  stage.append('text').attr('class', 'annot').attr('x', safe.x).attr('y', y2(0) - 4).text('0 %');
}

// Typographic event flags (§1.5: "never boxed") straight off fig10's own
// SPEC `vlines` — "BA election", "US swap", "Midterms".
function drawVlines(stage, x, ctx) {
  const vlines = vlinesFromSpec(ctx.specs[SPEC_ID]);
  const g = stage.append('g').attr('class', 'vlines');
  vlines.forEach(({ x: date, text }) => {
    const cx = x(date);
    g.append('line')
      .attr('class', 'mark leader')
      .attr('x1', cx)
      .attr('x2', cx)
      .attr('y1', stage.safe.y)
      .attr('y2', stage.safe.y + stage.safe.height);
    g.append('text')
      .attr('class', 'mark annot')
      .attr('x', cx + 4)
      .attr('y', stage.safe.y + 12)
      .text(text);
  });
}

// b1 (scrub, CAP.beats[0]): EMBI draws left to right through the 7 Sep BA
// election loss.
function embiScrubBeat() {
  let x;
  let y;
  let nameSel;
  let naturalY;
  return {
    motion: 'scrub',
    caption: CAP.beats[0],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawVlines(stage, x, ctx);
      nameSel = drawSeriesName(stage, x, y, EMBI, 'EMBI (bp)');
      naturalY = nameSel ? Number(nameSel.attr('y')) : null;
    },
    update(stage, t) {
      const r = lineDraw(stage, EMBI, { x, y }, t, { fmt: fmtBp, strokeWidth: 1.5 });
      r.path.classed('mark', true);
      if (r.label) r.label.classed('label', true);
      // A8-register-f item 10: early in the scrub the line's own growing
      // end label sits almost exactly where "EMBI (bp)" was planted (both
      // near the series' first defined point, since `lastIdx` starts at
      // `definedIdx[0]` when t is small) — a real bbox check each frame,
      // not a fixed t threshold (the sweep speed depends on the reader's
      // own scroll). While they actually overlap the series name drops to
      // the axis strip, snapping back to its natural start-of-line
      // position the instant the growing label has swept clear.
      if (nameSel && r.label && naturalY != null) {
        const overlap = boxesIntersect(nameSel.node().getBBox(), r.label.node().getBBox());
        nameSel.attr('y', overlap ? stage.safe.y + stage.safe.height - 6 : naturalY);
      }
    }
  };
}

// b2 (eased, CAP.beats[1]): EMBI settles, the Parallel gap draws in
// alongside it, and the US-swap flag is the event the caption names.
function swapBeat() {
  let x;
  let y;
  let y2;
  return {
    motion: 'eased',
    caption: CAP.beats[1],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y, y2 } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawVlines(stage, x, ctx);
      drawGapZeroRef(stage, stage.safe, y2);
      lineDraw(stage, EMBI, { x, y }, 1, { fmt: fmtBp, strokeWidth: 1.5 }).path.classed('mark', true);
      drawSeriesName(stage, x, y, EMBI, 'EMBI (bp)');
      drawSeriesName(stage, x, y2, PARALLEL, 'Parallel gap (%)');
      stage.selectAll('g.vlines text').attr('font-weight', (d, i, nodes) => (nodes[i].textContent === 'US swap' ? 700 : null));
    },
    update(stage, t) {
      // A7-fix P1-3 / A7-fix2 P2: Parallel gap is the unnamed k-gray
      // series — thinner stroke + reduced opacity so it doesn't out-ink
      // the named EMBI accent line. A7-fix's own 0.7 opacity measured
      // still marginally ahead of EMBI's weighted ink (3201 vs 3140) in
      // both themes; dropped further to 0.55.
      const r = lineDraw(stage, PARALLEL, { x, y: y2 }, t, { fmt: fmtPct, strokeWidth: 1, opacity: 0.55 });
      r.path.classed('mark', true);
      if (r.label) r.label.classed('label', true);
    }
  };
}

// b3 (eased, CAP.beats[2]): both series settled; a callout on the
// Midterms flag fades in with the post-midterm compressed EMBI reading.
function midtermBeat() {
  let x;
  let y;
  let y2;
  return {
    motion: 'eased',
    caption: CAP.beats[2],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y, y2 } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawVlines(stage, x, ctx);
      drawGapZeroRef(stage, stage.safe, y2);
      lineDraw(stage, EMBI, { x, y }, 1, { fmt: fmtBp, strokeWidth: 1.5 }).path.classed('mark', true);
      lineDraw(stage, PARALLEL, { x, y: y2 }, 1, { fmt: fmtPct, strokeWidth: 1, opacity: 0.55 }).path.classed('mark', true);
      drawSeriesName(stage, x, y, EMBI, 'EMBI (bp)');
      drawSeriesName(stage, x, y2, PARALLEL, 'Parallel gap (%)');
      const vlines = vlinesFromSpec(ctx.specs[SPEC_ID]);
      const midterms = vlines.find((v) => v.text === 'Midterms');
      const definedIdx = [];
      EMBI.y.forEach((v, i) => {
        if (Number.isFinite(v)) definedIdx.push(i);
      });
      const lastIdx = definedIdx[definedIdx.length - 1];
      const calloutX = midterms ? x(midterms.x) : x(EMBI.x.values[lastIdx]);
      // A7-fix2 P1-5: left-anchored by default (grows rightward) — the
      // Midterms flag sits near the end of the time domain, and this is a
      // full sentence (~175px), not a short value label, so a fixed
      // "flip within 60px of the edge" threshold (the one `lineDraw`'s own
      // end label and this file's `scan-readout` use) isn't reliable here
      // — the START point can sit well clear of the edge while the
      // rendered text still runs past it. Measure the real glyph width
      // after setting the text (`getBBox`, same discipline `wrapSvgText`
      // uses) and only then decide whether it needs to flip.
      const safeRight = stage.safe.x + stage.safe.width;
      const callout = stage
        .append('text')
        .attr('class', 'annot midterm-callout')
        .attr('x', calloutX)
        .attr('y', y(EMBI.y[lastIdx]) - 10)
        .attr('opacity', 0)
        .text(`spread compresses to ${fmtBp(EMBI.y[lastIdx])}`);
      const node = callout.node();
      if (node && node.getBBox && node.getBBox().x + node.getBBox().width > safeRight) {
        callout.attr('text-anchor', 'end').attr('x', safeRight);
      }
    },
    update(stage, t) {
      stage.select('text.midterm-callout').attr('opacity', t);
    }
  };
}

export default {
  id: '04-ballot-box',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  data: (ctx) => ctx.specs[SPEC_ID],
  series: [
    { label: EMBI.label, x: EMBI.x, y: EMBI.y },
    { label: PARALLEL.label, x: PARALLEL.x, y: PARALLEL.y }
  ],
  beats: [embiScrubBeat(), swapBeat(), midtermBeat()]
};
