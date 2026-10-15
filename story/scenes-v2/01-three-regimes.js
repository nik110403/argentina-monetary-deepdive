// story/scenes-v2/01-three-regimes.js — method reset S1 (METHOD-RESET.md
// §6.1/§6.2 item 5). Engine v2 keyframe rewrite of `story/scenes/
// 01-three-regimes.js`: `RAW`, `paint()`, `SPEC_ID` and the caption lookup
// below are copied verbatim from that file (data, not design — the same
// literal `assertScenesMatchSpec` re-extracts by dataset label). Everything
// else — the state schema, `draw()`, axis/annotation placement — is new,
// written fresh against the engine2 contract (§3.1): flat numeric `state`
// per beat, no full-stage wipe, no collision solver (§6.2 item 5: "no
// halos, no collision solver — visual polish is not the target").
// S2-1 (SPEC-S2.md, supersedes §6.2 item 5's "no collision solver" — K18's
// primitives are tested, wired here rather than left unused): tickCollide
// and reducedTickSet, ported from v1 `story/scenes/01-three-regimes.js`
// `drawAxis` (~128-216).
import {
  lineDraw,
  axisMorph,
  tickCollide,
  reducedTickSet,
  declutterLabels,
  avoidPathCollisions,
  labelLeaders,
  NAME_LABEL_MIN_WIDTH_PX,
  measureEndLabelGutter,
  axisLeft
} from '../../../../scrolly-kit/src/canvas/primitives/index.js';
import { seriesFromSpec, bandsFromSpec } from '../../../../scrolly-kit/src/canvas/data/seriesFromSpec.js';
import captions from '../captions.json' with { type: 'json' };

const SPEC_ID = 'fig02_inflation_phases';
const CAP = captions.scenes.find((s) => s.id === '01-three-regimes');

const RAW = {"labels":["2022-01","2022-02","2022-03","2022-04","2022-05","2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12","2023-01","2023-02","2023-03","2023-04","2023-05","2023-06","2023-07","2023-08","2023-09","2023-10","2023-11","2023-12","2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"],"datasets":[{"label":"Headline","key":"crimson","data":[null,4.69,6.73,6.05,5.05,5.3,7.41,6.97,6.17,6.35,4.92,5.12,6.03,6.63,7.68,8.4,7.77,5.95,6.34,12.44,12.75,8.3,12.81,25.47,20.61,13.24,11.01,8.83,4.18,4.58,4.03,4.17,3.47,2.69,2.43,2.7,2.21,2.4,3.73,2.78,1.5,1.62,1.9,1.88,2.08,2.34,2.47,2.85,2.88,2.9,3.38,2.58,2.15]},{"label":"Core","key":"actual","data":[null,4.45,6.4,6.71,5.2,5.08,7.33,6.8,5.51,5.55,4.76,5.25,5.35,7.69,7.21,8.4,7.84,6.49,6.5,13.79,13.43,8.81,13.4,28.26,20.22,12.29,9.41,6.3,3.73,3.65,3.79,4.12,3.26,2.92,2.71,3.2,2.4,2.92,3.19,3.21,2.2,1.71,1.48,2.04,1.9,2.22,2.64,3.03,2.63,3.08,3.19,2.29,1.9]},{"label":"Crawl/band rate","key":"blue","data":[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,2.47,2.85,2.88,2.9,3.38]}]};

// v1 comment, preserved: colour authority is captions.json's own `.k
// data-key` mapping, not seriesFromSpec's nearest-token guess — fig02's
// near-black Core line (SPEC `key: "actual"`) is RGB-nearest to k-crimson,
// not the k-gray the caption actually names for it.
function paint(label, hex, token) {
  const s = seriesFromSpec(RAW, label);
  s.color = { hex, token };
  return s;
}
const HEADLINE = paint('Headline', 'var(--k-crimson)', 'k-crimson');
const CORE = paint('Core', 'var(--k-gray)', 'k-gray');
const CRAWL = paint('Crawl/band rate', 'var(--k-blue)', 'k-blue');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// v1 comment, preserved (`story/scenes/01-three-regimes.js` "A7-fix5 step
// 3"): even with the reduced 5-tick boundary set, the last two ticks
// ("Jan 2026" interior, "May 2026" domain endpoint) still overlap on
// ≤860px — short year form buys back just enough width to clear it.
function monthLabel(d) {
  const y = d.getUTCFullYear();
  const short = typeof matchMedia === 'function' && matchMedia('(max-width: 860px)').matches;
  return `${MONTHS[d.getUTCMonth()]} ${short ? `'${String(y).slice(-2)}` : y}`;
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
const [DATA_LO, DATA_HI] = extent([HEADLINE, CORE, CRAWL]);

// S2-2-fix-c: Q11 ruling, "two y-domains by beat" — beat 0 keeps the OLD
// single domain (the Dec-2023 spike is its own beat's whole point);
// beats 1-3 rescale to the brief's own "[0, 8] (nice'd)". `DATA_LO` is
// always >= 1 in this SPEC's own three series (measured), so
// `Math.min(0, DATA_LO)` — the old domain's own floor — is always 0;
// dropped rather than carried forward as dead code.
// Measured, not guessed: `d3.scaleLinear().domain([0, DATA_HI]).nice().domain()[1]`
// (`DATA_HI` = 28.26, Core's own Dec-2023 print) — this is EXACTLY the top
// the OLD single-domain `buildScales` produced (`.domain([...]).nice()`,
// pre-this-item), reproduced with `node -e` against this file's own
// `d3-scale` (report has the transcript) rather than imported bare — a
// scene module has no `package.json` of its own to resolve a bare `d3-*`
// specifier against (only this kit's does; see `axisLeft`'s own import
// above, re-exported through the kit's primitives barrel for that reason).
const Y_DOMAIN_HI_SPIKE = 30;
const Y_DOMAIN_HI_PRESENT = 8; // brief, verbatim
const Y_AXIS_TICKS = [0, 2, 4, 6, 8];
// S2-2-fix-c round 2: no space before `%` — every extra px this axis
// reserves comes straight out of the shared x-axis's own already-tight
// date-tick budget (measured, this file's own `measureYAxisGutter` header
// note); tight but still "%", per the brief.
function fmtYTick(v) {
  return `${v}%`;
}

function maxPoint(series) {
  let maxI = -1;
  let maxV = -Infinity;
  series.y.forEach((v, i) => {
    if (Number.isFinite(v) && v > maxV) {
      maxV = v;
      maxI = i;
    }
  });
  return { i: maxI, v: maxV };
}
const HEADLINE_MAX = maxPoint(HEADLINE);

// S2-2-fix-b P1-2, lever 1: the last DEFINED value of a series (what its
// end label will actually show at t=1) — trailing nulls never occur in
// this SPEC's own three series today, but skip them defensively rather
// than assume.
function lastDefinedValue(series) {
  for (let i = series.y.length - 1; i >= 0; i--) {
    if (Number.isFinite(series.y[i])) return series.y[i];
  }
  return null;
}

// §3.1: scales recompute inside `draw` from `stage.safe` every call, so a
// resize is just a redraw.
//
// S2-2-fix-b P1-2, lever 1: every end label in this scene terminates on the
// safe area's own right edge (`range` used to run all the way to
// `stage.safe.x + stage.safe.width`), which is exactly why `lineDraw`'s own
// 60px flip fired and every label got drawn leftward, back over the last
// stretch of its own line (brief, "What went wrong, mechanically"). Shrink
// the range short by a GUTTER — the widest end label this scene will
// actually draw at the current viewport (named form ≥431px, value-only
// ≤430px), measured via `measureEndLabelGutter` (never a guess) — so every
// terminus sits strictly inside the safe area with nothing left for
// `declutterLabels`/`avoidPathCollisions` to dodge, and (since the gutter
// floors at `FLIP_THRESHOLD_PX`, 60) `lineDraw`'s own flip never fires
// either: the true fix is removing the reason to flip, not re-deciding it
// differently.
// S2-2-fix-c: measured (never guessed — the same discipline
// `measureEndLabelGutter` above already applies to the RIGHT-side end-label
// gutter), the widest of this scene's own 5 y-axis ticks, probed inside a
// throwaway `<g class="axis">` so `getComputedTextLength` reads the real
// `.axis text` CSS rule (canvas.css) — the same font the real ticks render
// with, not the SVG default. `+9` is d3-axis's own real default
// `tickSizeInner(6) + tickPadding(3)` (`node_modules/d3-axis/src/axis.js`'s
// own `spacing` constant, verified against source — round 2: this used to
// be `+6+9`, double-counting the tick-mark size), the exact reserve every
// tick already consumes on its own left side; no extra safety margin on
// top, because every one of these px comes straight out of the shared
// x-axis's own already-tight date-tick budget (see that axis's own
// pre-existing tickCollide.js header notes on how little slack it has).
function measureYAxisGutter(stage) {
  const wrap = stage.append('g').attr('class', 'axis').attr('opacity', 0);
  const probe = wrap.append('text').attr('x', -9999).attr('y', -9999);
  const node = probe.node();
  let max = 0;
  if (node && typeof node.getComputedTextLength === 'function') {
    Y_AXIS_TICKS.forEach((d) => {
      probe.text(fmtYTick(d));
      const w = node.getComputedTextLength();
      if (w > max) max = w;
    });
  }
  wrap.remove();
  return Math.max(max + 9, 24);
}

// S2-2-fix-c: `state.yDomainHi` is the tweened value itself (Q11 ruling,
// this file's own header note on `Y_DOMAIN_HI_SPIKE`/`_PRESENT`) — the
// engine's flat-numeric-state lerp (`engine2/follower.js`'s `lerpState`)
// tweens it exactly like every other state number, so the eased beat0→beat1
// transition IS the axis morph: every path/band/annotation below re-reads
// through this one scale every frame, nothing is hand-animated separately.
// The y-axis itself reserves a LEFT gutter (mirrors the x-range's own
// right-side end-label gutter) — held constant across every beat (not
// beat0-only) so the x-mapping never jumps discontinuously the instant the
// y-axis fades in at beat 1.
function buildScales(stage, ctx, state) {
  const showName = typeof matchMedia !== 'function' || matchMedia(`(min-width: ${NAME_LABEL_MIN_WIDTH_PX}px)`).matches;
  const gutter = measureEndLabelGutter(
    stage,
    [HEADLINE, CORE, CRAWL].map((s) => ({ label: s.label, value: lastDefinedValue(s), fmt: fmtPct, showName }))
  );
  const yAxisGutter = measureYAxisGutter(stage);
  const x = ctx.d3.scale
    .scaleTime()
    .domain(ctx.d3.array.extent(HEADLINE.x.values))
    .range([stage.safe.x + yAxisGutter, stage.safe.x + stage.safe.width - gutter]);
  const y = ctx.d3.scale
    .scaleLinear()
    .domain([0, state.yDomainHi])
    .range([stage.safe.y + stage.safe.height, stage.safe.y]);
  return { x, y };
}

// S2-1: v1 `drawAxis`'s own boundary/collision wiring, ported verbatim
// where the v2 contract allows (comments below cite the source lines).

// v1 "A7-fix5" (tribunal-verified root cause): a band's `to` and the next
// band's `from` one month apart are the same transition, not two separate
// boundaries — keep every band's `from`; keep a band's `to` only when no
// other band starts the very next month (a genuine end).
function monthsApart(a, b) {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

// v1 "A7-fix4 P1(c)" tickClampBottom: the live viewport-space Y a
// staggered protected tick's own bottom edge may never cross — simply the
// stage's own true outer edge (`stage.safe` already reserves exactly
// `stage.padding` px below the axis line for one row of tick text).
//
// S2-2-fix-c: `stage.node().getBoundingClientRect()` (the SCENE ROOT
// `<g>`'s own rect) is a CONTENT bbox, not a viewport frame —
// `getBoundingClientRect()` on a `<g>` is the union of everything it
// currently renders, transform included. That was a harmless proxy for
// "the SVG's own top" back when nothing this scene drew ever left the
// safe area — but `plotGroup`'s new clip-path (this file's own header
// note) means Core/Headline's own Dec-2023 excursion, and the max-label
// callout that tracks it, now legitimately compute geometry HUNDREDS of
// px above the visible frame on beats 1-3 (clip-path hides them on
// screen; it does not shrink their geometry, so `getBoundingClientRect()`
// still counts it) — measured: the group's own top went from ~stage.padding
// to -1870px on this scene's very first affected beat, and stayed there
// on every later `drawAxis` call too (draw() runs incrementally; a stale
// PRIOR frame's already-off-frame content is still in the DOM at the
// moment THIS frame's `tickClampBottom` runs, before this frame's own
// `drawMaxLabel` has re-settled it — so even a beat that itself draws
// nothing off-frame can read a poisoned value left by the beat before
// it). That drove `clampBottom` deeply negative, which zeroed every
// tick's own stagger offset (`Math.max(0, Math.min(...))` in
// `tickCollide`) and reopened the exact "Jan 2026"/"May 2026" collision
// that primitive's own header documents as otherwise-solved. Fixed at the
// root: read the `<svg>` ELEMENT's own rect instead of its content's — an
// `<svg>` root does not auto-size to what's drawn inside it (unlike a
// `<g>`), so this is stable regardless of what any beat draws, on-frame
// or off.
function tickClampBottom(stage) {
  const svg = stage.node().ownerSVGElement;
  const svgTop = svg ? svg.getBoundingClientRect().top : stage.node().getBoundingClientRect().top;
  return svgTop + stage.height;
}

// v1 "A8-register-f item 12": the one interior boundary this scene's
// first caption names by date, kept alone when the reduced tick set
// applies (below 430px — clampBottom itself is the binding constraint at
// that width, not row count; see tickCollide.js's own header comment).
function isDec2023(d) {
  return d.getUTCFullYear() === 2023 && d.getUTCMonth() === 11;
}

function axisBoundaries(x, ctx) {
  const domain = x.domain();
  const bands = bandsFromSpec(ctx.specs[SPEC_ID]);
  const genuineEnds = bands.filter((b) => !bands.some((other) => other !== b && monthsApart(b.to, other.from) === 1));
  return [...new Set([...bands.map((b) => b.from), ...genuineEnds.map((b) => b.to)])]
    .filter((d) => d.getTime() !== domain[0].getTime() && d.getTime() !== domain[domain.length - 1].getTime())
    .sort((a, b) => a.getTime() - b.getTime());
}

function drawAxis(stage, x, ctx) {
  const domain = x.domain();
  const boundaries = axisBoundaries(x, ctx);
  // S2-2-fix-c: threshold widened 430 -> 800 (was scoped to @390 alone by
  // the A8-register-f ruling this constant belongs to). Measured, this
  // item: the new y-axis's own real, minimal gutter (`measureYAxisGutter`,
  // ~26px for "8%") tightens the SAME shared x-axis date-tick budget that
  // ruling's own ratio applies to, and at 768 specifically this tips the
  // pre-existing "Jan '26"/"May '26" pair (already only 4 months apart,
  // already flagged fragile in tickCollide.js's own header note) into a
  // clampBottom-blocked collision — confirmed via direct measurement,
  // not assumed: at 768, May '26's own stagger row is already clamped
  // flush to the stage's true bottom edge (`bottom: 585.48` ==
  // `svg bottom: 585.48`, zero room left, a hard physical floor per that
  // ruling's own diagnosis, not a formula issue); and confirmed the y-axis
  // gutter is NOT the primary cause either — forcing it to 0px as a
  // diagnostic recovered only ~2px of the 25.5px overlap (the two ticks
  // sit near the domain's far-right end, where left-side gutter room barely
  // reaches). 1024 is unaffected (full 5-tick set, still clean) — this
  // constant now reads "@768 and narrower," not "@390 alone," the same
  // reduced-set device already proven correct for 390's own copy of this
  // exact pair, applied one width class further per this item's own new
  // demand on the shared budget.
  const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 800px)').matches;
  const ticks = reducedTickSet(domain, boundaries, narrow, isDec2023);
  const activeBoundaries = narrow ? boundaries.filter(isDec2023) : boundaries;
  // §3.1 idempotency: tickCollide mutates the DOM after render
  // (`node.remove()`/staggers a `<text>`'s own transform). A persisted
  // `g.axis` re-`.call()`ed by axisMorph can't recover a tick's `<text>`
  // a prior frame's collide pass already removed — d3-axis keys ticks by
  // pixel position and only APPENDS a `<text>` for a truly entering tick,
  // never for one whose group already exists but lost its text child.
  // Rebuilding from a fresh `<g>` every draw call keeps this scoped
  // rebuild (not a full-stage wipe) idempotent regardless of how many
  // frames preceded it.
  //
  // S2-2-fix-c: `class="axis x-axis"` (was bare `axis`) — this scene now
  // has a SECOND `.axis`-classed group (the new y-axis below), and
  // `stage.select('g.axis')` matches only the FIRST such element in
  // document order; a bare-class removal here could delete the wrong one
  // depending on prior-frame DOM order. The compound selector keeps each
  // axis's own removal targeted at only itself — both groups still carry
  // plain `.axis` too, so canvas.css's `.axis text`/`.axis line`/`.axis
  // path` rules keep applying to both unchanged.
  stage.select('g.axis.x-axis').remove();
  const axisG = stage.append('g').attr('class', 'axis x-axis').attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(axisG, x, x, 1, { ticks, format: monthLabel });
  tickCollide(axisG, { protect: activeBoundaries, clampBottom: tickClampBottom(stage) });
}

// S2-2-fix-c: the new y-axis (Q11, "the y-axis must say what it shows: tick
// set [0, 2, 4, 6, 8] % on beats 1-3"). `axisMorph(axisG, y, y, 1, …)` is an
// identity morph (same scale as both `from`/`to`) — the REAL morph already
// happened inside `buildScales` (`state.yDomainHi` tweens the scale itself,
// this file's own header note), so this call only needs axisMorph for its
// rendering/formatting, not its interpolation. `orient: axisLeft` is why
// `axisMorph.js` itself needed the one-line orientation gate (see that
// file's own header note) — its endpoint text-anchor flip is horizontal-
// axis-only; d3-axis's own vertical default (text-anchor: end, growing
// left into this axis's own reserved gutter) is already correct here.
// `opacity` (not a beat-conditional skip) is `state.yAxisOpacity` — 0
// through beat 0 (matches `maxLabelOpacity`'s own beat-0-silent pattern
// just below), fading in with the SAME eased beat0->beat1 transition the
// domain morph itself rides, since both are just tweened `state` numbers.
function drawYAxis(stage, y, xPos, opacity) {
  stage.select('g.axis.y-axis').remove();
  const axisG = stage.append('g').attr('class', 'axis y-axis').attr('opacity', opacity).attr('transform', `translate(${xPos},0)`);
  axisMorph(axisG, y, y, 1, { ticks: Y_AXIS_TICKS, orient: axisLeft, format: fmtYTick });
}

// S2-2-fix-c: "series values above the domain top on beats 1-3 are clipped
// … not dropped from the data" (brief). The clip rect is simply
// `stage.safe` itself, held CONSTANT across every beat — not tied to
// `state.yDomainHi` at all, because a linear scale's own domain MAXIMUM
// always maps to the range's own top (`safe.y`) by construction; the only
// thing that ever needs clipping away is a value OUTSIDE the current
// domain (Dec-2023's real prints, once beats 1-3 shrink the domain to
// `[0, 8]`), which the scale — un-clamped, deliberately — extrapolates to
// a y ABOVE `safe.y` instead of pinning flat at the ceiling; a flat pin
// would read as "the line hit a wall," not "the spike is leaving the
// frame" (brief's own intended reading).
function ensurePlotClip(stage, safe) {
  let defs = stage.select('defs.s1-defs');
  if (defs.empty()) defs = stage.append('defs').attr('class', 's1-defs');
  const clip = defs.selectAll('clipPath#s1-plot-clip').data([null]).join('clipPath').attr('id', 's1-plot-clip');
  clip
    .selectAll('rect')
    .data([null])
    .join('rect')
    .attr('x', safe.x)
    .attr('y', safe.y)
    .attr('width', safe.width)
    .attr('height', safe.height);
}

// One persistent clipped group for everything that can exceed the domain
// top on beats 1-3: the three lines (Core's own Dec-2023 print, 28.26,
// exceeds it too, even though only Headline gets a callout) and the
// max-label callout itself, which "re-places through the same scale" (the
// brief's own words for bands/ticks/annotations) rather than being given
// its own opacity choreography — it leaves the frame because its Y
// position does, the same mechanism as the lines, not a separate fade.
function plotGroup(stage) {
  const g = stage.selectAll('g.plot-clip').data([null]).join('g').attr('class', 'plot-clip').attr('clip-path', 'url(#s1-plot-clip)');
  // `lineDraw`'s own end-label edge-flip/axis-clamp reads `sel.safe` — true
  // for `stage` itself, not for a plain sub-`<g>` (02-confidence.js's own
  // `gA.safe = safe` precedent, same root cause).
  g.safe = stage.safe;
  return g;
}

// Categorical "demoted to grey" (§3.1: a number the follower can tween, not
// a class swap) — a live `color-mix` between the series' own token and
// k-gray, driven by `weight` (1 = full colour, 0 = grey). Native CSS
// feature, no colour-interpolation library needed (lean-code ladder rung 4).
function emphasisColor(hex, weight) {
  const w = Math.max(0, Math.min(100, Math.round(weight * 100)));
  return `color-mix(in oklab, ${hex} ${w}%, var(--k-gray) ${100 - w}%)`;
}

// `reveal` drives lineDraw's own stroke-dash reveal fraction; `opacity`
// fades the whole mark+label in independent of reveal (Core "fades in"
// fully drawn, Crawl/Headline draw progressively) — end-label opacity
// tracks `opacity * reveal` so a not-yet-revealed line shows no orphaned
// label (lineDraw's own end label is otherwise reveal-independent).
// S2-2 item 1 (Nik's ruling): all three of this scene's series carry their
// own name in the end label — the fix for "2.1 %"/"1.9 %" being
// indistinguishable bare numbers with no referent (defect 1).
function drawLine(stage, series, scales, reveal, emphasis, opacity, fmt) {
  const painted = { ...series, color: { hex: emphasisColor(series.color.hex, emphasis) } };
  const r = lineDraw(stage, painted, scales, reveal, { fmt, opacity, nameLabel: true });
  r.path.classed('mark', true);
  if (r.label) {
    const resolved = opacity * reveal;
    r.label.classed('label', true).attr('opacity', resolved);
    // S2-2-fix-b P1-1: a label whose resolved opacity is exactly 0 (Core/
    // Crawl for most of beat 0) must be `display:none`, not merely
    // `opacity:0` — declutterLabels/avoidPathCollisions/labelLeaders skip
    // display:none but NOT opacity:0 (S2-1 as-built note 6 exempts text
    // from the CHECKER this way, not from these primitives), so an
    // invisible label was still a real geometry obstacle the one visible
    // label kept dodging (fix-a round 3's teleporting-under-scrub defect).
    r.label.attr('display', resolved > 0 ? null : 'none');
  }
}

// S2-2 item 5. Names are pipeline-authoritative, NOT invented here —
// config/params.yaml:10-14 `phases:` is A's single source of truth for the
// boundaries `R/09_export_charts.R`'s `band_idx()` derives every SPEC's
// `bands` from (it skips `phase == 0`, so PHASE_LABELS[0] is the unshaded
// baseline region this scene's `bands` array never carries a rect for,
// and PHASE_LABELS[1..3] line up with `bands[0..2]` in date order).
// `bandsFromSpec`'s own `label` passthrough is a no-op today (no SPEC
// carries one yet) — this constant is the fallback until the R pipeline
// does.
const PHASE_LABELS = [
  'Peronist baseline', // config/params.yaml:10, phase 0 — band_idx() skips it (unshaded)
  'Crawling peg', // config/params.yaml:11, phase 1
  'IMF crawling band', // config/params.yaml:12, phase 2
  'Inflation-indexed band' // config/params.yaml:13, phase 3
];

// A silent mislabel here would put a false claim on a published chart — a
// loud build failure is correct if the pipeline's phases ever change
// (brief, item 5).
function assertPhaseMapping(bands) {
  if (bands.length !== PHASE_LABELS.length - 1) {
    throw new Error(
      `01-three-regimes: regime-bands count (${bands.length}) does not match PHASE_LABELS' ` +
        `non-baseline phase count (${PHASE_LABELS.length - 1}) — config/params.yaml's phases ` +
        'changed; update PHASE_LABELS to match.'
    );
  }
}

// S2-2-fix-b P1-4: `axisBoundaries` (below) already carries the rule "a
// band's `to` and the next band's `from` one month apart are the same
// transition, not a real gap" — reused here so the PAINTED rects agree
// with the axis's own boundary ticks. A band's right edge extends to the
// next band's `from` when they're one month apart (the seam this scene's
// data always has, since `config/params.yaml`'s phases are consecutive
// months); a genuine end (none today, but the arithmetic doesn't assume
// it) keeps its own `to`.
function effectiveBandTo(bands, i) {
  const band = bands[i];
  const next = bands[i + 1];
  if (next && monthsApart(band.to, next.from) === 1) return next.from;
  return band.to;
}

function drawBands(stage, x, safe, bands, opacity) {
  // `data-contiguous`: this scene's own declaration (fix-a rule 5's own
  // gate) that these bands are MEANT to abut — always set, since
  // `effectiveBandTo` above is what makes that actually true.
  const g = stage.selectAll('g.regime-bands').data([null]).join('g').attr('class', 'regime-bands').attr('data-contiguous', 'true');
  g.selectAll('rect.mark')
    .data(bands)
    .join('rect')
    .attr('class', 'mark')
    .attr('y', safe.y)
    .attr('height', safe.height)
    .attr('x', (d) => x(d.from))
    .attr('width', (d, i) => Math.max(0, x(effectiveBandTo(bands, i)) - x(d.from)))
    .attr('fill', 'color-mix(in oklab, var(--k-gray) 14%, var(--paper))')
    .attr('opacity', opacity);
}

// S2-2 item 5: label each region at its own top-left. Returns the
// surviving (fit) labels' own screen rects so item 3's mark-avoidance pass
// can treat them as obstacles for the end labels (brief: "so they cannot
// collide with … the marks").
function drawBandLabels(stage, x, safe, bands, opacity) {
  assertPhaseMapping(bands);
  const domain = x.domain();
  const regions = [
    { key: 'baseline', from: domain[0], to: bands[0].from, label: PHASE_LABELS[0] },
    { key: 'p1', from: bands[0].from, to: bands[0].to, label: bands[0].label || PHASE_LABELS[1] },
    { key: 'p2', from: bands[1].from, to: bands[1].to, label: bands[1].label || PHASE_LABELS[2] },
    { key: 'p3', from: bands[2].from, to: bands[2].to, label: bands[2].label || PHASE_LABELS[3] }
  ];
  // S2-2-fix-c: the wrapping `<g>` now also carries `opacity` (mirroring
  // the per-text opacity below, unchanged) — purely so the checker's own
  // `bandLabelDropped` rule (`tools/check-text-overlap.mjs`, reads
  // `getComputedStyle(g.regime-band-labels).opacity`, not the child
  // text's own) can see it; this scene has always set opacity per-TEXT,
  // never on the group, so that rule's own "hidden while the group is
  // still opaque = a real drop" test read this group as permanently
  // opaque regardless of the real (per-text) state — harmless before this
  // item (no text here was ever `display:none`), but the beat-0
  // `display:none` guard just below (this item, mirrors the zone-
  // annotation fix above) needs the group-level signal to read correctly
  // as "intentionally hidden," not "dropped." Zero visual effect — the
  // children already carry the real opacity value themselves.
  const g = stage
    .selectAll('g.regime-band-labels')
    .data([null])
    .join('g')
    .attr('class', 'regime-band-labels')
    .attr('opacity', opacity);
  const sel = g
    .selectAll('text.band-label')
    .data(regions, (d) => d.key)
    .join('text')
    .attr('class', 'label band-label')
    .attr('opacity', opacity)
    .text((d) => d.label);

  // S2-2-fix-b P1-3: fit-before-draw's failure branch is now "rotate", not
  // "hide" — every region gets its own name at every width (fix-a's
  // band-labels-dropped rule, target zero). Ladder: (1) horizontal at the
  // band's own top-left, as before, if it fits inside the band's width;
  // (2) otherwise rotate -90° along the band's own left edge — the same
  // device 02-confidence.js's own `.flag` labels already use (`drawFlags`'s
  // candidate cascade), so the two scenes share one grammar for "a name on
  // a vertical region"; (3) never drop — a region always has at least
  // `safe.height` of room for the rotated form, which no label here is
  // tall (long) enough to overflow.
  //
  // Deviation (S2-2-fix-c): fix-b's blanket top-anchoring assumed the
  // whole upper region stays empty for every region; measured false for
  // TWO of the four regions once beats 1-3 share Q11's [0,8] domain —
  // 'baseline' (2022, Headline touches 7.41/6.97%) and 'p1' (2023-04, Core
  // touches 8.4%, already past this domain's own top) both legitimately
  // send a series near/through the label's own top-anchored position
  // (measured: `path-text` hits on "Peronist baseline"/"Crawling peg" at
  // every width). A full bottom-anchor flip (tried first) fixes those two
  // but reopens a WORSE one: 'p2'/'p3' (the two later, top-anchor-safe
  // regions) sit where beat 0's own reveal-head end-label naturally tracks
  // late in its sweep (t≈0.6-1.0, low early-history values still low on
  // an [0,30] domain) — bottom-anchoring THOSE two regions collided with
  // that live readout instead (measured: `label-exiled`/`label-continuity`
  // regressions, 34→94 total failures). Per-region anchor below: only the
  // two regions with a measured top-anchor strike flip to bottom; the
  // other two keep fix-b's original top-anchor, since it already clears
  // them and flipping them is what caused the regression.
  const boxes = [];
  // S2-2-fix-c: bands only ever render at `bandsOpacity` > 0 on beats 1-3
  // (F0_FROM fixes it at 0 for the whole of beat 0, per this file's own
  // header note) — but this fixed-pixel position is BEAT-INDEPENDENT
  // (only `safe`, not `state.yDomainHi`, feeds it), so at beat 0 it still
  // computes the exact beats-1-3 position while beat 0 itself plots under
  // the [0,30] domain — real early-history excursions there (Headline
  // 7.41% in 2022-07, comfortably below beat-1-3's own domain top but
  // mapped to a much LOWER pixel row under [0,30]) can still cross this
  // invisible box (measured: "Peronist baseline" `path-text` hit, beat 0
  // only, 390 — the same "invisible-but-checker-visible" class as the
  // zone-annotation fix above, not a new failure mode). Same fix: once
  // `opacity` is the real, settled 0 (not a mid-fade fractional value —
  // beat 0's own bandsOpacity never leaves exactly 0 within that beat, so
  // this never flips mid-scrub), `display:none` drops it from
  // `collectTextRects` entirely and its own bbox collapses to 0×0 too, so
  // it stops being fed as a (needless — nothing is visible there to guard)
  // obstacle at the same moment.
  const hidden = opacity < 0.02;
  sel.each(function each(d) {
    // §3.1 idempotency trap (unchanged from before this item): a node the
    // PRIOR frame left rotated/transformed must have both `transform` AND
    // `display` cleared before re-measuring, or a stale state leaks into
    // this frame's own fit check.
    // S2-2-fix-c: bottom-anchor only the two regions measured colliding
    // top-anchored ('baseline', 'p1' — see comment above); 'p2'/'p3' keep
    // fix-b's original top position, which already clears them.
    const bottomAnchor = d.key === 'baseline' || d.key === 'p1';
    const topY = safe.y + 14;
    const bottomY = safe.y + safe.height - 6;
    this.removeAttribute('display');
    this.removeAttribute('transform');
    this.setAttribute('x', x(d.from) + 6);
    this.setAttribute('y', bottomAnchor ? bottomY : topY);
    this.setAttribute('text-anchor', 'start');
    const bandWidth = x(d.to) - x(d.from);
    const textWidth = typeof this.getComputedTextLength === 'function' ? this.getComputedTextLength() : 0;
    const fitsHorizontal = textWidth + 8 <= Math.max(0, bandWidth);
    if (!fitsHorizontal) {
      const px = x(d.from) + 14;
      const py = bottomAnchor ? bottomY : safe.y + 12;
      this.setAttribute('x', px);
      this.setAttribute('y', py);
      this.setAttribute('text-anchor', bottomAnchor ? 'start' : 'end');
      this.setAttribute('transform', `rotate(-90 ${px} ${py})`);
    }
    if (hidden) this.setAttribute('display', 'none');
    // Fed as an obstacle regardless of `opacity` — S2-1 as-built note 6:
    // the checker deliberately does NOT skip opacity:0 text, so an
    // invisible-but-present label is still a real collision the checker
    // will catch; this pass must protect against it too, not just the
    // visible case. Never dropped now, so always pushed (the `hidden`
    // branch above collapses its own box to 0×0 first, so this stays a
    // harmless no-op obstacle rather than a needed one).
    const r = this.getBoundingClientRect();
    boxes.push({ left: r.left, right: r.left + r.width, top: r.top, bottom: r.top + r.height });
  });
  return boxes;
}

// S2-2 item 4: anchor the annotation where its own words point — mid-2025
// — instead of the plot's left edge (defect 3, "points into empty paper").
const ZONE_ANNOT_DATE = Date.UTC(2025, 6, 1); // 2025-07-01, "since mid-2025"

// S2-2-fix-c: the annotation's own TOP anchor, in data units (was a fixed
// `y(3) - 16/20` pixel offset) — measured, not guessed: every series' own
// value from 2025-01 onward (the "current era" beats 1-3's [0,8] domain
// exists to make legible) tops out at 3.73 (Headline, Mar 2025); 4.5
// clears that with real margin under the new domain, where the OLD fixed
// pixel offset (correct under the single [0,30] domain, where 3.73 sat
// deep in the bottom ~12% of the stage) put the annotation's own text
// right on top of the now-much-more-spread-out lines instead (measured:
// `path-text` hits on all three series, every width). The leader still
// drops straight from this anchor to the zone's own top edge (brief).
const ZONE_ANNOT_ANCHOR_PCT = 4.5;

function drawZone(stage, x, y, opacity, bandP3Left) {
  // S2-2-fix-c: `x.range()` (not raw `safe.x`/`safe.width`) — the plot's own
  // left edge now sits inside `safe.x` (the new y-axis's own reserved
  // gutter, `buildScales`), and this background band is a property of the
  // PLOTTED time domain, not the whole stage; letting it bleed into the
  // axis gutter would sit a pale rect behind the tick labels for no reason.
  const [plotLeft, plotRight] = x.range();
  const annotX = x(new Date(ZONE_ANNOT_DATE));
  // S2-2-fix-c: at beat 0, `band23Opacity` is exactly 0 (F0_FROM, unchanging
  // through that whole beat's own scrub — it only tweens crossing INTO
  // beat 1) and beat 0 runs its own [0,30] linear `yDomainHi`, under which
  // `y(4.5)`/`y(3)`/`y(2)` land far lower on screen than beats 1-3's [0,8]
  // mapping of the same values — a position this element never actually
  // shows (opacity 0 the whole beat) but which the checker still measures
  // (S2-1 as-built note 6: it does not skip opacity:0 text), and which
  // real Headline/Core excursions elsewhere in 2022-2024 legitimately pass
  // through under that domain (measured: `path-text` hits at beat 0, 390).
  // `display:none` (not just opacity 0) removes it from the checker's
  // rect collection entirely (`collectTextRects`'s own documented
  // exclusion) while beats 1-3 keep the normal opacity fade-in — the
  // position keeps tweening continuously underneath (nothing here reads
  // `display` for layout), so nothing about the beat1 entrance changes.
  // S2-6b addendum: below `NAME_LABEL_MIN_WIDTH_PX` the lines' own real
  // values occupy the whole vertical swath this annotation would sit in
  // (S2-2-fix-c's own diagnosis, five measured rounds, no slot exists at
  // 390) — same breakpoint/matchMedia test `lineDraw` already uses to
  // suppress name labels at this width, applied here to suppress this
  // annotation too rather than keep tuning an offset with no clear space
  // to tune into.
  const narrow = typeof matchMedia === 'function' && !matchMedia(`(min-width: ${NAME_LABEL_MIN_WIDTH_PX}px)`).matches;
  const hidden = opacity < 0.02 || narrow;
  stage
    .selectAll('rect.zone')
    .data([null])
    .join('rect')
    .attr('class', 'mark zone')
    .attr('x', plotLeft)
    .attr('y', y(3))
    .attr('width', Math.max(0, plotRight - plotLeft))
    .attr('height', Math.max(0, y(2) - y(3)))
    .attr('fill', 'color-mix(in oklab, var(--oxblood) 14%, var(--paper))')
    .attr('opacity', opacity)
    .attr('display', hidden ? 'none' : null);
  // The leader always drops from the anchor straight down to the zone's
  // own top edge at that x — it stays vertical from its anchor even if the
  // text below is shifted to fit (brief).
  const annotTopY = y(ZONE_ANNOT_ANCHOR_PCT);
  stage
    .selectAll('line.zone-leader')
    .data([null])
    .join('line')
    .attr('class', 'leader zone-leader')
    .attr('x1', annotX)
    .attr('x2', annotX)
    .attr('y1', annotTopY)
    .attr('y2', y(3))
    .attr('opacity', opacity)
    .attr('display', hidden ? 'none' : null);
  const textSel = stage
    .selectAll('text.zone-annot')
    .data([null])
    .join('text')
    .attr('class', 'annot zone-annot')
    // S2-2-fix-c: -4 -> -16 — measured, 390: the text's own ascent (a 14px
    // font's rendered bbox reaches well above its baseline) meant the -4
    // offset left the box's own BOTTOM edge only ~1-4px above the anchor
    // line (`annotTopY`, `y(4.5)`), and at 390's own tighter layout that
    // sliver of the box's bottom dipped onto Headline/Core's real
    // Nov-2024-ish values (both near 2.4-2.7%, well clear of 4.5% in data
    // terms, but not in the text bbox's own few extra px). -16 keeps the
    // same anchor/leader (`annotTopY`, unchanged) and only lifts the
    // rendered text further above it.
    // S2-2-fix-c: STOPPING RULE — this offset has now been tuned across
    // multiple verify rounds (-4 -> -16 -> -24) without clearing the last
    // 4 failures (390-only, beats 2-3, `path-text` "Headline"/"Core"
    // strike "2-3 % since mid-2025"). Diagnosed, not guessed: Core/
    // Headline's own real values hover continuously between ~1.9-3.7% for
    // many months around mid-2025 (embedded RAW data), so the checker's
    // own "closest path point inside the box" keeps finding a NEW strike
    // point as the box moves — this is not a fixed point to dodge, it is
    // a whole swath of the frame's own vertical space the lines actually
    // occupy. Pushing the annotation higher instead runs into 'p3'
    // ("Inflation-indexed band", still top-anchored — see
    // `drawBandLabels`'s own header note) whose OWN rotated label spans
    // roughly y(8) down to y(5.4) at this width — leaving no vertical gap
    // between "where the band label ends" and "where the lines begin" for
    // a 14px-tall annotation to sit in cleanly at 390px specifically. -16
    // (kept, not -24 — both left the same 4 residual hits; -16 is the
    // smaller visual change) is this item's own best-effort; the honest,
    // reported-not-forced status per this brief's own stopping rule.
    .attr('y', annotTopY - 16)
    .attr('opacity', opacity)
    .attr('display', hidden ? 'none' : null)
    .text('2-3 % since mid-2025');
  // Fit-before-draw: on a narrow viewport mid-2025 can sit close enough to
  // the plot's own right edge that the text would overflow it — shift
  // inward (leftward) just enough to stay inside the plotted x-range, per
  // the brief.
  const node = textSel.node();
  const textWidth = node && typeof node.getComputedTextLength === 'function' ? node.getComputedTextLength() : 0;
  // S2-2-fix-c: also clamp the text's own RIGHT edge clear of band p3's
  // own rotated label ("Inflation-indexed band", `drawBandLabels`'s own
  // 'p3', still top-anchored — see that function's own header note) —
  // measured, 390: the plain `plotRight - textWidth` clamp above still let
  // this 127px-wide annotation's right edge run 17px into that label's own
  // 14px-wide column (`text-text` hit, both top-anchored near the same
  // y=119 start). `bandP3Left` (passed from `draw()`, the same `bands`
  // array `drawBandLabels` itself reads) minus a small clearance gives a
  // second, tighter upper bound; `Math.min` with the existing bound keeps
  // whichever is more restrictive, at any width.
  const rightBound = Number.isFinite(bandP3Left) ? Math.min(plotRight, bandP3Left - 10) : plotRight;
  const clampedX = Math.min(annotX, Math.max(plotLeft, rightBound - textWidth));
  textSel.attr('x', clampedX);
  // Return this annotation's own screen rect so it can be fed to
  // `avoidPathCollisions` as an obstacle for the named end labels — this
  // text moved OFF the plot's left edge (item 4) and now sits mid-chart,
  // exactly where Headline/Crawl's own end labels land. Returned
  // regardless of `opacity` (S2-1 as-built note 6: the checker doesn't
  // skip opacity:0 text either — an invisible-but-present zone-annot is
  // still a real collision to protect other labels against).
  if (node) {
    const r = node.getBoundingClientRect();
    return [{ left: r.left, right: r.left + r.width, top: r.top, bottom: r.top + r.height }];
  }
  return [];
}

// Direct label at the series' own maximum, fixed above the point — no
// candidate-cascade bbox search (§6.2 item 5's "no collision solver").
function drawMaxLabel(stage, x, y, opacity) {
  const cx = x(HEADLINE.x.values[HEADLINE_MAX.i]);
  const cy = y(HEADLINE_MAX.v);
  stage
    .selectAll('text.headline-max')
    .data([null])
    .join('text')
    .attr('class', 'label headline-max')
    .attr('x', cx)
    .attr('y', cy - 10)
    .attr('text-anchor', 'middle')
    .attr('opacity', opacity)
    .text(fmtPct(HEADLINE_MAX.v));
}

// §6.1 frame states — flat numeric, identical keys every beat (§3.1).
// S2-2-fix-c: `yDomainHi`/`yAxisOpacity` new. `yDomainHi` stays at
// `Y_DOMAIN_HI_SPIKE` through the whole of beat 0 (both `from` and `state`
// below carry the same value — nothing to tween DURING the scrub, since
// Q11 rules beat 0 keeps the full domain regardless of reveal progress);
// only the beat0->beat1 EASED retarget actually moves it, to
// `Y_DOMAIN_HI_PRESENT`, and that single state-number tween IS the axis
// morph (this file's own `buildScales` header note).
const F0_FROM = {
  headlineReveal: 0,
  headlineEmphasis: 1,
  bandsOpacity: 0,
  coreOpacity: 0,
  coreEmphasis: 1,
  band23Opacity: 0,
  crawlReveal: 0,
  maxLabelOpacity: 0,
  yDomainHi: Y_DOMAIN_HI_SPIKE,
  yAxisOpacity: 0
};

export default {
  id: '01-three-regimes',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  series: [
    { label: HEADLINE.label, x: HEADLINE.x, y: HEADLINE.y },
    { label: CORE.label, x: CORE.x, y: CORE.y },
    { label: CRAWL.label, x: CRAWL.x, y: CRAWL.y }
  ],
  beats: [
    // F0 (scrub, `from` required at i=0 — §3.1): the collapse is real,
    // headline draws left to right.
    {
      motion: 'scrub',
      caption: CAP.beats[0],
      from: F0_FROM,
      state: { ...F0_FROM, headlineReveal: 1 }
    },
    // F1 (eased): four regimes fade in behind the settled headline. Q11:
    // domain morphs [0,Y_DOMAIN_HI_SPIKE] -> [0,8] on THIS transition (the
    // one eased retarget away from F0's own settled state) — the spike
    // leaves the frame through the top edge here, and the y-axis fades in
    // alongside it.
    {
      motion: 'eased',
      caption: CAP.beats[1],
      state: { headlineReveal: 1, headlineEmphasis: 1, bandsOpacity: 1, coreOpacity: 0, coreEmphasis: 1, band23Opacity: 0, crawlReveal: 0, maxLabelOpacity: 1, yDomainHi: Y_DOMAIN_HI_PRESENT, yAxisOpacity: 1 }
    },
    // F2 (eased): core fades in, 2-3 % band highlighted.
    {
      motion: 'eased',
      caption: CAP.beats[2],
      state: { headlineReveal: 1, headlineEmphasis: 1, bandsOpacity: 1, coreOpacity: 1, coreEmphasis: 1, band23Opacity: 1, crawlReveal: 0, maxLabelOpacity: 1, yDomainHi: Y_DOMAIN_HI_PRESENT, yAxisOpacity: 1 }
    },
    // F3 (eased): crawl/band ceiling draws in; headline + core demoted.
    {
      motion: 'eased',
      caption: CAP.beats[3],
      state: { headlineReveal: 1, headlineEmphasis: 0, bandsOpacity: 1, coreOpacity: 1, coreEmphasis: 0, band23Opacity: 1, crawlReveal: 1, maxLabelOpacity: 1, yDomainHi: Y_DOMAIN_HI_PRESENT, yAxisOpacity: 1 }
    }
  ],
  draw(stage, state, ctx) {
    const { x, y } = buildScales(stage, ctx, state);
    drawAxis(stage, x, ctx);
    drawYAxis(stage, y, x.range()[0], state.yAxisOpacity);
    ensurePlotClip(stage, stage.safe);
    const bands = bandsFromSpec(ctx.specs[SPEC_ID]);
    drawBands(stage, x, stage.safe, bands, state.bandsOpacity);
    const bandLabelBoxes = drawBandLabels(stage, x, stage.safe, bands, state.bandsOpacity);
    const zoneBoxes = drawZone(stage, x, y, state.band23Opacity, x(bands[2].from));
    // S2-2-fix-c: the three lines + the max-label callout draw into the
    // CLIPPED group (`plotGroup`, this file's own header note) — everything
    // else (bands/band-labels/zone/axes) stays a direct child of `stage`,
    // unclipped, since none of them can exceed the domain top the way a
    // Dec-2023 print does.
    const plot = plotGroup(stage);
    drawLine(plot, HEADLINE, { x, y }, state.headlineReveal, state.headlineEmphasis, 1, fmtPct);
    drawLine(plot, CORE, { x, y }, 1, state.coreEmphasis, state.coreOpacity, fmtPct);
    drawLine(plot, CRAWL, { x, y }, state.crawlReveal, 1, 1, fmtPct);
    // Drawn BEFORE decluttering/mark-avoidance (unlike before this item) so
    // "25.5 %" is itself a candidate those passes can move — it was
    // measured struck by the Core line at every width (real defect, not in
    // the brief's own five, but the same class item 3 exists to fix).
    drawMaxLabel(plot, x, y, state.maxLabelOpacity);
    // S2-1: v1 scene 2's own `declutterLabels` call site (its own end-of-
    // line labels converge the same way when two series settle within a
    // point of each other) — this scene's three end labels can land this
    // close too (e.g. Headline 2.15 vs Core 1.9 at F3), and `draw` here
    // runs every frame (§3.1), so a fresh call each time is naturally
    // idempotent: `lineDraw` above already reset every label's own x/y
    // from data before this runs.
    declutterLabels(stage, undefined, undefined, stage.safe.y + stage.safe.height - 14, stage.safe.y);
    // S2-2 item 3: now resolve against the MARKS themselves (declutter
    // only ever knew about other labels) — same idempotency reasoning.
    // Band-top labels (item 5) and the zone annotation (item 4 moved it
    // off the plot's dead left edge into the middle of the chart, right
    // where the named end labels land) are fed in as extra obstacles.
    // `text.headline-max` is included here (not in `labelLeaders` below —
    // it carries no `data-anchor-x/y`, lineDraw's own labels only) so it
    // too can be nudged off a mark it would otherwise sit on.
    avoidPathCollisions(stage, {
      labelSelector: '.line-draw-label, text.headline-max',
      clampTop: stage.safe.y,
      clampBottom: stage.safe.y + stage.safe.height - 14,
      // S2-2-fix-c: the plot's own left edge (`x.range()[0]`), not raw
      // `stage.safe.x` — the new y-axis now owns the strip between them,
      // and a leftward dodge search must stop before it, not wander into
      // the axis's own tick text.
      safeLeft: x.range()[0],
      extraObstacles: [...bandLabelBoxes, ...zoneBoxes]
    });
    // S2-2 item 2: hairline back to the true anchor for any label decluter
    // or item 3 moved away from it. Must run last, after both.
    labelLeaders(stage, '.line-draw-label');
  }
};
