// story/scenes/07-institution.js — CANVAS-design.md §2 row 7 "The
// institution not built" (A5b). Draws fig08_comparative (Israel 1985,
// Brazil 1994, Argentina 2023, months from stabilisation) using only K18
// primitives + the SPEC data adapter. `RAW` is a labels+dataset slice of
// the real widget's own SPEC (output/widgets/fig08_comparative.html),
// byte-identical to what the build's `assertScenesMatchSpec` re-extracts
// by dataset label. Own event-relative axis — `xNormalise` classifies the
// "-12".."30" labels as `kind: "relative"` (plain numbers), no calendar
// share with scene 1's dates.
import { lineDraw, axisMorph, declutterLabels } from '../../../../scrolly-kit/src/canvas/primitives/index.js';
import { seriesFromSpec, vlinesFromSpec } from '../../../../scrolly-kit/src/canvas/data/seriesFromSpec.js';
import captions from '../captions.json' with { type: 'json' };

const SPEC_ID = 'fig08_comparative';
const CAP = captions.scenes.find((s) => s.id === '07-institution');

const RAW = {"labels":["-12","-11","-10","-9","-8","-7","-6","-5","-4","-3","-2","-1","0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"],"datasets":[{"label":"Israel 1985","key":"amber","data":[12.35,16.47,21.37,24.34,19.54,3.74,5.26,13.04,13.46,20.34,4.23,17.57,26.44,3.64,2.63,5.98,0,1.61,-1.59,1.61,1.59,3.12,1.52,0.75,0,1.48,2.19,2.14,2.8,1.36,2.01,0.66,1.31,1.94,1.27,0.63,0.62,1.23,1.22,1.2,1.19,1.18,1.74]},{"label":"Brazil 1994","key":"green","data":[30.72,32.96,35.69,33.92,35.56,36.84,41.31,40.27,42.75,42.68,44.03,47.43,6.84,1.86,1.53,2.62,2.81,1.71,1.7,1.02,1.55,2.43,2.67,2.26,2.36,0.99,0.99,1.41,1.47,1.56,1.34,1.03,0.35,1.26,1.22,1.19,1.11,0.44,0.15,0.3,0.32,0.47,1.18]},{"label":"Argentina 2023","key":"crimson","data":[5.12,6.03,6.63,7.68,8.4,7.77,5.95,6.34,12.44,12.75,8.3,12.81,25.47,20.61,13.24,11.01,8.83,4.18,4.58,4.03,4.17,3.47,2.69,2.43,2.7,2.21,2.4,3.73,2.78,1.5,1.62,1.9,1.88,2.08,2.34,2.47,2.85,2.88,2.9,3.38,2.58,2.15,null]}]};

// Colour authority is captions.json's own `.k data-key` mapping — Israel
// is tagged blue there, overriding fig08's own SPEC `key: "amber"` (same
// override philosophy scene 2 uses for CCL gap).
function paint(label, hex, token) {
  const s = seriesFromSpec(RAW, label);
  s.color = { hex, token };
  return s;
}
const ISRAEL = paint('Israel 1985', 'var(--k-blue)', 'k-blue');
const BRAZIL = paint('Brazil 1994', 'var(--k-green)', 'k-green');
const ARGENTINA = paint('Argentina 2023', 'var(--k-crimson)', 'k-crimson');

function fmtPct(v) {
  return `${v.toFixed(1)} %`;
}

// A8-register-h item 1 (critique §2, "1.2 %" k-green on paper, 2.96:1
// light / 3.09:1 dark — the fourth of the docket's four named labels):
// `lineDraw`'s own end label paints in the series' own `fill` colour
// (`src/canvas/primitives/lineDraw.js`, out of this dispatch's fence) —
// fine for the LINE (colour identity, §1.5) but Brazil's k-green fails
// 4.5:1 as TEXT against paper in light theme (DESIGN.md's own table:
// 3.17:1), and this scene's end labels don't sit on a mark (paper behind
// them, not another series) so `.line-draw-label`'s paint-order:stroke
// paper halo (canvas.css) — which protects against an underlying MARK,
// not against the fill colour itself being low-contrast — cannot fix it:
// the halo is painted in `--paper`, identical to the background it
// already is. `lineDraw.js` is out of fence (only canvas.css/engine here,
// plus this scene file, are editable) so the fix is scene-local: every
// call site below re-selects the returned `.label` and overrides its
// `fill` to `--ink-soft` (7.14:1 light / 9.06:1 dark, DESIGN.md's own
// Text-contrast table) after the fact. The LINE stroke stays each
// series' own k-* colour (§1.5's "each gets its own k-* colour" is about
// the series identity — the caption's own `.k` swatch + this line's own
// stroke — not this numeric end-of-line VALUE label); the persistence
// annotation and axis already use `--ink-soft` for the same reason, so
// this makes every text element in this scene consistent.
function drawLine(stage, series, scales, t, cls) {
  const r = lineDraw(stage, series, scales, t, { fmt: fmtPct });
  r.path.classed('mark', true);
  if (cls) r.path.classed(cls, true);
  if (r.label) r.label.classed('label', true).attr('fill', 'var(--ink-soft)');
  return r;
}

// Persistence count — months below 2% out of the full window — derived
// live from each series' own data, not hardcoded (same discipline A5a's
// scene 3 regime windows use).
function countBelow(series, threshold) {
  return series.y.filter((v) => Number.isFinite(v) && v < threshold).length;
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
  const [lo, hi] = extent([ISRAEL, BRAZIL, ARGENTINA]);
  const x = ctx.d3.scale
    .scaleLinear()
    .domain(ctx.d3.array.extent(ISRAEL.x.values))
    .range([stage.safe.x, stage.safe.x + stage.safe.width]);
  const y = ctx.d3.scale
    .scaleLinear()
    .domain([Math.min(0, lo), hi])
    .nice()
    .range([stage.safe.y + stage.safe.height, stage.safe.y]);
  return { x, y };
}

// Endpoints + t=0 (the stabilisation month itself) — "regime-boundary"
// ticks' equivalent for an event-relative axis (§1.5).
function drawAxis(stage, x) {
  const domain = x.domain();
  const g = stage
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(g, x, x, 1, { ticks: [domain[0], 0, domain[1]], format: (v) => `t=${v}` });
}

function drawTZeroVline(stage, x, ctx) {
  const vlines = vlinesFromSpec(ctx.specs[SPEC_ID]);
  const g = stage.append('g').attr('class', 'vlines');
  vlines.forEach(({ x: v, text }) => {
    const cx = x(v);
    g.append('line')
      .attr('class', 'mark leader')
      .attr('x1', cx)
      .attr('x2', cx)
      .attr('y1', stage.safe.y)
      .attr('y2', stage.safe.y + stage.safe.height);
    g.append('text').attr('class', 'mark annot').attr('x', cx + 4).attr('y', stage.safe.y + 12).text(text);
  });
}

// Authored 2 % reference (not a SPEC series) — "both fell below 2% per
// month and stayed there".
function drawTwoPercentLine(stage, x, y) {
  stage
    .append('line')
    .attr('class', 'leader')
    .attr('x1', x.range()[0])
    .attr('x2', x.range()[1])
    .attr('y1', y(2))
    .attr('y2', y(2))
    .attr('stroke-dasharray', '3 3');
  stage.append('text').attr('class', 'annot').attr('x', x.range()[0]).attr('y', y(2) - 4).text('2 %');
}

// b1 (eased, CAP.beats[0]): the two comparators draw in together.
function comparatorsBeat() {
  let x;
  let y;
  return {
    motion: 'eased',
    caption: CAP.beats[0],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawTZeroVline(stage, x, ctx);
      drawTwoPercentLine(stage, x, y);
    },
    update(stage, t) {
      drawLine(stage, ISRAEL, { x, y }, t);
      drawLine(stage, BRAZIL, { x, y }, t);
      // A7-fix P2-7: Israel and Brazil both end within a point of each
      // other (2.1 %/1.2 % measured) — declutter apart vertically rather
      // than let the two end labels overprint.
      // A8-register-b gap 1: `clampBottom` matches `lineDraw`'s own
      // axis-strip clamp (both series converge near this event-relative
      // axis's own zero floor, right at the "t=30" domain-endpoint tick
      // — the same class of collision scene 2's gap lines have against
      // "May 2026") so decluttering doesn't push a label back through it.
      declutterLabels(stage, undefined, undefined, stage.safe.y + stage.safe.height - 14, stage.safe.y);
    }
  };
}

// b2 (scrub, CAP.beats[1]): Argentina's own path travels on the same
// index, hand-driven — it ends at t=29 (2.15), the SPEC's own last
// non-null point, never plateaued.
function argentinaScrubBeat() {
  let x;
  let y;
  return {
    motion: 'scrub',
    caption: CAP.beats[1],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawTZeroVline(stage, x, ctx);
      drawTwoPercentLine(stage, x, y);
      drawLine(stage, ISRAEL, { x, y }, 1);
      drawLine(stage, BRAZIL, { x, y }, 1);
    },
    update(stage, t) {
      drawLine(stage, ARGENTINA, { x, y }, t);
      // A8-register-b gap 1: see `comparatorsBeat`'s own `clampBottom`
      // comment, above — same axis-strip collision, this scrub's own
      // settled endpoint.
      declutterLabels(stage, undefined, undefined, stage.safe.y + stage.safe.height - 14, stage.safe.y);
    }
  };
}

// b3 (eased, CAP.beats[2]): all three settled; the persistence counts
// (months < 2%) fade in as a typographic annotation.
function persistenceBeat() {
  let x;
  let y;
  return {
    motion: 'eased',
    caption: CAP.beats[2],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawTZeroVline(stage, x, ctx);
      drawTwoPercentLine(stage, x, y);
      drawLine(stage, ISRAEL, { x, y }, 1);
      drawLine(stage, BRAZIL, { x, y }, 1);
      drawLine(stage, ARGENTINA, { x, y }, 1);
      // A8-register-b gap 1: see `comparatorsBeat`'s own `clampBottom`
      // comment, above — same axis-strip collision, all three settled.
      declutterLabels(stage, undefined, undefined, stage.safe.y + stage.safe.height - 14, stage.safe.y);
      const counts = [
        ['Israel', ISRAEL],
        ['Brazil', BRAZIL],
        ['Argentina', ARGENTINA]
      ].map(([label, series]) => `${label} ${countBelow(series, 2)}/${series.y.length}`);
      // A7-fix P2-7: was `safe.y + 14`, the same row `drawTZeroVline`'s
      // own label sits on (`safe.y + 12`) — a wide sentence starting at
      // `safe.x` runs straight through the t=0 flag. Dropped one line
      // below it.
      stage
        .append('text')
        .attr('class', 'annot persistence')
        .attr('x', stage.safe.x)
        .attr('y', stage.safe.y + 32)
        .attr('opacity', 0)
        .text(`Months < 2 %: ${counts.join(' · ')}`);
    },
    update(stage, t) {
      stage.select('text.persistence').attr('opacity', t);
    }
  };
}

export default {
  id: '07-institution',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  data: (ctx) => ctx.specs[SPEC_ID],
  series: [
    { label: ISRAEL.label, x: ISRAEL.x, y: ISRAEL.y },
    { label: BRAZIL.label, x: BRAZIL.x, y: BRAZIL.y },
    { label: ARGENTINA.label, x: ARGENTINA.x, y: ARGENTINA.y }
  ],
  beats: [comparatorsBeat(), argentinaScrubBeat(), persistenceBeat()]
};
