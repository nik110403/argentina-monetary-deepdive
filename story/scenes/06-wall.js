// story/scenes/06-wall.js — CANVAS-design.md §2 row 6 "Can the wall be
// rolled?" (A5b). Beats 1-2 draw fig15_dsa's own three static scenario
// columns (grouped bars, `RAW` below); beat 3 scrubs the continuous
// reserve-accumulation fraction 100% -> 0%, reading the required
// rollover rate straight off `story/data/dsa_grid.json` and interpolating
// it LINEARLY between the grid's three known points (100/50/0%) — never
// recomputed, only interpolated, same "grid lookup only" discipline the
// retired Chart.js widget (`story/widgets/nir-scenarios.js`) used.
// Orientation pin (CANVAS-design.md §2): `dsa_grid.rollover_req` is
// `[year][scenario]`, scenario order matching `dsa_grid.scenarios`
// `[1, 0.5, 0]` (100% / 50% / 0%) — NOT `fig15`'s own `[scenario][year]`
// dataset layout. The segmented control the widget offered (jump straight
// to one scenario) is ported here as a secondary affordance alongside the
// scrub, per the brief.
import { barsBuild, axisMorph } from '../../../../scrolly-kit/src/canvas/primitives/index.js';
import { seriesFromSpec } from '../../../../scrolly-kit/src/canvas/data/seriesFromSpec.js';
import captions from '../captions.json' with { type: 'json' };
import dsaGrid from '../data/dsa_grid.json' with { type: 'json' };

const SPEC_ID = 'fig15_dsa';
const CAP = captions.scenes.find((s) => s.id === '06-wall');

const RAW = {"labels":["2026","2027","2028"],"datasets":[{"label":"Full NIR build (100%)","key":"blue","data":[8,52,82]},{"label":"Half build (50%)","key":"amber","data":[61,105,132]},{"label":"No accumulation (0%)","key":"crimson","data":[115,159,182]}]};

// A8-register-b gap 3 (§D.3/§1.5 one-accent rule): captions.json names NO
// series in this scene at all (checked directly — 06-wall's own `beats`/
// `alt` carry zero `.k` spans), which is the grammar's OTHER branch, not
// the "≥2 series named, each gets its own k-*" exception the previous
// three-hue mapping (blue/amber/purple) was reasoning from. Without a
// caption naming them, the three static columns get ONE colour
// (`--k-gray`, the grammar's default for "everything else") — their own
// on-bar labels ("100 %"/"50 %"/"0 %", `overviewBeat`/`emphasisBeat`
// below) are already the legend-killing identity substitute the grammar
// specifies, and `emphasisBeat`'s existing opacity split (1 vs 0.32)
// still differentiates the highlighted column without a second hue. The
// scrub beat's own bars (`scrubBeat`'s `render()`, below) already use
// this exact one-accent pattern (`var(--oxblood)`, matching `.big`) —
// this brings the two static beats into line with it.
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
// A8-register-h item 6 (critique §6): the on-bar scenario labels used to
// read bare "100 %"/"50 %"/"0 %" — the SAME strings a reader sees within
// 200px on the dashed "100 % — entire stock of maturing debt" reference
// rule (a rollover ratio) and on the bars' OWN value labels (`scrubBeat`'s
// `wall-bar-label`, a DIFFERENT number). Prefixed with "NIR" (the
// segmented control's own subject, `mountSegmentedControl`'s "Reserve
// build:" label) so these read as the scenario's NAME, never as a value
// that could be mistaken for the ceiling or a bar's own reading.
const SCENARIO_LABELS = ['NIR 100 %', 'NIR 50 %', 'NIR 0 %'];

// Linear interpolation of dsa_grid's own grid, between whichever pair of
// its three known accumulation fractions (1, 0.5, 0) bracket `frac`.
function interpRollover(yearIdx, frac) {
  const row = dsaGrid.rollover_req[yearIdx]; // [full, half, none] — fractions (0.825 == 82.5 %)
  // dsa_grid.json stores fractions, not percent (`_src`: "0.825 -> 82.5 %;
  // 1.1467 -> 114.7 %"); the percent scale/readout/big-number all expect
  // percent, so scale at this one interpolation boundary (A7-fix P0-1).
  if (frac >= 0.5) {
    const localT = (frac - 0.5) / 0.5;
    return (row[1] + (row[0] - row[1]) * localT) * 100;
  }
  const localT = frac / 0.5;
  return (row[2] + (row[1] - row[2]) * localT) * 100;
}

// A7-fix4 P2 (A8: now feeds only the aria-live announcement, v3 §3 —
// the visual mat this wrapped for is deleted): same numbers, same
// feasible/infeasible verdict, compact wording at the mobile breakpoint
// vs. the full sentence on desktop — kept distinct since a screen-reader
// announcement benefits from the same brevity the old visual wrap did.
function readoutText(year, pct) {
  const feasible = pct <= 100;
  if (matchMedia('(max-width: 860px)').matches) {
    const verdict = feasible ? 'Feasible.' : 'Infeasible.';
    return `${year}: ${pct.toFixed(1)} % — ${verdict}`;
  }
  const verdict = feasible ? CAP.verdicts.feasible : CAP.verdicts.infeasible;
  return CAP.readout.replace('{year}', year).replace('{pct}', pct.toFixed(1)).replace('{verdict}', verdict);
}

function buildScales(stage, ctx) {
  const maxVal = Math.max(...SCENARIOS.flatMap((s) => s.y), 182.5);
  const x = ctx.d3.scale
    .scaleBand()
    .domain(YEARS)
    .range([stage.safe.x, stage.safe.x + stage.safe.width])
    .padding(0.35);
  const y = ctx.d3.scale
    .scaleLinear()
    .domain([0, Math.max(100, maxVal)])
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

// The dashed 100% ceiling ("more than the entire stock of maturing debt")
// — authored, not a SPEC series, typographic per §1.5.
function drawCeiling(stage, safe, y) {
  stage
    .append('line')
    .attr('class', 'mark leader')
    .attr('x1', safe.x)
    .attr('x2', safe.x + safe.width)
    .attr('y1', y(100))
    .attr('y2', y(100))
    .attr('stroke-dasharray', '4 4');
  stage
    .append('text')
    .attr('class', 'annot')
    .attr('x', safe.x + 4)
    .attr('y', y(100) - 4)
    .text('100 % — entire stock of maturing debt');
}

// b1 (eased, CAP.beats[0]): the three modelled scenarios draw in together,
// each bar's own on-bar label naming its scenario (no legend).
function overviewBeat() {
  let x;
  let y;
  let safe;
  return {
    motion: 'eased',
    caption: CAP.beats[0],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      removeControls();
      safe = stage.safe;
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawCeiling(stage, safe, y);
    },
    update(stage, t) {
      const rects = barsBuild(stage, SCENARIOS, { x, y }, t, { stack: false });
      rects.classed('mark', true);
      // A8-register-f item 8 (closes critique's series-label-count
      // residual, the same `overviewBeat` bug 2e already fixed for
      // 05-reserves.js's `labelBars`): gating the label on `t >= 1` means
      // any sample taken before the tween's rAF loop lands on the EXACT
      // final frame sees zero labels, even though a bar is already
      // visibly there. Present whenever its bar is (`t > 0`), y tracking
      // the bar's own current tweened top (`d.y[0] * clampedT`, the same
      // formula `barsBuild` itself uses for `y1`) while the text stays
      // the final scenario name — never painted above empty space.
      if (t > 0) {
        const clampedT = Math.max(0, Math.min(1, t));
        const bw = x.bandwidth() / SCENARIOS.length;
        stage
          .selectAll('text.scenario-label')
          .data(SCENARIOS)
          .join('text')
          .attr('class', 'label scenario-label')
          .attr('x', (d, i) => x(YEARS[0]) + i * bw + bw / 2)
          .attr('y', (d) => y(d.y[0] * clampedT) - 6)
          .attr('text-anchor', 'middle')
          .text((d, i) => SCENARIO_LABELS[i]);
      }
    }
  };
}

// b2 (eased, CAP.beats[1]): settled, the full-accumulation (100%) columns
// stay full opacity, the other two dim — "on the full reserve path the
// wall is rollable" — with the 2028 endpoint value called out.
function emphasisBeat() {
  let x;
  let y;
  let safe;
  return {
    motion: 'eased',
    caption: CAP.beats[1],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      removeControls();
      safe = stage.safe;
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawCeiling(stage, safe, y);
      const rects = barsBuild(stage, SCENARIOS, { x, y }, 1, { stack: false });
      // A8-register-h item 6 (critique §6, "same .32 composite"): an
      // `opacity` attribute silently drops whatever contrast the fill's
      // own colour declares (site DESIGN.md §6). Two solid colours
      // instead — the highlighted (full-build) column in `--oxblood`
      // (this scene's one accent, matching `.big`/`scrubBeat`'s own
      // bars, §1.5), the other two in plain `--k-gray` at full opacity —
      // still visually differentiates "the wall is rollable on the full
      // reserve path" without any transparency compositing anywhere in
      // this beat.
      rects.classed('mark', true).attr('fill', (d) => (d.label === FULL.label ? 'var(--oxblood)' : 'var(--k-gray)'));
      const bw = x.bandwidth() / SCENARIOS.length;
      stage
        .selectAll('text.scenario-label')
        .data(SCENARIOS)
        .join('text')
        .attr('class', 'label scenario-label')
        .attr('x', (d, i) => x(YEARS[0]) + i * bw + bw / 2)
        .attr('y', (d) => y(d.y[0]) - 6)
        .attr('text-anchor', 'middle')
        // A8-register-h item 6: same colour-not-opacity emphasis as the
        // bars above; both `--oxblood` (7.74:1/7.16:1) and `--ink-soft`
        // (the `.label` CSS default, 7.14:1/9.06:1) clear item 1's 4.5:1
        // floor — the 0.32-opacity label ("the least readable text on
        // the chart", critique §6) had none of that margin.
        .attr('fill', (d) => (d.label === FULL.label ? 'var(--oxblood)' : 'var(--ink-soft)'))
        .text((d, i) => SCENARIO_LABELS[i]);
      stage
        .append('text')
        .attr('class', 'annot rollable-callout')
        .attr('x', x('2028') + x.bandwidth() / 2)
        .attr('y', y(FULL.y[2]) - 20)
        .attr('text-anchor', 'middle')
        .attr('opacity', 0)
        .text(`${FULL.y[2]} % by 2028 — rollable`);
    },
    update(stage, t) {
      stage.select('text.rollable-callout').attr('opacity', t);
    }
  };
}

// Segmented control (A7-fix P0-2/P1) — was SVG `<text role="button">`
// under the `.stage` (z-index 0); `.beats` (z-index 1, a `.scene` child
// like `.stage`'s foreground siblings) is a flex column that — even
// though only its own text visually renders as a narrow right-anchored
// mat — lays out as a full block spanning the whole scene's width/height,
// so `elementFromPoint` at the segment's own on-screen position always
// hit that transparent DIV first: keyboard `Enter` worked, pointer/touch
// never did (measured). Rebuilt as real `<button>`s in a labelled
// `role="group"`, mounted as a DOM sibling of `.beats` inside the
// `.scene` container — not inside `.stage` at all, so it is never behind
// that overlay regardless of where either one is positioned — and made
// `position: sticky` in `canvas.css` so it naturally appears/disappears
// with scene 6 the same way `.stage` itself does, no enter/exit
// bookkeeping required for the cross-scene case.
const SEGMENTED_CONTROL_ID = 'wall-segmented-control';
const SEGMENTS = [
  { label: '100 %', frac: 1 },
  { label: '50 %', frac: 0.5 },
  { label: '0 %', frac: 0 }
];

// A8 (v3 §3, supersedes A7-fix3/A7-fix4's `.readout-mat`): the scrub
// readout's visual mat is DELETED — it was `display:none` in 24/24 desktop
// samples (TRIBUNAL-A8 seat 1) and its whole purpose (avoiding the stage's
// drawn marks) is now handled structurally, not per-scene. What's left:
// the on-bar `.label` value text `render()` already draws on every bar
// (unchanged, below) for sighted readers, and one visually-hidden
// `aria-live="polite"`/`role="status"` region (P1-3 below) for assistive
// tech — the stage is `aria-hidden`, so nothing else on the page announces
// the control's result. Both share one lifecycle with the segmented
// control: mounted together in `scrubBeat.enter`, torn down together by
// `removeControls()` (called from every other beat's own `enter` and from
// the scene's `teardown()`).
const READOUT_LIVE_ID = 'wall-readout-live';

function removeControls() {
  document.getElementById(SEGMENTED_CONTROL_ID)?.remove();
  document.getElementById(READOUT_LIVE_ID)?.remove();
}

// A7-fix3 P1-3: `role="status"` + `aria-live="polite"` (belt and braces —
// most AT treats `role="status"` as implying the live-region politeness
// already) on a visually-hidden node. A7-fix4: mounted after the control
// group rather than after the mat (the mat moved into `.stage`, away from
// `.scene`'s own reading order) — same visually-hidden technique, same
// "not inside any aria-hidden ancestor" contract (`.stage` itself carries
// no `aria-hidden`, only the `<svg>` does), position in the tree is
// otherwise immaterial to a live-region announcement.
function mountReadoutLive(afterEl) {
  const el = document.createElement('div');
  el.id = READOUT_LIVE_ID;
  el.className = 'sr-only-live';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  afterEl.insertAdjacentElement('afterend', el);
  return el;
}

// A8-register-b gap 6 remainder (§2 row 6): the group's own `aria-label`
// (below) has always told assistive tech what the control varies; nothing
// told a SIGHTED reader the same thing — three bare "100 %"/"50 %"/"0 %"
// buttons read as an unlabelled percentage picker with no stated subject.
// A visible, non-interactive label as the control's own first child (NOT
// a new independent fixed element — it rides inside the one this scene
// already mounts, same lifecycle, same budget) fixes that without
// touching the fixed-chrome stacking budget this brief's own binding
// rules protect. `aria-hidden` on it: the group's `aria-label` already
// carries the equivalent text for AT, so this is the sighted-only half
// of one fact stated twice, not new information.
// A8-register-e item 6 (`interaction-design.md` §Roving Tabindex, a11y P3):
// the three segments were three separate Tab stops. One tab stop for the
// whole group, arrow keys move the roving `tabindex` between segments —
// the standard WAI-ARIA toolbar pattern (arrow keys move focus only;
// activation is still Space/Enter on whichever segment is currently
// focused, unchanged — the native `<button>`'s own default behaviour,
// nothing new to wire for that half). `tabIndex` starts tracking whichever
// segment is initially pressed (100 %, per `SEGMENTS[0]`) and is kept in
// sync with `aria-pressed` by `setPressed` below, so "Tab lands on the
// pressed preset" holds both on first mount and after any click/scrub-
// driven press change; arrowing moves the roving index independently of
// that, standard toolbar semantics.
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

// A7-fix P1: state was carried by `aria-pressed` alone (no ink/underline),
// and any scroll — even 30px of incidental drift — re-ran the scrub's
// `update()` at the new continuous `t` and reset every segment to
// unpressed, because a continuous scrub fraction almost never equals
// exactly 1/0.5/0. `setPressed` below is the single place that toggles
// the state (visual + `aria-pressed` together, `canvas.css` styles
// `[aria-pressed="true"]` with ink + an oxblood underline).
function setPressed(frac) {
  const buttons = Array.from(document.querySelectorAll(`#${SEGMENTED_CONTROL_ID} button`));
  const anyExactMatch = buttons.some((btn) => Number(btn.dataset.frac) === frac);
  buttons.forEach((btn) => {
    const isPressed = Number(btn.dataset.frac) === frac;
    btn.setAttribute('aria-pressed', String(isPressed));
    // A8-register-e item 6 (fixed mid-dispatch, own bug caught by this
    // session's own axe+keyboard-walk verification, not shipped blind):
    // a continuous scrub's own `frac` (1 - t) almost never equals exactly
    // 1/0.5/0 — the SAME reason `aria-pressed` goes false on every button
    // during a free scrub (A7-fix P1, above) — so tying `tabIndex` to that
    // identical `isPressed` check reset EVERY button to `tabIndex: -1`
    // during ordinary scrolling, removing the group's only Tab stop
    // entirely (measured: a keyboard user landing on the page mid-scrub
    // could not Tab into the control at all). Only touch tabIndex on a
    // frame where SOMETHING is actually exactly pressed (a real click, or
    // the rare scrub frame that lands exactly on 1/0.5/0) — otherwise
    // leave it exactly where it already is, so the roving index always
    // has exactly one live Tab stop, never zero.
    if (anyExactMatch) btn.tabIndex = isPressed ? 0 : -1;
  });
}

// b3 (scrub, CAP.beats[2]): scrub drives the reserve-accumulation
// fraction continuously from 100% (t=0) to 0% (t=1); the segmented
// control jumps straight to one of the three modelled points. A7-fix P1:
// a click LATCHES the display at that exact fraction — subsequent scroll
// only overrides it once the reader has scrolled far enough
// (`LATCH_PX`, comfortably past incidental/inertial drift) to read as a
// deliberate scrub, not silently on the very next scroll tick.
const LATCH_PX = 64;

// A8-register-h item 2b (critique §3, "the scrub tops out at 113.4 %"):
// measured directly (this dispatch's own puppeteer probe against this
// exact build, real `window.scrollTo` + rAF settle, 1px steps across the
// last 30px of this beat's own step): scrollama's own raw progress for
// THIS step — the scene's last beat, so its own step boundary is also
// the handoff to scene 7 — plateaus at t=0.9944 for its final four
// samples, then jumps straight to the NEXT scene's `onStepEnter`
// (`current.pos`/`.beatIndex` switch away) with nothing ever reported
// between 0.9944 and 1 — the step's own trailing few px of raw scroll
// progress are structurally unobservable by a real scroll, not just a
// coarse-sampling artefact (confirmed at 1px granularity). Gating
// completion on raw `t===1` (or any tolerance narrower than that
// ~0.56%-of-dwell gap) makes "114.7 %" unreachable on a scroll read no
// matter how tightly item 2a's own numeric tolerance is written.
// `LOCAL_T_CAP` remaps this beat's own visual completion to land at 85%
// of its raw dwell — comfortably clear of the measured 0.9944 ceiling —
// and holds it there for the remaining 15%, the same "remap local
// progress so the visual end state is reached (and held) before the step
// itself ends" technique wave 2f's own item 9 used for scene 2's wipe.
// Beats 1/2 (the static overview/emphasis views) are untouched — this
// only remaps THIS beat's own `t`.
const LOCAL_T_CAP = 0.85;

// A8-register-d item 5 (closes critique §7, scrolly-kit
// plans/scrolly-kit/briefs/A8-register-d.md): `.big` names ONLY the 0 %
// (no-accumulation) scenario ("114.7 %, required 2026 rollover with no
// reserve accumulation") — but the engine's own `setActiveBig` (generic,
// `src/canvas/engine/index.js`) toggles `.big.is-active` for this beat's
// WHOLE dwell unconditionally (it is this scene's last beat), so before
// this item it painted at the very START of the scrub (frac 1 == 100 %)
// while the bars/control still showed the 100 % column. Bound here
// instead, scene-local, the smallest change that closes it without a new
// engine hook: `render()` (below, the ONE function every beat state —
// discrete control press, continuous scrub, resize re-entry, build-time
// `seek` twin — already funnels through) calls this after every draw, so
// there is exactly one place that ever decides whether the big matches
// what is actually on screen.
//
// An exact match for the discrete control press (`SEGMENTS`' own
// `frac: 0`); a small tolerance (`ZERO_EPSILON`) for the continuous
// scrub's own floating-point progress — a real scroll's last
// `onStepProgress` reading before scrollama hands off to the next step
// essentially never lands on the exact IEEE `0`, so a strict `=== 0`
// would make the big never activate on a genuine scroll-through at all.
// Reasoned, not measured against a specific grid-slope error bound: the
// closest `dsa_grid` interpolation pair (frac 0.5 -> 0, `interpRollover`
// above) sets the worst-case slope this tolerance rides on; 8 % of that
// span reads as materially "0 %" at the bar label's own 1-decimal
// precision (`toFixed(1)`) in every scene-6 sample this dispatch's own
// verify sweep captured — see the report's own item-5 table.
// A8-register-f item 5 (closes critique §7, P3: "big reads 114.7 % while
// its bar reads 109.5 % in 1 of 2 on-samples"): `ZERO_EPSILON` (0.08,
// reasoned rather than measured against the grid's own slope) is
// SUPERSEDED, not tightened — the caption's static big number is exactly
// the frac=0 endpoint of the SAME linear interpolation the 2026 bar
// itself draws from (`interpRollover`, above); its slope near frac=0 is
// roughly 107 percentage points per unit frac, so a hand-picked band
// tolerant enough to stay reachable during a genuine scroll (0.08, or
// even a much smaller round number) reliably diverges from "114.7 %" at
// the bar's own 1-decimal precision. Activation is now the EXACT
// condition item 5's own brief text describes — "within display-rounding
// of 0 %" — checked against the bar's own real formatting function
// (`toFixed(1)`, identical to `render()`'s bar-label template) rather
// than approximated with a distance threshold: the big can only ever be
// active where its own captioned "114.7 %" (verify-canvas.mjs's manifest
// checks this exact static string — kept unchanged, not swapped for a
// live readout) and the bar's own displayed text are, by construction,
// the same string.
// A8-register-h item 2a (critique §3): the exact STRING match above
// worked correctly whenever the scrub actually got close enough to
// 114.7 %, but critique §3's own 131-sample @10px real-scroll sweep
// across the scene-6/7 handoff (y=14100-14400) found the scrub topping
// out at 113.4 % — nowhere near either form of this check. Widened to
// the brief's own numeric tolerance (`Math.abs(pct - 114.7) < 0.05`,
// display-rounding-equivalent to the `toFixed(1) === '114.7 %'` this
// replaces, but a direct numeric comparison rather than a string
// round-trip) per item 2's own (a) — kept as its own named half because
// engine/index.js's own fix (item 2b, below/elsewhere in this file's
// sibling engine change) is what actually makes this reachable on a real
// scroll; this alone does not widen the window enough to fix §3 by
// itself.
function syncBigToScenario(stage, frac, pct2026) {
  const big = stage.beatEl?.closest('.scene')?.querySelector(':scope > .big');
  if (!big) return;
  const bigMatchesBar = Math.abs(pct2026 - 114.7) < 0.05;
  big.classList.toggle('is-active', bigMatchesBar);
}

function scrubBeat() {
  let x;
  let y;
  let safe;
  let liveEl = null;
  let pinnedFrac = null;
  let pinnedScrollY = 0;
  let lastSignature = '';

  // A8 (v3 §3, supersedes A7-fix3/A7-fix4's positioned/collision-avoiding
  // `.readout-mat` block): no visual mat to place any more — `render()`
  // just draws the bars/on-bar labels (unchanged) and throttles the
  // aria-live announcement (P1-3, WCAG 2.2 AA 4.1.3). `discrete` is true
  // for a real user action (button press, or the beat's own initial mount)
  // — those always get announced; a scrub-driven frame only re-announces
  // when a bar's own feasible/infeasible VERDICT flips, not on every
  // 0.1%-precision tick of the continuous percent.
  function render(stage, frac, { discrete = false } = {}) {
    const bars = YEARS.map((year, i) => ({ year, pct: interpRollover(i, frac) }));
    stage
      .selectAll('rect.wall-bar')
      .data(bars, (d) => d.year)
      .join('rect')
      .attr('class', 'mark wall-bar')
      .attr('x', (d) => x(d.year))
      .attr('width', x.bandwidth())
      .attr('y', (d) => y(Math.max(0, d.pct)))
      .attr('height', (d) => Math.abs(y(0) - y(d.pct)))
      .attr('fill', 'var(--oxblood)');
    stage
      .selectAll('text.wall-bar-label')
      .data(bars, (d) => d.year)
      .join('text')
      .attr('class', 'label wall-bar-label')
      .attr('x', (d) => x(d.year) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.pct) - 6)
      .attr('text-anchor', 'middle')
      .text((d) => `${d.pct.toFixed(1)} %`);

    if (liveEl) {
      const combined = bars.map((d) => readoutText(d.year, d.pct)).join('  ');
      const signature = bars.map((d) => (d.pct <= 100 ? 'F' : 'I')).join('');
      if (discrete || signature !== lastSignature) {
        liveEl.textContent = combined;
        lastSignature = signature;
      }
    }

    setPressed(frac);
    syncBigToScenario(stage, frac, bars[0].pct);
  }

  return {
    motion: 'scrub',
    caption: CAP.beats[2],
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      removeControls();
      liveEl = null;
      lastSignature = '';
      const sceneEl = stage.beatEl?.closest('.scene');
      if (sceneEl) {
        const group = mountSegmentedControl(sceneEl, (frac) => {
          pinnedFrac = frac;
          pinnedScrollY = window.scrollY;
          render(stage, frac, { discrete: true });
        });
        liveEl = mountReadoutLive(group);
      }
      // A8 (v3 §3): no readout mat to reserve room for any more — the full
      // stage.safe area (now the disjoint-by-construction padded rect,
      // src/canvas/engine/index.js) is available to the bars/axis.
      safe = stage.safe;
      ({ x, y } = buildScales(stage, ctx));
      drawAxis(stage, x);
      drawCeiling(stage, safe, y);
      stage
        .append('text')
        .attr('class', 'annot')
        .attr('x', safe.x)
        .attr('y', safe.y + 14)
        .text('Three modelled scenarios, linear between them');
      pinnedFrac = null;
      render(stage, 1, { discrete: true });
    },
    update(stage, t) {
      if (pinnedFrac !== null && Math.abs(window.scrollY - pinnedScrollY) < LATCH_PX) {
        render(stage, pinnedFrac);
        return;
      }
      pinnedFrac = null;
      // A8-register-h item 2b: see `LOCAL_T_CAP`'s own comment above.
      const localT = Math.min(1, t / LOCAL_T_CAP);
      render(stage, 1 - localT);
    }
  };
}

export default {
  id: '06-wall',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  data: (ctx) => ctx.specs[SPEC_ID],
  series: SCENARIOS.map((s) => ({ label: s.label, x: s.x, y: s.y })),
  beats: [overviewBeat(), emphasisBeat(), scrubBeat()],
  // A7-fix2 P1: the engine's own scene-exit hook (src/canvas/engine/
  // index.js) — this scene is the only one that mounts real, non-SVG DOM
  // (the segmented control and its aria-live readout region — A8 deleted
  // the visual readout mat, v3 §3), so it's the only one that needs a
  // teardown. Forward scroll
  // past this scene's last beat used to leave the control mounted and
  // pointer/tab reachable over scene 7 indefinitely; this closes it in
  // both scroll directions, not just the same-scene sibling-beat case the
  // individual beats' own `enter()` calls already covered.
  teardown() {
    removeControls();
  }
};
