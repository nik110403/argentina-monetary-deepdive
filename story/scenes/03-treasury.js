// story/scenes/03-treasury.js — CANVAS-design.md §2 row 3 "Treasury
// financing stopped" (A5a). Draws fig01_decomposition (FX purchases /
// Treasury / Sterilization / Other, monthly ARS bn) one regime window per
// beat — "per-REGIME beats, never a whole-sample nominal total" — using
// only K18's `barsBuild` + `axisMorph` and the SPEC data adapter.
// `RAW` is a labels+dataset slice of the real widget's own SPEC
// (output/widgets/fig01_decomposition.html), byte-identical to what the
// build's `assertScenesMatchSpec` re-extracts by dataset label. Regime
// windows are derived from the live SPEC's own `bands` at draw time
// (band 0 = the shock period, the last band = 2026; pre-2024 is
// everything before band 0), not hardcoded indices.
import { barsBuild, axisMorph } from '../../../../scrolly-kit/src/canvas/primitives/index.js';
import { seriesFromSpec } from '../../../../scrolly-kit/src/canvas/data/seriesFromSpec.js';
import captions from '../captions.json' with { type: 'json' };

const SPEC_ID = 'fig01_decomposition';
const CAP = captions.scenes.find((s) => s.id === '03-treasury');

const RAW = {"labels":["2022-01","2022-02","2022-03","2022-04","2022-05","2022-06","2022-07","2022-08","2022-09","2022-10","2022-11","2022-12","2023-01","2023-02","2023-03","2023-04","2023-05","2023-06","2023-07","2023-08","2023-09","2023-10","2023-11","2023-12","2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05"],"datasets":[{"label":"FX purchases","key":"blue","data":[-158.02,-20.11,2.31,3.28,384.7,88.53,-292.69,-98.43,996.14,-282.2,-68.56,689.21,-207.33,-219.58,-458.84,143.55,241.3,-958.07,-352.86,436.47,183.01,-90.38,-134.76,1898.87,2311.18,1118.58,2045.55,879.45,1909.19,-235.13,-3630.89,504.47,-1446.36,474.64,-1204.93,-827.72,638.55,1529.55,-1457.24,-917.37,0,0,0,0,-1637.26,-235.34,-1591.12,0,-2353.63,1050.82,2169.53,3816.91,1267.79]},{"label":"Treasury","key":"crimson","data":[-61.1,7.94,-210.4,390.83,-58.48,348.87,-197.24,-35.74,-39.63,170.75,216.18,-286.02,-44.98,191.71,216.59,-1.84,148.01,1151.68,477.44,-436.85,-368.32,-504.52,-417.73,-1992.88,-852.45,-3625.07,-258.22,-432.74,-13519.57,185.19,-3110.97,-1188.47,3781.74,987.31,3571,2336.54,1796.1,-2027.76,623.32,3861.59,1561.1,2569.52,-5891.92,2030.36,1145.29,4141.33,1703.01,-581.68,-143.63,-77.87,-1734.92,-2271.06,1555.98]},{"label":"Sterilization","key":"amber","data":[233.05,74.13,63.26,-389.45,-60.37,-874.79,216.01,52.69,-980.7,127.96,-101.72,51.16,207.86,-93.96,169.03,-476.03,-24.82,-217.75,-27.53,-678.23,-106.54,1220.75,2084.43,-1713.9,-1674.37,4076.31,-765.77,277.32,15414.31,3161.37,16214.36,-0.34,163.08,-119.6,210.03,239.56,-213.65,-144.33,256.48,-442.59,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"label":"Other","key":"gray","data":[-36.91,-21.01,-13.38,-8.91,-7.58,651.5,609,-44.13,-68.15,183.33,162.96,241.65,157.42,25.07,222.75,331.43,-154.67,333.47,409.91,907.84,498.13,-216.67,204.2,2442.38,1531.19,-1951.88,900.66,1781.35,-1621.31,-80.63,-7832,814.37,-2055.41,-1023.11,-1467.49,4156.28,-1702.98,678.11,829.46,-336.82,680.03,-334.01,8829.66,2116.13,-1472.28,-4874.41,-512.48,2612.03,2352.64,-2798.59,-143.54,-691.16,-2980.76]}]};

// Colour authority is captions.json's own `.k data-key` mapping — here it
// happens to match each dataset's own SPEC `key` (Treasury: crimson,
// Sterilization: amber, FX purchases: blue), Other stays k-gray as the
// caption never names it.
function paint(label, hex, token) {
  const s = seriesFromSpec(RAW, label);
  s.color = { hex, token };
  return s;
}
const SERIES = [
  paint('FX purchases', 'var(--k-blue)', 'k-blue'),
  paint('Treasury', 'var(--k-crimson)', 'k-crimson'),
  paint('Sterilization', 'var(--k-amber)', 'k-amber'),
  paint('Other', 'var(--k-gray)', 'k-gray')
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLabel(d) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function sliceSeries(s, lo, hi) {
  return {
    label: s.label,
    color: s.color,
    x: { kind: s.x.kind, values: s.x.values.slice(lo, hi + 1) },
    y: s.y.slice(lo, hi + 1)
  };
}

// A8-register-g: the running-sum inner loop, pulled out of `stackExtent`
// so a single COLUMN's own extent (one date index) can be asked for
// independently — `barColumnObstacles`, below, needs exactly this per
// flag/candidate, not the whole window's extent.
function columnStackExtent(seriesArray, i) {
  let lo = 0;
  let hi = 0;
  let running = 0;
  for (const s of seriesArray) {
    running += s.y[i] || 0;
    if (running > hi) hi = running;
    if (running < lo) lo = running;
  }
  return [lo, hi];
}

// Cumulative stack extent (positive stack top / negative stack bottom) —
// d3-shape's default stack offset walks keys in order rather than
// separating polarity, which is exactly the running accounting-identity
// read the caption wants ("Holding to an exact accounting identity...").
function stackExtent(seriesArray) {
  let lo = 0;
  let hi = 0;
  const n = seriesArray[0].y.length;
  for (let i = 0; i < n; i++) {
    const [colLo, colHi] = columnStackExtent(seriesArray, i);
    if (colHi > hi) hi = colHi;
    if (colLo < lo) lo = colLo;
  }
  return [lo, hi];
}

function preRegime(spec) {
  const shockFrom = spec.bands?.[0]?.from ?? 0;
  return { lo: 0, hi: Math.max(0, shockFrom - 1) };
}
function shockRegime(spec) {
  const band = spec.bands[0];
  return { lo: band.from, hi: band.to };
}
function year2026Regime(spec) {
  const band = spec.bands[spec.bands.length - 1];
  return { lo: band.from, hi: band.to };
}

function drawAxis(stage, x, dates) {
  const g = stage
    .append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${stage.safe.y + stage.safe.height})`);
  axisMorph(g, x, x, 1, { ticks: [dates[0], dates[dates.length - 1]], format: monthLabel });
}

// A8-register-g (closes the 2f-confirmed residual `event-flag`/occluded,
// scene 3 "LEFI migration", 390px only, both themes): diagnosed from the
// harness's own records first, per the brief — every one of the 10
// failing records was `reason: "occluded"` with `actualPaintWinner:
// "text.mark.annot"`, i.e. one LEFI label occluding the OTHER LEFI label,
// not the mat/masthead and not a bar. A live-DOM repro (getBoundingClientRect
// + elementFromPoint at each label's own bbox centre, 390x844) confirmed
// it exactly: 2024-05's label rect [101,184] and 2024-07's label rect
// [143,226] overlap by ~40px of their own 82px width (their band centres
// are only ~42px apart at 390's band width, `x.bandwidth()` ~15.8px +
// padding), and 2024-07 — later in `dates` order, so later in DOM, so
// painted on top — wins the hit-test at 2024-05's own centre point every
// sampled frame of the beat's dwell (5 samples x 2 themes = the 10).
//
// Same technique as 02-confidence.js's A8-register-f item 11: a candidate
// cascade tested against REAL bboxes, not a guessed offset. Two obstacle
// kinds, both "real" per the same standard item 11 set: (a) every flag
// label already placed (its own live `getBBox()`, exactly `drawVlines`'s
// `placed` array), and (b) the real rendered extent of every bar COLUMN
// in this beat's window (`barColumnObstacles`, below — analytic from the
// same data + y-scale the bars themselves render from, the equivalent of
// `localLineObstacles`' pixel-windowed real min/max for a line series,
// since a bar's rendered top/bottom is a deterministic function of its
// own data and scale, not something that needs a live DOM read to be
// "real"). `boxesIntersect` is item 11's own primitive, reproduced here
// (02-confidence.js has no exports; this file may only import from
// `../../../../scrolly-kit/src/canvas/primitives/index.js`).
function boxesIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

const LEFI_ROW_STEP = 16; // one text row (14px annot + 2px gap) — this
// file's labels are horizontal, not item 11's -90deg rotated pair, so the
// row step has to clear a text HEIGHT, not the x-stagger item 11 uses for
// text growing sideways off a rotated anchor.

function barColumnObstacles(seriesArray, x, y) {
  const dates = seriesArray[0].x.values;
  const half = x.bandwidth() / 2;
  const pad = 6;
  return dates.map((d, i) => {
    const [lo, hi] = columnStackExtent(seriesArray, i);
    const yTop = y(Math.max(0, hi));
    const yBot = y(Math.min(0, lo));
    const cx = x(d) + half;
    return { x: cx - half - pad, y: yTop - pad, width: half * 2 + pad * 2, height: yBot - yTop + pad * 2 };
  });
}

// Shock-period beat only: the two LEFI-migration months (2024-05, 2024-07
// — the sterilization spikes that are an accounting reclass, not money
// creation) get their own typographic leader + label. Idempotent, but NOT
// via `drawVlines`' own remove-then-append-at-end (02-confidence.js) —
// that would undo item 8's DOM-order fix, below: the SAME `g.lefi-flags`
// node is reused across calls (found by `stage.select`, only ever
// `append`ed once, on this beat's first `enter()`-time call) and only ITS
// CHILDREN are cleared and redrawn each time. Re-appending the whole group
// at the end of `stage` on every reflow call (t=1 fires on every sampled
// frame of the dwell, not once) would move it AFTER `labelSeriesAtWidest`'s
// series-name text in DOM — exactly the ordering item 8 fixed the other
// direction, and exactly what `series-label`/`series-label-count` staying
// 0 depends on not regressing.
function drawLefiFlags(stage, x, y, dates, seriesArray) {
  let g = stage.select('g.lefi-flags');
  if (g.empty()) g = stage.append('g').attr('class', 'lefi-flags');
  g.selectAll('*').remove();
  const half = x.bandwidth() / 2;
  const lefiDates = dates.filter((d) => d.getUTCFullYear() === 2024 && (d.getUTCMonth() === 4 || d.getUTCMonth() === 6));
  const barObstacles = barColumnObstacles(seriesArray, x, y);
  // Row 1 is the ORIGINAL fixed position (`stage.safe.y - 4`, centred) —
  // kept as candidate #1, not moved inside `stage.safe`, specifically so
  // that at 1440/768 (where this never collided — the 2f report's own
  // residual was 390-only) the cascade picks this identical candidate
  // first and the beat-2 crop stays a 0px diff. Rows 2-3 fall back to
  // inside `stage.safe` per §1.5, only reached when row 1 actually
  // collides (390px, per the diagnosis above).
  const rowY = stage.safe.y - 4;

  // A8-register-h item 4 (critique §8): register-g's own cascade resolved
  // the 390px hit-test collision by anchoring the two flags apart, but
  // both nodes still read the identical string "LEFI migration" —
  // adjacent, at every width, a reader sees a duplicated label rather
  // than two dated instances of the same reclass. The FIRST flag (2024-05,
  // chronologically first) keeps the plain name; the SECOND (2024-07)
  // reads as its continuation — the two months together, not a second
  // unrelated label — closing the harness's own `eventFlag: 2` count
  // (still two `text.mark.annot` nodes, two leaders) without printing the
  // same three words twice.
  const LEFI_LABELS = ['LEFI migration', 'May · Jul 2024'];

  const placed = [];
  lefiDates.forEach((d, i) => {
    const cx = x(d) + half;
    g.append('line')
      .attr('class', 'mark leader')
      .attr('x1', cx)
      .attr('x2', cx)
      .attr('y1', y(0))
      .attr('y2', stage.safe.y);

    const label = g.append('text').attr('class', 'mark annot').text(LEFI_LABELS[i] || LEFI_LABELS[0]);
    const node = label.node();
    const candidates = [
      { x: cx, y: rowY, anchor: 'middle' },
      { x: cx + 4, y: rowY, anchor: 'start' },
      { x: cx - 4, y: rowY, anchor: 'end' },
      { x: cx, y: stage.safe.y + 12, anchor: 'middle' },
      { x: cx + 4, y: stage.safe.y + 12, anchor: 'start' },
      { x: cx - 4, y: stage.safe.y + 12, anchor: 'end' },
      { x: cx + 4, y: stage.safe.y + 12 + LEFI_ROW_STEP, anchor: 'start' },
      { x: cx - 4, y: stage.safe.y + 12 + LEFI_ROW_STEP, anchor: 'end' }
    ];
    const obstacles = [...placed, ...barObstacles];
    let chosenBox = null;
    for (const cand of candidates) {
      label.attr('x', cand.x).attr('y', cand.y).attr('text-anchor', cand.anchor);
      const box = node.getBBox();
      if (!obstacles.some((o) => boxesIntersect(box, o))) {
        chosenBox = box;
        break;
      }
      chosenBox = box; // best-effort: keep the last candidate tried even if it still collides
    }
    placed.push(chosenBox);
  });
}

// Per-category cumulative stack extents for every series (same running-sum
// accounting `stackExtent` above reduces to one [lo,hi] pair, kept here
// per-category and per-series so a label can be placed at whichever bar
// actually gives its own series the most room).
function computeSegments(seriesArray) {
  const n = seriesArray[0].y.length;
  const segments = seriesArray.map(() => new Array(n));
  for (let i = 0; i < n; i++) {
    let running = 0;
    seriesArray.forEach((s, si) => {
      const v = s.y[i] || 0;
      const y0 = running;
      const y1 = running + v;
      running = y1;
      segments[si][i] = { y0, y1 };
    });
  }
  return segments;
}

// One label per stack series, at whichever bar gives that series' own
// segment the MOST vertical room in the current window (§1.5: no legend —
// this is the substitute series identity the grammar requires; A7-fix
// P2-6). A7-fix2 P2-6a: all four series used to share the window's FIRST
// bar regardless of how thin their own slice was there, piling four
// labels into ~70px and running two of them off the left edge at 390px.
// Picking each series' own widest segment spreads the four across the
// window instead of stacking them on one another; edges are clamped so a
// label near either end of a narrow stage flips inward rather than
// crossing the safe area's own boundary.
function labelSeriesAtWidest(stage, safe, x, y, seriesArray) {
  const dates = seriesArray[0].x.values;
  const segments = computeSegments(seriesArray);
  seriesArray.forEach((s, si) => {
    let bestI = -1;
    let bestH = 0;
    segments[si].forEach(({ y0, y1 }, i) => {
      const h = Math.abs(y(y0) - y(y1));
      if (h > bestH) {
        bestH = h;
        bestI = i;
      }
    });
    if (bestI < 0 || bestH < 10) return; // no segment tall enough anywhere in this window
    const { y0, y1 } = segments[si][bestI];
    const half = x.bandwidth() / 2;
    const cx = x(dates[bestI]) + half;
    let anchor = 'middle';
    let dx = 0;
    if (cx - half < safe.x + 4) {
      anchor = 'start';
      dx = 4;
    } else if (cx + half > safe.x + safe.width - 4) {
      anchor = 'end';
      dx = -4;
    }
    stage
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', anchor)
      .attr('x', cx + dx)
      .attr('y', y((y0 + y1) / 2))
      .attr('dy', '0.32em')
      .text(s.label);
  });
}

function fmtSigned(v) {
  const sign = v >= 0 ? '+' : '−';
  return `${sign}${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
}

// A8-register-h item 9 (critique §10, §D(1) magnitude legibility): no bar
// in this scene ever carried a value — the caption names regime totals
// (CANVAS-design.md's own table: pre-2024 Treasury +657, the shock
// Treasury -13,727, 2026 FX purchases +5,951 — verified against RAW,
// above, exactly) that were unreachable from the graphic. Adds ONE direct
// value label per beat: the CURRENT beat's own highlighted series' regime
// total, derived live from `seriesArray` (never hardcoded — same
// discipline `preRegime`/`shockRegime`/`year2026Regime` already use for
// the windows themselves). Laid out post-geometry (called last from
// `enter`, after every bar/leader/label this beat draws) with the same
// real-bbox candidate cascade `drawLefiFlags` uses: every already-placed
// text node's live `getBBox()` plus this beat's own bar-column extents
// are the obstacles, not a guessed offset. `verify-canvas.mjs`'s own
// `seriesLabel` check is `actual < beatManifest.seriesLabel` (a minimum,
// confirmed by reading the harness before adding this, not assumed) so
// one more `.label` node never lowers or breaks the class.
function annotateRegimeTotal(stage, safe, x, y, seriesArray, highlightLabel) {
  const series = seriesArray.find((s) => s.label === highlightLabel);
  if (!series) return;
  const total = series.y.reduce((a, b) => a + (b || 0), 0);
  const text = `${highlightLabel} ${fmtSigned(total)}`;
  const existing = stage
    .selectAll('text.label, text.annot, .mark.leader')
    .nodes()
    .map((n) => n.getBBox());
  const obstacles = [...existing, ...barColumnObstacles(seriesArray, x, y)];
  const rowY = safe.y + 12;
  const candidates = [
    { x: safe.x + safe.width, y: rowY, anchor: 'end' },
    { x: safe.x, y: rowY, anchor: 'start' },
    { x: safe.x + safe.width, y: rowY + LEFI_ROW_STEP, anchor: 'end' },
    { x: safe.x, y: rowY + LEFI_ROW_STEP, anchor: 'start' },
    { x: safe.x + safe.width, y: rowY + LEFI_ROW_STEP * 2, anchor: 'end' },
    { x: safe.x, y: rowY + LEFI_ROW_STEP * 2, anchor: 'start' }
  ];
  const label = stage.append('text').attr('class', 'label regime-total').text(text);
  const node = label.node();
  let chosen = candidates[0];
  for (const cand of candidates) {
    label.attr('x', cand.x).attr('y', cand.y).attr('text-anchor', cand.anchor);
    const box = node.getBBox();
    if (!obstacles.some((o) => boxesIntersect(box, o))) {
      chosen = cand;
      break;
    }
  }
  label.attr('x', chosen.x).attr('y', chosen.y).attr('text-anchor', chosen.anchor);
}

function annotateZeroSterilization(stage, x, y, dates) {
  const midDate = dates[Math.floor(dates.length / 2)];
  stage
    .append('text')
    .attr('class', 'annot')
    .attr('x', x(midDate) + x.bandwidth() / 2)
    .attr('y', y(0) + 16)
    .attr('text-anchor', 'middle')
    .text('sterilization: 0');
}

// One eased beat per regime window: bars grow from the zero baseline,
// `highlightLabel`'s bars stay full opacity, the rest dim to --ink-soft.
function regimeBeat({ caption, regimeFn, highlightLabel, extra, reflow }) {
  let x;
  let y;
  let seriesArray;
  // A8-register-g: hoisted out of `enter()`'s own `const` so `update()`
  // can reach it too — `reflow` (the LEFI-flag re-layout, below) needs the
  // same dates array `extra` already gets, not a re-derivation.
  let dates;
  return {
    motion: 'eased',
    caption,
    enter(stage, ctx) {
      stage.selectAll('*').remove();
      const spec = ctx.specs[SPEC_ID];
      const { lo, hi } = regimeFn(spec);
      seriesArray = SERIES.map((s) => sliceSeries(s, lo, hi));
      dates = seriesArray[0].x.values;
      x = ctx.d3.scale
        .scaleBand()
        .domain(dates)
        .range([stage.safe.x, stage.safe.x + stage.safe.width])
        .padding(0.25);
      const [ylo, yhi] = stackExtent(seriesArray);
      y = ctx.d3.scale
        .scaleLinear()
        .domain([Math.min(0, ylo), Math.max(0, yhi)])
        .nice()
        .range([stage.safe.y + stage.safe.height, stage.safe.y]);
      drawAxis(stage, x, dates);
      // A8-register-b gap 1 root cause (series-label occluded, scene 3's
      // own 81-measured share): this used to append the on-bar `.label`
      // text HERE, before `barsBuild` had ever run once — every bar rect
      // is freshly APPENDED (d3 `.join('rect')` on an entering selection
      // appends to the END of the parent), so the bars always landed
      // LATER in DOM order than the labels already sitting in the SVG,
      // painting over their own series names on every subsequent frame
      // (pixel-confirmed, reports/A8-harness-tune-3.md item 4). `barsBuild`
      // is deterministic and idempotent under `.join()` (same
      // `${label}:${cat}` keys every call), so seeding it once here at
      // t=0 creates the real `rect.bar` nodes FIRST; every later call
      // from `update()` re-uses those same nodes in place rather than
      // re-appending, so DOM order — and therefore paint order — never
      // changes again for the rest of this beat. Labels/annotations
      // placed after this line are the ones now placed AFTER mark
      // geometry is known, per the grammar.
      barsBuild(stage, seriesArray, { x, y }, 0, { stack: true });
      // Zero rule (A7-fix P2-6): true zero sits mid-frame for a signed
      // stack, so the frame-bottom date axis alone doesn't mark it. Was
      // `class="axis"` on a bare `<line>` — canvas.css only styles `.axis
      // line` (a line INSIDE a `.axis` group), so that class never matched
      // anything and the rule painted with no stroke at all. `mark leader`
      // matches the same hairline rule `drawCeiling` (06-wall.js) already
      // uses for its own reference line. Drawn AFTER the (seeded, t=0)
      // bars for the same reason the labels below are — a signed stack's
      // bars can straddle y=0, and the reference hairline needs to stay
      // on top of them to keep reading as a reference, not get buried
      // once the bars grow.
      stage
        .append('line')
        .attr('class', 'mark leader')
        .attr('x1', stage.safe.x)
        .attr('x2', stage.safe.x + stage.safe.width)
        .attr('y1', y(0))
        .attr('y2', y(0));
      stage
        .append('text')
        .attr('class', 'annot')
        .attr('x', stage.safe.x + 4)
        .attr('y', y(0) - 4)
        .text('0');
      // A8-register-c item 8 residual (series-label occluded, scene 3,
      // 52 remaining after 2b's DOM-order bar-vs-label fix): `extra` (the
      // shock beat's `drawLefiFlags`) draws a FULL-SAFE-HEIGHT vertical
      // leader line at each LEFI-migration month — Sterilization's own
      // widest segment (`labelSeriesAtWidest`'s own pick) is the massive
      // 2024-05 spike, the SAME month LEFI's leader is drawn at, and this
      // call order put the leader's line LATER in DOM (rendered after,
      // painted on top), covering "Sterilization"/"Other"'s own series-
      // name text exactly like the DOM-order bug 2b already fixed for
      // bars-vs-labels. `extra` now runs FIRST: the LEFI leader is real
      // chart geometry (fit-before-draw's own "geometry known" input, not
      // a competing label), so labels get placed only after it exists,
      // and the label text itself now paints ON TOP of the hairline
      // leader (a 1px stroke) rather than being cut by it — pixel-
      // confirmed post-build via the harness's own predicate.
      if (extra) extra(stage, x, y, dates, seriesArray);
      labelSeriesAtWidest(stage, stage.safe, x, y, seriesArray);
      annotateRegimeTotal(stage, stage.safe, x, y, seriesArray, highlightLabel);
    },
    update(stage, t) {
      const rects = barsBuild(stage, seriesArray, { x, y }, t, { stack: true });
      // A8-register-h item 6 (critique §6, "Same .32 composite in
      // 03-treasury.js"): an `opacity` attribute on a mark composites at
      // RENDER time against whatever is underneath, silently dropping the
      // fill's own declared contrast (site DESIGN.md §6, quoted in
      // scrolly-kit/DESIGN.md's own Colors section: "opacity composites …
      // silently drop ratios") — here it also matters that the dimmed
      // bars sit directly under `labelSeriesAtWidest`'s on-bar text, so a
      // weaker true colour changes what that label's own new paper halo
      // (canvas.css, item 1) has to fight through. Pre-mixed with
      // `--paper` via `color-mix` instead: a real, single, static colour
      // per bar (not a transparency layer), the dim ratio unchanged
      // (32 % of the series' own hue), themed automatically since
      // `--paper` itself swaps light/dark.
      rects
        .classed('mark', true)
        .attr('fill', (d) => (d.label === highlightLabel ? (d.color && d.color.hex) || d.color : `color-mix(in oklab, ${(d.color && d.color.hex) || d.color} 32%, var(--paper))`));
      // A8-register-g (item 11 technique): re-run the LEFI flag layout
      // once this beat's own tween reaches t=1 (`src/canvas/engine/
      // index.js`'s `tween()` — guaranteed the last frame of this beat's
      // `motion: 'eased'`), idempotent per `drawLefiFlags`'s own group
      // removal, exactly as 02-confidence.js's `gapOverviewBeat` re-runs
      // `drawVlines` from `update()`. Flags are static for the rest of
      // this beat's dwell — this only fires again on the NEXT t===1 frame
      // (a no-op re-layout, same inputs, same output) or the next beat's
      // own `enter()`.
      if (reflow && t >= 1) reflow(stage, x, y, dates, seriesArray);
    }
  };
}

export default {
  id: '03-treasury',
  title: CAP.title,
  alt: CAP.alt,
  big: CAP.big,
  data: (ctx) => ctx.specs[SPEC_ID],
  series: SERIES.map((s) => ({ label: s.label, x: s.x, y: s.y })),
  beats: [
    regimeBeat({ caption: CAP.beats[0], regimeFn: preRegime, highlightLabel: 'Treasury' }),
    regimeBeat({
      caption: CAP.beats[1],
      regimeFn: shockRegime,
      highlightLabel: 'Treasury',
      extra: drawLefiFlags,
      reflow: drawLefiFlags
    }),
    regimeBeat({
      caption: CAP.beats[2],
      regimeFn: year2026Regime,
      highlightLabel: 'FX purchases',
      extra: annotateZeroSterilization
    })
  ]
};
