// story/scenes-v2/07-institution.js — S2-6b port of `story/scenes/
// 07-institution.js` (CANVAS-design.md §2 row 7, "The institution not
// built", fig08_comparative) to engine v2 (METHOD-RESET.md §3.1). `RAW`,
// `paint()`, `SPEC_ID` and the caption lookup below are copied verbatim
// from that file (data, not design — `assertScenesMatchSpec` re-extracts
// by dataset label). Everything else — the state schema, `draw()`, and
// all axis/annotation placement — is new, written fresh against the
// engine2 contract: flat numeric `state` per beat, no full-stage wipe,
// every mark/label join kept idempotent (S2-6a's as-built rules 2-4
// apply here too — see 01/02/04/05's own header notes).
import {
  lineDraw,
  axisMorph,
  declutterLabels,
  measureEndLabelGutter,
  composeEndLabel,
  FLIP_THRESHOLD_PX,
  NAME_LABEL_MIN_WIDTH_PX
} from '../../../../scrolly-kit/src/canvas/primitives/index.js';
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

// Persistence count — months below 2% out of the full window — derived
// live from each series' own data, not hardcoded (same discipline
// 03-treasury.js's own regime windows use).
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
const [LO, HI] = extent([ISRAEL, BRAZIL, ARGENTINA]);

// S2-6b round 1 (measured, not guessed): the first port ran the x-range
// all the way to `stage.safe.x + stage.safe.width`, so every one of the
// three termini sat within `lineDraw`'s own `FLIP_THRESHOLD_PX` (60) of
// the true right edge — its own flip fired, and every end label drew
// LEFTWARD, back over the last stretch of its own line. Israel/Brazil's
// own tails oscillate close to their own settled value for many months
// (`RAW`, embedded), so that backward-drawn label sat on top of real
// recent history of its OWN series — `avoidPathCollisions` cannot rescue
// this (its own `excludeSelfSamples` deliberately drops a label's own
// series from its obstacle test, S2-2-fix-b P1-1's own header note), and
// the checker (an independent witness, no such exclusion) correctly
// flagged it as `path-text`. Same fix as 01-three-regimes.js's/
// 02-confidence.js's/04-ballot-box.js's own `measureEndLabelGutter` P1-2
// lever: shrink the range short by the widest label this scene will
// actually draw, so no terminus sits inside the flip zone and every label
// draws rightward, off its own line, with nothing left to dodge.
function lastDefinedIndex(series) {
  for (let i = series.y.length - 1; i >= 0; i--) {
    if (Number.isFinite(series.y[i])) return i;
  }
  return -1;
}
function lastDefinedValue(series) {
  const idx = lastDefinedIndex(series);
  return idx >= 0 ? series.y[idx] : null;
}

// S2-6b-fix-d item 2: Argentina's own FINAL (t=1) end-label rect, recomputed
// fresh every `draw()` call from the same lastIdx/x/y/flip logic
// `lineDraw`'s own end label uses (`lineDraw.js` — px/py off the last
// defined point, the axis-row clamp, the FLIP_THRESHOLD_PX flip) — but as a
// throwaway PROBE element, never a read of Argentina's live (possibly
// still-scrubbing) DOM label. `RAW`/the scales are the only inputs, and
// neither depends on `argentinaT` (the scrub-hand state) — so this returns
// byte-identical geometry on every frame of every beat, the fixed obstacle
// item 2's design calls for. Fed to `declutterLabels` below as the pair's
// one immovable neighbour so Israel/Brazil's settled layout is computed
// against Argentina's TRUE terminus from frame 0, not wherever its own
// still-growing anchor happens to sit mid-scrub.
function argentinaFinalLabelBox(stage, x, y, safe, showName) {
  const idx = lastDefinedIndex(ARGENTINA);
  if (idx < 0) return null;
  const px = x(ARGENTINA.x.values[idx]);
  let py = y(ARGENTINA.y[idx]);
  const axisRowTop = safe.y + safe.height - 14;
  if (py > axisRowTop) py = axisRowTop;
  const safeRight = safe.x + safe.width;
  const flip = px > safeRight - FLIP_THRESHOLD_PX;
  // S2-crit-fix P1-4: `showName` now matches whatever Argentina's OWN real
  // label will actually render (lineDraw's own `nameLabel && wideEnough`
  // decision, mirrored by the caller) — this probe exists so Israel/
  // Brazil's declutter reserves room against Argentina's TRUE final box;
  // reserving room for the short (value-only) string while the real label
  // draws the wider named one would under-budget the obstacle.
  const text = composeEndLabel({ label: ARGENTINA.label, value: ARGENTINA.y[idx], fmt: fmtPct, showName });
  const probe = stage
    .append('text')
    .attr('class', 'label line-draw-label')
    .attr('opacity', 0)
    .attr('text-anchor', flip ? 'end' : 'start')
    .attr('x', px + (flip ? -6 : 6))
    .attr('y', py)
    .attr('dy', '0.32em')
    .text(text);
  const node = probe.node();
  const box = node && typeof node.getBBox === 'function' ? node.getBBox() : null;
  probe.remove();
  return box;
}

// S2-6b round 3 (measured, not guessed — same "reserve a fixed px band"
// discipline `05-reserves.js`'s own `TOP_GUTTER_PX` uses): Brazil's own
// early (pre-stabilization) months run as high as 47.43 — the series'
// domain MAXIMUM (`HI`) — several of them above 40, so without headroom
// the curve's own real trace occupies almost the whole top few percent of
// the plot's own y-range. The persistence annotation (`drawPersistence`,
// below) sits on a fixed row near that same top edge and is WIDE (spans
// most of the plot's own early-months x-range at narrow viewports, where
// that x-range covers proportionally more of the timeline) — measured:
// `path-text`, Brazil's own line through "Months < 2 %…" at 768/390 only
// (at 1440/1024 the same absolute-width text covers a smaller FRACTION of
// the wider plotted x-range, missing the early high-value months
// entirely). Reserving this band at the top of the y-range keeps the
// curve's own peak comfortably below the text's real box at every width.
const TOP_GUTTER_PX = 56;

// §3.1: scales recompute inside `draw` from `stage.safe` every call. Own
// event-relative axis (`xNormalise` classifies these "-12".."30" labels as
// `kind: "relative"`, plain numbers) — no calendar share with scene 1's
// dates.
function buildScales(stage, ctx) {
  // S2-crit-fix P1-4: "name the three series (nameLabel: true) at >=431;
  // at 390 value-only per the standing rule" (brief) — the same
  // `matchMedia`/`NAME_LABEL_MIN_WIDTH_PX` test `lineDraw` itself applies
  // internally, mirrored here so the reserved gutter accounts for the
  // WIDER named string ("Israel 1985 1.7 %", not "1.7 %") at the widths
  // where it actually draws.
  const showName = typeof matchMedia !== 'function' || matchMedia(`(min-width: ${NAME_LABEL_MIN_WIDTH_PX}px)`).matches;
  const gutter = measureEndLabelGutter(stage, [
    { label: ISRAEL.label, value: lastDefinedValue(ISRAEL), fmt: fmtPct, showName },
    { label: BRAZIL.label, value: lastDefinedValue(BRAZIL), fmt: fmtPct, showName },
    { label: ARGENTINA.label, value: lastDefinedValue(ARGENTINA), fmt: fmtPct, showName }
  ]);
  const x = ctx.d3.scale
    .scaleLinear()
    .domain(ctx.d3.array.extent(ISRAEL.x.values))
    .range([stage.safe.x, stage.safe.x + stage.safe.width - gutter]);
  const y = ctx.d3.scale
    .scaleLinear()
    .domain([Math.min(0, LO), HI])
    .nice()
    .range([stage.safe.y + stage.safe.height, stage.safe.y + TOP_GUTTER_PX]);
  return { x, y };
}

// §3.1 idempotency (same reasoning as 01-three-regimes.js's own `drawAxis`):
// rebuild from a fresh `<g>` every draw call rather than re-`.call()`ing a
// persisted one.
function drawAxis(stage, x) {
  stage.select('g.axis').remove();
  const domain = x.domain();
  const g = stage.append('g').attr('class', 'axis').attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(g, x, x, 1, { ticks: [domain[0], 0, domain[1]], format: (v) => `t=${v}` });
}

// Endpoints + t=0 (the stabilisation month itself) — "regime-boundary"
// tick's equivalent for an event-relative axis (§1.5). Single, static
// vline (SPEC's own `vlines: [{x:12,text:"t=0"}]`, `x` in raw label units
// — `vlinesFromSpec` normalises to the same relative-index space
// `ISRAEL.x.values` uses) — keyed `.join()` so a repeated `draw` call
// (every frame, §3.1) converges instead of appending duplicates.
function drawTZeroVline(stage, x, ctx) {
  const vlines = vlinesFromSpec(ctx.specs[SPEC_ID]);
  const g = stage.selectAll('g.vlines').data([null]).join('g').attr('class', 'vlines');
  const flagG = g
    .selectAll('g.tzero-flag')
    .data(vlines, (d) => d.text)
    .join((enter) => {
      const gg = enter.append('g').attr('class', 'tzero-flag');
      gg.append('line').attr('class', 'mark leader');
      gg.append('text').attr('class', 'mark annot');
      return gg;
    });
  flagG
    .select('line.leader')
    .attr('x1', (d) => x(d.x))
    .attr('x2', (d) => x(d.x))
    .attr('y1', stage.safe.y)
    .attr('y2', stage.safe.y + stage.safe.height);
  flagG
    .select('text.annot')
    .attr('x', (d) => x(d.x) + 4)
    .attr('y', stage.safe.y + 12)
    .text((d) => d.text);
}

// Authored 2 % reference (not a SPEC series, CANVAS-design.md §D.1 — a
// required reference line, not a gridline) — "both fell below 2% per
// month and stayed there". Kept per the brief.
function drawTwoPercentLine(stage, x, y) {
  stage
    .selectAll('line.two-pct')
    .data([null])
    .join('line')
    .attr('class', 'leader two-pct')
    .attr('x1', x.range()[0])
    .attr('x2', x.range()[1])
    .attr('y1', y(2))
    .attr('y2', y(2))
    .attr('stroke-dasharray', '3 3');
  stage
    .selectAll('text.two-pct-label')
    .data([null])
    .join('text')
    .attr('class', 'annot two-pct-label')
    .attr('x', x.range()[0])
    .attr('y', y(2) - 4)
    .text('2 %');
}

// A8-register-h item 1 (critique §2, "1.2 %" k-green on paper, 2.96:1
// light / 3.09:1 dark): `lineDraw`'s own end label paints in the series'
// own `fill` colour — fine for the LINE (colour identity, §1.5) but
// Brazil's k-green fails 4.5:1 as TEXT against paper in light theme, and
// this scene's end labels don't sit on a mark (paper behind them) so the
// halo (painted in `--paper`) cannot fix it. Scene-local fix, same as v1:
// every end label's `fill` is overridden to `--ink-soft` after the fact.
// S2-6a as-built rule 4 (invisible text still has to be in the right
// place): `reveal <= 0` gets `display:none`, not just `opacity:0`, so a
// not-yet-drawn series' end label (which `lineDraw` still creates once any
// point is defined, even at reveal 0) is not a phantom obstacle for
// `declutterLabels`.
function drawLine(stage, series, scales, reveal) {
  // S2-crit-fix P1-4: name the three series — `nameLabel: true`. `lineDraw`
  // itself already suppresses the name below `NAME_LABEL_MIN_WIDTH_PX`
  // (431px), so this is unconditional here; the ONLY other place that
  // decision has to be mirrored is the gutter/obstacle MEASUREMENT
  // (`buildScales`/`argentinaFinalLabelBox`, above), since those run
  // ahead of `lineDraw`'s own real draw and would otherwise reserve room
  // for the wrong (shorter) string.
  const r = lineDraw(stage, series, scales, reveal, { fmt: fmtPct, nameLabel: true });
  r.path.classed('mark', true);
  if (r.label) {
    const resolved = reveal > 0 ? 1 : 0;
    r.label.classed('label', true).attr('fill', 'var(--ink-soft)').attr('opacity', resolved).attr('display', resolved > 0 ? null : 'none');
  }
  return r;
}

// b3's persistence annotation — counts are static (derived from the full
// series, not the current reveal fraction), only `opacity` tweens.
// S2-6b round 1 (S2-6a as-built rule 4): a resolved-opacity-0 annotation is
// STILL a real geometry obstacle to the checker (it does not skip
// `opacity:0` text) — this text sits near the top of the stage, in the
// path of Brazil's own line at several widths, and was a real `path-text`
// failure at beats 0-1 (opacity 0 the whole time) until `display:none`
// removed it from consideration, same convention every other scene's own
// opacity-tweened annotation uses.
function drawPersistence(stage, safe, opacity) {
  const counts = [
    ['Israel', ISRAEL],
    ['Brazil', BRAZIL],
    ['Argentina', ARGENTINA]
  ].map(([label, series]) => `${label} ${countBelow(series, 2)}/${series.y.length}`);
  stage
    .selectAll('text.persistence')
    .data([null])
    .join('text')
    .attr('class', 'annot persistence')
    .attr('x', safe.x)
    .attr('y', safe.y + 32)
    .attr('opacity', opacity)
    .attr('display', opacity > 0 ? null : 'none')
    .text(`Months < 2 %: ${counts.join(' · ')}`);
}

// §6.1 frame states — flat numeric, identical keys every beat (§3.1).
// `comparatorsT` drives Israel+Brazil together (v1's `comparatorsBeat`
// draws both off the same `t`); `argentinaT` is the scrub-hand-driven
// value for Argentina's own line, held at 0 until b2.
const F0_FROM = { comparatorsT: 0, argentinaT: 0, persistenceOpacity: 0 };

export default {
  id: '07-institution',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  series: [
    { label: ISRAEL.label, x: ISRAEL.x, y: ISRAEL.y },
    { label: BRAZIL.label, x: BRAZIL.x, y: BRAZIL.y },
    { label: ARGENTINA.label, x: ARGENTINA.x, y: ARGENTINA.y }
  ],
  beats: [
    // F0 (eased, `from` required at i=0 — §3.1): the two comparators draw
    // in together.
    {
      motion: 'eased',
      caption: CAP.beats[0],
      from: F0_FROM,
      state: { ...F0_FROM, comparatorsT: 1 }
    },
    // F1 (scrub): Argentina's own path travels on the same index,
    // hand-driven — it ends at t=29 (2.15), the SPEC's own last non-null
    // point, never plateaued. Israel/Brazil stay settled (`comparatorsT`
    // unchanged from F0).
    {
      motion: 'scrub',
      caption: CAP.beats[1],
      state: { comparatorsT: 1, argentinaT: 1, persistenceOpacity: 0 }
    },
    // F2 (eased): all three settled; the persistence counts (months < 2%)
    // fade in as a typographic annotation.
    {
      motion: 'eased',
      caption: CAP.beats[2],
      state: { comparatorsT: 1, argentinaT: 1, persistenceOpacity: 1 }
    }
  ],
  draw(stage, state, ctx) {
    const safe = stage.safe;
    const { x, y } = buildScales(stage, ctx);
    drawAxis(stage, x);
    drawTZeroVline(stage, x, ctx);
    drawTwoPercentLine(stage, x, y);

    drawLine(stage, ISRAEL, { x, y }, state.comparatorsT);
    drawLine(stage, BRAZIL, { x, y }, state.comparatorsT);
    drawLine(stage, ARGENTINA, { x, y }, state.argentinaT);
    // S2-6b-fix-d (supersedes S2-6b round 3's blocked binary toggle,
    // documented history below): Argentina's label is PINNED — permanently
    // excluded from this pass, every beat, not just mid-scrub — so it
    // always tracks its own anchor exactly via `lineDraw` alone (04-ballot-
    // box.js's/02-confidence.js's own "a scrub-beat end label gets no
    // declutter/avoid, ever" pattern, applied for this label's entire
    // lifetime rather than toggled on/off at the scrub boundary). Israel/
    // Brazil are the only pair ever decluttered here, and they're laid out
    // against Argentina's own FINAL (t=1) label rect as a fixed obstacle
    // (`argentinaFinalLabelBox`, above) — constant across every frame of
    // every beat since it depends only on `RAW`/the scales, never
    // `argentinaT`. Same input every frame -> same output every frame ->
    // zero `label-continuity` hits for Israel/Brazil, and Argentina lands
    // on its own true terminus every time since nothing ever moves it.
    //
    // S2-6b round 3 (superseded, kept for the record): the prior attempt
    // conditionally excluded Argentina's label only for the OPEN interval
    // (0,1) of its own scrub, re-including it once settled. That fixed the
    // mid-scrub jitter (label-continuity dropped from ~10 hits/width to
    // ~1) but the include/exclude switch itself was a discontinuity —
    // Israel/Brazil's positions stepped between the last excluded sample
    // (t=0.95) and the first included one (t=1.00), still failing
    // `label-continuity` at that boundary every width, and the resulting
    // 3-way settled cluster left Argentina's own `label-terminus` at
    // 16.1-23.3px (cap 16). Diagnosed, not fixed, at the time — this fix
    // is the "dedicated 3-way settled-label layout pass" lever that
    // diagnosis named.
    // S2-6b-fix-d round 2 (measured): the three termini (Israel 1.74%,
    // Brazil 1.18%, Argentina 2.15%) cluster within well under 1% of each
    // other, so the default `minGap` (14, sized for a loosely-packed pair)
    // cascades a much larger total push onto Israel/Brazil once Argentina
    // is fixed than the round-1 attempt at that default budgeted for
    // (measured: label-terminus up to 36px, cap 16). Same "tightly-packed
    // 3-label cluster" precedent 02-confidence.js's own `gapLabelSelector`
    // pass uses (its own minGap 2, for its own Blue gap/CCL gap pair).
    // round 3 (measured): 4px left Brazil's own cascade at 16.7-17.1px
    // (cap 16, over by under 1.1px at every width it still failed) — 3px
    // is still a real, visually-distinct gap between two 14px-tall
    // single-line labels and closes that last margin.
    // S2-crit-fix P1-4: same width test `buildScales`/`lineDraw` itself
    // use — the obstacle probe must render the SAME string Argentina's
    // real (pinned) label draws this frame, named or not.
    const showName = typeof matchMedia !== 'function' || matchMedia(`(min-width: ${NAME_LABEL_MIN_WIDTH_PX}px)`).matches;
    const argentinaObstacle = argentinaFinalLabelBox(stage, x, y, safe, showName);
    declutterLabels(
      stage,
      '.line-draw-label:not([data-label="Argentina 2023"])',
      3,
      safe.y + safe.height - 14,
      safe.y,
      argentinaObstacle ? [argentinaObstacle] : []
    );

    // S2-6a as-built rule 3: annotation passes run LAST, after the lines
    // and after `declutterLabels` has settled the end labels.
    drawPersistence(stage, safe, state.persistenceOpacity);
  }
};
