// story/scenes-v2/06-wall.js — S2-6b port of `story/scenes/06-wall.js`
// (CANVAS-design.md §2 row 6, "Can the wall be rolled?", fig15_dsa +
// story/data/dsa_grid.json) to engine v2 (METHOD-RESET.md §3.1, §3.4).
// `RAW`, `paint()`, `SPEC_ID`, `CAP` lookup, `interpRollover` and
// `readoutText` below are copied verbatim from that file (data + the Q2
// "grid lookup only, never recomputed" ruling — brief). The accessibility
// apparatus (`mountSegmentedControl`, `removeControls`, `moveFocus`,
// `setPressed`, `mountReadoutLive`, `syncBigToScenario`) is ported near-
// verbatim — "already fixed once under review" (brief) — retargeted onto
// the new `mount`/`unmount` scene lifecycle (item 1a) instead of v1's
// per-beat `enter()`/module-level `teardown()`. Everything else — the
// state schema, `draw()`, bar/axis/annotation placement — is new.
import { barsBuild, axisMorph } from '../../../../scrolly-kit/src/canvas/primitives/index.js';
import { seriesFromSpec } from '../../../../scrolly-kit/src/canvas/data/seriesFromSpec.js';
import captions from '../captions.json' with { type: 'json' };
import dsaGrid from '../data/dsa_grid.json' with { type: 'json' };

const SPEC_ID = 'fig15_dsa';
const CAP = captions.scenes.find((s) => s.id === '06-wall');

const RAW = {"labels":["2026","2027","2028"],"datasets":[{"label":"Full NIR build (100%)","key":"blue","data":[8,52,82]},{"label":"Half build (50%)","key":"amber","data":[61,105,132]},{"label":"No accumulation (0%)","key":"crimson","data":[115,159,182]}]};

// A8-register-b gap 3 (§D.3/§1.5 one-accent rule): captions.json names NO
// series in this scene at all — one colour (`--k-gray`, the grammar's
// default for "everything else"); the on-bar labels are already the
// legend-killing identity substitute.
function paint(label, hex, token) {
  const s = seriesFromSpec(RAW, label);
  s.color = { hex, token };
  return s;
}
const FULL = paint('Full NIR build (100%)', 'var(--k-gray)', 'k-gray');
const HALF = paint('Half build (50%)', 'var(--k-gray)', 'k-gray');
const NONE = paint('No accumulation (0%)', 'var(--k-gray)', 'k-gray');
const SCENARIOS = [FULL, HALF, NONE];
const YEARS = FULL.x.values;
// A8-register-h item 6: "NIR" prefix so these read as the scenario's NAME,
// never as a value that could be mistaken for the ceiling or a bar's own
// reading.
const SCENARIO_LABELS = ['NIR 100 %', 'NIR 50 %', 'NIR 0 %'];

// Linear interpolation of dsa_grid's own grid, between whichever pair of
// its three known accumulation fractions (1, 0.5, 0) bracket `frac`. Q2's
// ruling: grid lookup only, never recomputed.
function interpRollover(yearIdx, frac) {
  const row = dsaGrid.rollover_req[yearIdx]; // [full, half, none] — fractions (0.825 == 82.5 %)
  if (frac >= 0.5) {
    const localT = (frac - 0.5) / 0.5;
    return (row[1] + (row[0] - row[1]) * localT) * 100;
  }
  const localT = frac / 0.5;
  return (row[2] + (row[1] - row[2]) * localT) * 100;
}

// A7-fix4 P2 (A8 v3 §3): feeds only the aria-live announcement — the
// visual mat this wrapped for is deleted. Compact wording at the mobile
// breakpoint vs. the full sentence on desktop.
function readoutText(year, pct) {
  const feasible = pct <= 100;
  if (matchMedia('(max-width: 860px)').matches) {
    const verdict = feasible ? 'Feasible.' : 'Infeasible.';
    return `${year}: ${pct.toFixed(1)} % — ${verdict}`;
  }
  const verdict = feasible ? CAP.verdicts.feasible : CAP.verdicts.infeasible;
  return CAP.readout.replace('{year}', year).replace('{pct}', pct.toFixed(1)).replace('{verdict}', verdict);
}

// §3.1: emphasisColor-style numeric emphasis (01-three-regimes.js's own
// `emphasisColor`, same technique, scene-local copy) — a categorical
// colour switch (full-build highlighted vs not) expressed as a tweenable
// 0..1 weight rather than a hard branch.
function emphasisColor(hex, weight) {
  const w = Math.max(0, Math.min(100, Math.round(weight * 100)));
  return `color-mix(in oklab, ${hex} ${w}%, var(--k-gray) ${100 - w}%)`;
}

// Reserved headroom for the dashed ceiling/its label (mirrors
// 05-reserves.js's own `TOP_GUTTER_PX` — measured: the "0 %" scenario
// reaches 182 by 2028, well past the 100 % ceiling, and dsa_grid's own
// worst case (0 % accumulation, 2028) is the same order of magnitude —
// `Math.max(100, …)` in `buildScales` already keeps 100 % off the very
// top edge, so no extra reserve is needed beyond the axis's own gutter).
function buildScales(stage, ctx) {
  const gridMax = Math.max(...dsaGrid.rollover_req.flat()) * 100;
  const maxVal = Math.max(...SCENARIOS.flatMap((s) => s.y), gridMax);
  const x = ctx.d3.scale.scaleBand().domain(YEARS).range([stage.safe.x, stage.safe.x + stage.safe.width]).padding(0.35);
  const y = ctx.d3.scale
    .scaleLinear()
    .domain([0, Math.max(100, maxVal)])
    .nice()
    .range([stage.safe.y + stage.safe.height, stage.safe.y]);
  return { x, y };
}

// §3.1 idempotency (same reasoning as 05-reserves.js's own `drawAxis`).
function drawAxis(stage, x) {
  stage.select('g.axis').remove();
  const g = stage.append('g').attr('class', 'axis').attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(g, x, x, 1, { ticks: x.domain() });
}

// The dashed 100 % ceiling ("more than the entire stock of maturing
// debt") — authored, not a SPEC series, typographic per §1.5.
function drawCeiling(stage, safe, y) {
  stage
    .selectAll('line.ceiling')
    .data([null])
    .join('line')
    .attr('class', 'leader ceiling')
    .attr('x1', safe.x)
    .attr('x2', safe.x + safe.width)
    .attr('y1', y(100))
    .attr('y2', y(100))
    .attr('stroke-dasharray', '4 4');
  stage
    .selectAll('text.ceiling-label')
    .data([null])
    .join('text')
    .attr('class', 'annot ceiling-label')
    .attr('x', safe.x + 4)
    .attr('y', y(100) - 4)
    .text('100 % — entire stock of maturing debt');
}

// The three modelled scenario columns (v1's overviewBeat/emphasisBeat,
// unified: `barsGrow` grows them in once and never un-grows — v1 never
// shrinks them either — `groupedOpacity` is the SEPARATE cross-fade
// number that hides the whole group once the scrub takes over,
// `emphasisFrac` drives the full-build column's colour switch).
function drawScenarioBars(stage, x, y, barsGrow, groupedOpacity, emphasisFrac) {
  const rects = barsBuild(stage, SCENARIOS, { x, y }, barsGrow, { stack: false }).classed('mark', true);
  rects
    .attr('fill', (d) => (d.label === FULL.label ? emphasisColor('var(--oxblood)', emphasisFrac) : 'var(--k-gray)'))
    .attr('opacity', groupedOpacity)
    .attr('display', groupedOpacity > 0.02 ? null : 'none');
  const clampedT = Math.max(0, Math.min(1, barsGrow));
  const bw = x.bandwidth() / SCENARIOS.length;
  stage
    .selectAll('text.scenario-label')
    .data(clampedT > 0 ? SCENARIOS : [], (d) => d.label)
    .join('text')
    .attr('class', 'label scenario-label')
    .attr('x', (d, i) => x(YEARS[0]) + SCENARIOS.indexOf(d) * bw + bw / 2)
    .attr('y', (d) => y(d.y[0] * clampedT) - 6)
    .attr('text-anchor', 'middle')
    .attr('fill', (d) => (d.label === FULL.label ? emphasisColor('var(--oxblood)', emphasisFrac) : 'var(--ink-soft)'))
    .attr('opacity', groupedOpacity)
    .attr('display', groupedOpacity > 0.02 ? null : 'none')
    .text((d) => SCENARIO_LABELS[SCENARIOS.indexOf(d)]);
  // b2's own callout ("82.5 % by 2028 — rollable") — opacity tracks
  // `emphasisFrac` (only meaningful once the full-build column is
  // highlighted) AND `groupedOpacity` (gone once the scrub takes over).
  stage
    .selectAll('text.rollable-callout')
    .data([null])
    .join('text')
    .attr('class', 'annot rollable-callout')
    .attr('x', x('2028') + x.bandwidth() / 2)
    .attr('y', y(FULL.y[2]) - 20)
    .attr('text-anchor', 'middle')
    .attr('opacity', emphasisFrac * groupedOpacity)
    .attr('display', emphasisFrac * groupedOpacity > 0.02 ? null : 'none')
    .text(`${FULL.y[2]} % by 2028 — rollable`);
}

// The continuously-blended single-column "wall" view (v1's `scrubBeat`
// own `render()` bars) — driven by `rolloverFrac` (dsa_grid interpolation,
// Q2 grid-lookup-only) and cross-faded in via `wallOpacity` as
// `drawScenarioBars`' own `groupedOpacity` fades out (same scrub gesture
// drives both, F2's own `state`/`from`). Distinct series label ('Wall')
// so `barsBuild`'s own self-scoped `.filter` (A8-register-e item 4) never
// touches the grouped bars this same stage also draws.
function drawWallBars(stage, x, y, frac, wallOpacity) {
  const bars = YEARS.map((year, i) => ({ year, pct: interpRollover(i, frac) }));
  const wallSeries = { label: 'Wall', color: { hex: 'var(--oxblood)' }, x: { values: YEARS }, y: bars.map((d) => d.pct) };
  const rects = barsBuild(stage, [wallSeries], { x, y }, 1, { stack: false }).classed('mark wall-bar', true);
  rects.attr('opacity', wallOpacity).attr('display', wallOpacity > 0.02 ? null : 'none');
  stage
    .selectAll('text.wall-bar-label')
    .data(wallOpacity > 0.02 ? bars : [], (d) => d.year)
    .join('text')
    .attr('class', 'label wall-bar-label')
    .attr('x', (d) => x(d.year) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.pct) - 6)
    .attr('text-anchor', 'middle')
    .attr('opacity', wallOpacity)
    .text((d) => `${d.pct.toFixed(1)} %`);
  stage
    .selectAll('text.wall-caption')
    .data([null])
    .join('text')
    .attr('class', 'annot wall-caption')
    .attr('x', stage.safe.x)
    .attr('y', stage.safe.y + 14)
    .attr('opacity', wallOpacity)
    .attr('display', wallOpacity > 0.02 ? null : 'none')
    .text('Three modelled scenarios, linear between them');
  return bars;
}

// A8-register-d item 5 / A8-register-h item 2a (ported verbatim — the
// generic engine's own `setActiveBig` toggles `.big.is-active` for this
// scene's LAST beat's whole dwell unconditionally, on ENTRY only; this
// scene-local override, called every `draw` frame, is the one place that
// ever decides whether the big matches what is ACTUALLY on screen this
// frame). Exact match for the discrete control press; `0.05` numeric
// tolerance for the continuous scrub's own floating-point progress
// (display-rounding-equivalent to the old `toFixed(1) === '114.7 %'`
// string check it replaced).
function syncBigToScenario(stage, pct2026) {
  const big = stage.beatEl?.closest('.scene')?.querySelector(':scope > .big');
  if (!big) return;
  big.classList.toggle('is-active', Math.abs(pct2026 - 114.7) < 0.05);
}

// --- Accessibility apparatus (item 2's own list) — ported near-verbatim,
// retargeted onto mount()/unmount() (item 1a) instead of v1's per-beat
// enter()/module teardown(). ---------------------------------------------

const SEGMENTED_CONTROL_ID = 'wall-segmented-control';
const SEGMENTS = [
  { label: '100 %', frac: 1 },
  { label: '50 %', frac: 0.5 },
  { label: '0 %', frac: 0 }
];
const READOUT_LIVE_ID = 'wall-readout-live';

function removeControls() {
  document.getElementById(SEGMENTED_CONTROL_ID)?.remove();
  document.getElementById(READOUT_LIVE_ID)?.remove();
}

// A8-register-e item 6 (WAI-ARIA roving-tabindex toolbar pattern): one Tab
// stop for the whole group, arrow keys move the roving `tabindex`.
function moveFocus(group, delta) {
  const buttons = Array.from(group.querySelectorAll('button'));
  const from = buttons.indexOf(document.activeElement);
  if (from === -1) return;
  const to = (from + delta + buttons.length) % buttons.length;
  buttons.forEach((b, i) => {
    b.tabIndex = i === to ? 0 : -1;
  });
  buttons[to].focus();
}

function mountSegmentedControl(sceneEl, onSelect) {
  document.getElementById(SEGMENTED_CONTROL_ID)?.remove();
  const group = document.createElement('div');
  group.id = SEGMENTED_CONTROL_ID;
  group.className = 'segmented-control';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Jump to a reserve-accumulation scenario');
  const label = document.createElement('span');
  label.className = 'segmented-control__label';
  label.setAttribute('aria-hidden', 'true');
  label.textContent = 'Reserve build:';
  group.appendChild(label);
  SEGMENTS.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = opt.label;
    btn.dataset.frac = String(opt.frac);
    btn.setAttribute('aria-pressed', opt.frac === 1 ? 'true' : 'false');
    btn.tabIndex = opt.frac === 1 ? 0 : -1;
    btn.addEventListener('click', () => onSelect(opt.frac));
    group.appendChild(btn);
  });
  group.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(group, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(group, -1);
    }
  });
  const beats = sceneEl.querySelector('.beats');
  if (beats) beats.insertAdjacentElement('afterend', group);
  else sceneEl.appendChild(group);
  return group;
}

// A7-fix P1: `setPressed` is the single place that toggles `aria-pressed`
// (+ the roving `tabIndex`, A8-register-e item 6) so a continuous scrub
// (whose `frac` almost never equals exactly 1/0.5/0) never resets every
// button's `tabIndex` to -1 and removes the group's only Tab stop.
function setPressed(frac) {
  const buttons = Array.from(document.querySelectorAll(`#${SEGMENTED_CONTROL_ID} button`));
  const anyExactMatch = buttons.some((btn) => Number(btn.dataset.frac) === frac);
  buttons.forEach((btn) => {
    const isPressed = Number(btn.dataset.frac) === frac;
    btn.setAttribute('aria-pressed', String(isPressed));
    if (anyExactMatch) btn.tabIndex = isPressed ? 0 : -1;
  });
}

// A7-fix3 P1-3 / A7-fix4: `role="status"` + `aria-live="polite"` on a
// visually-hidden node — the stage `<svg>` is `aria-hidden`, so this is
// the only thing on the page that announces the control's result.
function mountReadoutLive(afterEl) {
  const el = document.createElement('div');
  el.id = READOUT_LIVE_ID;
  el.className = 'sr-only-live';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  afterEl.insertAdjacentElement('afterend', el);
  return el;
}

// Mutable, scene-instance state — item 1a: `mount`/`unmount` are called
// once per scene visit (not once per beat, unlike v1), so this module-
// level state (the live region node + the last announced signature, S2-6b
// simplification of v1's own `discrete`-flag re-announce: every real
// feasibility change still announces, a click re-pressing an
// already-current segment simply doesn't force a duplicate announcement —
// a minor nicety loss, not a contract change) lives at the same scope
// `ISRAEL`/`BRAZIL`-style module constants do, safe because there is only
// ever one instance of this scene on the page.
let liveEl = null;
let lastSignature = '';

// S2-crit-fix P1-1: a click must LATCH the scenario — the critique's own
// measurement (scrolling 40px after a click reverted the bars) is
// `onStepProgress` (engine2/index.js, out of this scene's fence)
// unconditionally recomputing the scrub target from raw scroll progress
// on every scroll tick within the beat, which always wins over a click's
// own `ctx.setState` the instant the reader scrolls again — engine
// behaviour this scene cannot change from inside its own fence. What the
// scene DOES own is `draw()`'s own reading of `state.rolloverFrac` — a
// module-level latch here overrides which value `draw()` actually RENDERS
// (bars, aria-pressed, the live readout, `.big`) without needing the
// engine's own displayed state to agree. `stage.beatEl` (buildStage,
// engine2/index.js) is refreshed every draw call to the CURRENTLY active
// `.beat` element, and `.beat` already carries `data-motion` (the same
// attribute `isLastScrubBeat` reads) — so "the reader has left the beat"
// is detectable as "the active beat is no longer the scrub one" with no
// beat-index hardcoding and no engine change: the moment scroll carries
// the reader onto an eased beat (forward into the close, or back into F0/
// F1), the latch clears and normal scroll-driven rendering resumes.
let latchedFrac = null;

// §6.1 frame states — flat numeric, identical keys every beat (§3.1).
// `barsGrow` grows the grouped columns in once and never un-grows;
// `groupedOpacity`/`wallOpacity` cross-fade between the grouped-comparison
// view and the single continuously-blended "wall" view; `rolloverFrac` is
// the scrub-hand-driven dsa_grid fraction (1 = 100 % accumulation, F2's
// own start point — inherited as `from` from F1's settled state, §3.1: a
// `from` override is only required at beat index 0).
const F0_FROM = { barsGrow: 0, groupedOpacity: 1, emphasisFrac: 0, wallOpacity: 0, rolloverFrac: 1 };

export default {
  id: '06-wall',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  data: (ctx) => ctx.specs[SPEC_ID],
  series: SCENARIOS.map((s) => ({ label: s.label, x: s.x, y: s.y })),
  beats: [
    // F0 (eased, `from` required at i=0): the three modelled scenarios
    // draw in together, unemphasised.
    {
      motion: 'eased',
      caption: CAP.beats[0],
      from: F0_FROM,
      state: { barsGrow: 1, groupedOpacity: 1, emphasisFrac: 0, wallOpacity: 0, rolloverFrac: 1 }
    },
    // F1 (eased): settled; full-build column highlighted, callout fades in.
    {
      motion: 'eased',
      caption: CAP.beats[1],
      state: { barsGrow: 1, groupedOpacity: 1, emphasisFrac: 1, wallOpacity: 0, rolloverFrac: 1 }
    },
    // F2 (scrub): cross-fades from the grouped comparison into the single
    // blended "wall" bar as the hand scrubs `rolloverFrac` 1 -> 0 — the
    // METHOD-RESET §3.4 "Last scrub beat of a scene (cause 4)" fix
    // (`SCRUB_TAIL_BUFFER_PX`/progress remap) is engine-owned
    // (`engine2/index.js`), not scene-local — v1's own `LOCAL_T_CAP`/
    // `SCRUB_TAIL_BUFFER_PX` hack is NOT ported; this is exactly the shape
    // that fix was built for.
    {
      motion: 'scrub',
      caption: CAP.beats[2],
      state: { barsGrow: 1, groupedOpacity: 0, emphasisFrac: 1, wallOpacity: 1, rolloverFrac: 0 }
    }
  ],
  // Item 1a: mounted once when this scene's root is created, before its
  // first `draw`. `stage.beatEl` at mount time is the incoming scene's own
  // entry beat's `.beat` element (engine2/index.js's own `changeSceneRoot`
  // passes the correct incoming `beatIndex`, not the stale outgoing one).
  mount(stage, ctx) {
    const sceneEl = stage.beatEl?.closest('.scene');
    if (!sceneEl) return;
    lastSignature = '';
    latchedFrac = null;
    const group = mountSegmentedControl(sceneEl, (frac) => {
      // Item 1b: click-driven state — merged into the follower's current
      // target outside the frame index, `TAU_EASE_MS` (engine2/index.js's
      // own `pushState`). Also switches the visualization to the "wall"
      // view (cross-fading the grouped comparison out) if a click lands
      // while beat 0/1's own grouped view is still showing — the next
      // real scroll-driven beat entry still fully overwrites all of this
      // (S2-6b brief item 1b: "the next scroll-driven beat entry must
      // still win").
      ctx.setState({ rolloverFrac: frac, wallOpacity: 1, groupedOpacity: 0 });
      // S2-crit-fix P1-1: the LATCH itself — `draw()` below renders from
      // this, not from `state.rolloverFrac`, for as long as the reader
      // stays on the scrub beat. `ctx.setState` above still runs (keeps
      // the engine's own follower target roughly in sync so a re-mount
      // or the NEXT real scroll-driven beat entry — which fully overwrites
      // the follower target regardless, item 1b's own "still wins" rule —
      // isn't starting from a stale value), but it is no longer what
      // holds the choice: a further scroll within this same beat would
      // otherwise recompute and overwrite that target on its own next
      // tick (the critique's own measured defect), which the latch below
      // is immune to.
      latchedFrac = frac;
    });
    liveEl = mountReadoutLive(group);
  },
  unmount() {
    removeControls();
    liveEl = null;
    latchedFrac = null;
  },
  draw(stage, state, ctx) {
    const safe = stage.safe;
    const { x, y } = buildScales(stage, ctx);
    drawAxis(stage, x);

    // S2-crit-fix P1-1: "suspend scrub-driven state until the reader
    // leaves the beat" (brief) — `stage.beatEl` (buildStage,
    // engine2/index.js, out of this scene's fence) is refreshed every
    // draw call to the CURRENTLY active `.beat`, which already carries
    // `data-motion` (the engine's own `isLastScrubBeat` reads the same
    // attribute) — "left the beat" is "the active beat is no longer the
    // scrub one," with no beat-index hardcoding and no engine change.
    // Leaving clears the latch so scroll-driven rendering resumes the
    // instant the reader is back on an eased beat (forward into the
    // close, or back into F0/F1).
    const beatMotion = stage.beatEl?.dataset.motion;
    if (beatMotion !== 'scrub') latchedFrac = null;
    const rendered =
      latchedFrac !== null && beatMotion === 'scrub'
        ? { barsGrow: state.barsGrow, groupedOpacity: 0, emphasisFrac: state.emphasisFrac, wallOpacity: 1, rolloverFrac: latchedFrac }
        : state;

    drawScenarioBars(stage, x, y, rendered.barsGrow, rendered.groupedOpacity, rendered.emphasisFrac);
    const bars = drawWallBars(stage, x, y, rendered.rolloverFrac, rendered.wallOpacity);
    // S2-crit-fix P1-2: `drawCeiling` (the dashed 100% line + "100 % —
    // entire stock of maturing debt" annotation, the reference the whole
    // scene argues against) now runs LAST, after both bar layers — SVG
    // paints later DOM siblings on top, and `.join()` only appends a new
    // node to its parent on first creation (this scene's stage root is
    // fresh per scene entry, so this call order fixes the DOM order, and
    // therefore the z-order, for the scene's whole lifetime — every later
    // `draw()` call only updates existing nodes' attrs in place). Was
    // called first, painting UNDER both bar layers — at 1440 the string
    // read as "100 % — entire" (the rest occluded by a bar); at 390 it
    // read as three disconnected fragments where the bars crossed it.
    // Keeping the LINE and the LABEL together (not label-only) is
    // deliberate too: a ceiling a bar has grown past should stay visible
    // exactly where it crosses, not just its caption.
    drawCeiling(stage, safe, y);

    // S2-crit-fix-2 P2 (critique 2026-09-04T23-07-04Z, "Scene 06's NIR
    // labels"): `drawScenarioBars`' own `text.scenario-label` nodes
    // (`SCENARIO_LABELS` — "NIR 100 %"/"NIR 50 %"/"NIR 0 %") are appended
    // BEFORE `drawWallBars`' own bars, in DOM order — same P1-2 z-order
    // bug `drawCeiling` above was moved to fix, one layer down: mid-scrub
    // (`groupedOpacity` and `wallOpacity` both non-zero while the hand
    // cross-fades from the grouped comparison into the single wall bar,
    // §D "linear between them") the wall bars paint OVER the still-visible
    // scenario labels. `.raise()`s every frame, same discipline
    // `03-treasury.js`'s own end-of-`draw()` re-raises use (`.join()` only
    // appends a brand-new node at the end of its parent; an EXISTING
    // node's DOM position is untouched by any other selection's `.raise()`
    // call after it — the very first frame's DOM order otherwise wins for
    // the scene's whole lifetime) — raised after `drawCeiling`, in the
    // same z-order-fix pass, so the scenario labels win the top of the
    // paint order over both bar layers AND the ceiling regardless of which
    // beat or scrub position drew them.
    stage.selectAll('text.scenario-label').raise();

    // setPressed/aria-live/`.big` sync all read the CURRENT frame's own
    // (possibly latched) values — every real scroll tick and every click
    // both flow through here, exactly once per `draw` call (§3.1).
    setPressed(rendered.rolloverFrac);
    syncBigToScenario(stage, bars[0].pct);
    if (liveEl) {
      const combined = bars.map((d) => readoutText(d.year, d.pct)).join('  ');
      const signature = bars.map((d) => (d.pct <= 100 ? 'F' : 'I')).join('');
      if (signature !== lastSignature) {
        liveEl.textContent = combined;
        lastSignature = signature;
      }
    }
  }
};
