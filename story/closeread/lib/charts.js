// lib/charts.js — shared OJS chart chrome (SPEC.md closeread-engine E5:
// "Shared chart chrome (margins, axes, end-label, band, hairline, bigNumber)
// goes into lib/scrub.js -> rename charts.js, <=300 lines, so story #2
// inherits it"). ES module, no deps beyond the vendored d3 instance every
// caller passes in explicitly (require() banned — closeread-engine SPEC.md
// "Closeread facts"). STRATEGY §6: a helper, never a new engine — every
// function here is a small idempotent-enough DOM builder called fresh on
// each OJS reactive re-run; none of it schedules its own animation frames.
//
// lib/scrub.js is now a 1-line re-export shim, not deleted: it keeps
// closeread/template/story.qmd's own bundled example (outside this
// dispatch's Touches fence: template/{lib,brand}/** only, not the qmd)
// rendering unedited. See the E5 report deviation note.

/** Read a brand.css custom property off <html> at call time, so every
 * chart's series colours track --k-*, --ink and --accent (and flip correctly
 * under prefers-color-scheme: dark or a .cr-hook dark-stage override)
 * instead of a hard-coded hex frozen at light-mode values (critic fold-in,
 * item 5/10). Falls back to `fallback` outside a browser (SSR/tests). */
export function cssVar(name, fallback = "") {
  if (typeof getComputedStyle !== "function") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** True under prefers-reduced-motion: reduce. */
export function reduced() {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function clampT(t) {
  return reduced() ? 1 : Math.max(0, Math.min(1, t));
}

// ---------------------------------------------------------------- reveal --

/** Draw `path` up to progress t (0..1) via stroke-dasharray/-dashoffset. */
export function lineDraw(path, t) {
  const node = path.node ? path.node() : path;
  const length = node.getTotalLength();
  const tt = clampT(t);
  node.style.strokeDasharray = `${length} ${length}`;
  node.style.strokeDashoffset = String(length * (1 - tt));
  return node;
}

/** Slice a pixel-space points array to progress t (0..1) — the reveal unit
 * `hook()` and area fills use so the fill's edge tracks the line's edge
 * exactly (a dasharray reveal on a filled path has no equivalent). */
export function sliceTo(points, t) {
  const tt = clampT(t);
  const upto = Math.max(1, Math.round(points.length * tt));
  return points.slice(0, upto);
}

/** Fill under `points` (pixel space, already sliced to the desired reveal)
 * down to `y0`, as an update-in-place path so repeated calls don't stack
 * elements. `fill` may be a color or a `url(#id)` gradient ref. */
export function areaUnder(d3, svg, points, y0, { id = "cr-area", fill = "currentColor", opacity = 1 } = {}) {
  const area = d3.area().x((d) => d[0]).y1((d) => d[1]).y0(y0);
  let path = svg.select(`#${id}`);
  if (path.empty()) path = svg.append("path").attr("id", id);
  path
    .attr("d", points.length > 1 ? area(points) : null)
    .attr("fill", fill)
    .attr("stroke", "none")
    .attr("opacity", opacity);
  return path;
}

/** One <linearGradient> from `color` (opaque) to transparent, top to bottom
 * — the "area fill fading to transparent" the hook and scrub scenes share.
 * Idempotent per `id` within one render. */
export function fadeGradient(svg, id, color) {
  let defs = svg.select("defs");
  if (defs.empty()) defs = svg.append("defs");
  if (!defs.select(`#${id}`).empty()) return `url(#${id})`;
  const g = defs.append("linearGradient").attr("id", id).attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
  g.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.55);
  g.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0);
  return `url(#${id})`;
}

/** Count/format `node`'s text up to value * t. `{decimals, suffix}`. */
export function countUp(node, value, t, { decimals = 1, suffix = "" } = {}) {
  const el = node.node ? node.node() : node;
  const tt = clampT(t);
  el.textContent = `${(value * tt).toFixed(decimals)}${suffix}`;
  return el;
}

/** A positioned big number (Fraunces via brand.css `.cr-big-number`), for
 * a value riding a line head or any other floating callout. Update-in-place
 * by `id` so repeated calls move rather than duplicate it. */
export function bigNumber(svg, { id = "cr-big-number", x, y, value, t = 1, decimals = 1, suffix = "", anchor = "end", size } = {}) {
  let label = svg.select(`#${id}`);
  if (label.empty()) label = svg.append("text").attr("id", id).attr("class", "cr-big-number");
  label.attr("x", x).attr("y", y).attr("text-anchor", anchor);
  if (size) label.attr("font-size", size);
  countUp(label, value, t, { decimals, suffix });
  return label;
}

// ----------------------------------------------------------------- chrome --

/** Bottom + left axis chrome shared by every scene (Space Grotesk text via
 * brand.css `.sticky svg text`). `hideY` skips the left axis (hook's
 * full-bleed dark stage has none). */
export function axes(d3, svg, { x, y, h, margin, xTicks = 6, yTicks = 4, hideY = false }) {
  const gx = svg.append("g").attr("class", "cr-axis cr-axis-x")
    .attr("transform", `translate(0,${h - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(xTicks).tickSizeOuter(0));
  if (!hideY) {
    svg.append("g").attr("class", "cr-axis cr-axis-y")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(yTicks));
  }
  // R1 fix round 2 (G3, critic P1): F4's `axisTickAnchor` fixed dodgeY
  // entry only ever guarded CALLOUT labels off the x-axis tick BAND -- it
  // never addressed the x-axis's own FIRST tick colliding with the
  // y-axis's own "0" tick at the plot's bottom-left corner. Both ticks
  // are centred on the same point (margin.left, h-margin.bottom) by
  // construction whenever a domain starts flush with the left margin (the
  // regimes and scrub charts both do; confidence's happens not to,
  // measured -- which is why F4's proof, run only on confidence, never
  // caught this): d3's default bottom-axis tick text is text-anchor
  // "middle", so its box straddles margin.left same as the left-axis's
  // "0" ends just short of it -- "2022" x "0", 7-8px x 3-4px, at every
  // viewport, in every drawer with a visible y-axis. A `dx` nudge (not a
  // text-anchor/x change) is deliberate: keeping the default "middle"
  // anchor and just sliding the whole glyph box right by a small, fixed
  // amount widens the gap on ONE side without widening the box itself --
  // a first attempt (`text-anchor:start` + a small `x`) re-anchored the
  // box to grow rightward from the tick position instead of straddling
  // it, which cleared the corner but, at 390 where consecutive yearly
  // ticks sit only ~47px apart, ate into the NEXT tick instead ("2022" x
  // "2023", new collision, measured). 10px clears the original 7-8px
  // corner overlap with margin and, at 390's tightest spacing, still
  // leaves ~4px before the next tick (measured).
  const firstTick = gx.selectAll(".tick").filter((d, i) => i === 0).select("text");
  if (!firstTick.empty()) firstTick.attr("dx", "10px");
}

/* R1 fix round 2 (G7, critic P2): "Crawl/band rate" truncated to bare
 * "Band" below 560px, and (separately) the shaded IMF regime span
 * truncated to bare "IMF" -- two different chart objects that both
 * abbreviate into the same "band" vocabulary right at the widths where
 * the chart is smallest and needs its labels most. No caller here should
 * ever DROP words from a label again; if it's long, wrap it onto two
 * lines instead. Splits at the space/slash closest to the string's own
 * midpoint (not always the LAST one) so e.g. "Crawl/band rate" breaks
 * "Crawl/band" + "rate", not "Crawl/band rate" + "" or a lopsided single
 * remaining word on one line. Returns null (caller keeps the one-line
 * render) when the text is short enough already or has no natural break
 * point to split on. */
function twoLine(text, maxChars = 9) {
  if (!text || text.length <= maxChars) return null;
  const breakPts = [];
  for (let i = 1; i < text.length; i++) if (text[i] === " " || text[i] === "/") breakPts.push(i);
  if (!breakPts.length) return null;
  const mid = text.length / 2;
  let best = breakPts[0];
  for (const bp of breakPts) if (Math.abs(bp - mid) < Math.abs(best - mid)) best = bp;
  // R1c fix2 (H7, critic P2): a "/" break point used to split BEFORE the
  // slash ("Crawl" / "/band rate"), leaving line2 with a dangling leading
  // "/" -- a " " break should still drop the space itself, but a "/"
  // break should keep it attached to line1 ("Crawl/" / "band rate"), the
  // same way a hyphen stays with the word before it.
  const splitAt = text[best] === "/" ? best + 1 : best;
  const line1 = text.slice(0, splitAt).trim();
  const line2 = text.slice(splitAt).trim();
  if (!line1 || !line2) return null;
  return [line1, line2];
}

/** Direct end label at a series' last drawn point — replaces a legend.
 * `wrap` (G7): when true and `text` is long enough (see `twoLine`), render
 * it as two stacked `<tspan>` lines instead of truncating the string --
 * callers no longer pass an abbreviated string at narrow widths, only
 * this flag. */
export function endLabel(svg, { id, x, y, text, color = "currentColor", dy = "0.32em", wrap = false } = {}) {
  let label = id ? svg.select(`#${id}`) : svg.append("text");
  if (id && label.empty()) label = svg.append("text").attr("id", id);
  label.attr("class", "cr-end-label").attr("x", x + 6).attr("y", y).attr("fill", color);
  const lines = wrap ? twoLine(text) : null;
  if (lines) {
    label.attr("dy", null).text(null);
    label.append("tspan").attr("x", x + 6).attr("dy", "-0.1em").text(lines[0]);
    label.append("tspan").attr("x", x + 6).attr("dy", "1.05em").text(lines[1]);
  } else {
    label.selectAll("tspan").remove();
    label.attr("dy", dy).text(text);
  }
  return label;
}

/** A shaded regime span, lit on its trigger (opacity 0 -> ~0.14) with a
 * label that fades in with it. */
export function band(svg, { id, x0, x1, y0, y1, label, color = "currentColor", active = true, wrap = false } = {}) {
  let g = svg.select(`#${id}`);
  if (g.empty()) {
    g = svg.append("g").attr("id", id).attr("class", "cr-band");
    g.append("rect");
    g.append("text");
  }
  const op = active ? 1 : 0;
  g.select("rect")
    .attr("x", Math.min(x0, x1)).attr("y", y0)
    .attr("width", Math.abs(x1 - x0)).attr("height", y1 - y0)
    .attr("fill", color).attr("opacity", op * 0.14);
  const bandX = Math.min(x0, x1) + 4;
  const text = g.select("text")
    // left-aligned at the band's own start rather than centred: several
    // regime spans (crawl_1pct is ~2 months wide) are narrower than their
    // own label, so a centred label overflows both edges symmetrically —
    // left-aligned it overflows rightward only, into whatever comes next,
    // which reads better than straddling the band boundary.
    .attr("x", bandX).attr("y", y0 + 14)
    .attr("text-anchor", "start").attr("fill", color)
    .attr("opacity", op);
  // R1 fix round 2 (G7): full band label always kept (never abbreviated to
  // "IMF"/"2%" etc.); wrapped onto two lines when the caller says the
  // chart is narrow and the label is long enough (see `twoLine`).
  const lines = wrap ? twoLine(label ?? "") : null;
  if (lines) {
    text.text(null);
    text.append("tspan").attr("x", bandX).attr("dy", "0").text(lines[0]);
    text.append("tspan").attr("x", bandX).attr("dy", "1.1em").text(lines[1]);
  } else {
    text.selectAll("tspan").remove();
    text.text(label ?? "");
  }
  return g;
}

/** A vertical event marker + label, faded in when `active`. `labelAt`
 * ("top"|"bottom") picks which end of the line the label sits near — a
 * value-following big number tends to live near the top of a chart at its
 * peak, so a hook-style scene wants event labels anchored to the bottom
 * (near the axis) instead, clear of it. `labelDy` staggers the label
 * further along that same end — for hairlines close enough in x (e.g. two
 * events days apart on a multi-year axis) to otherwise collide. */
export function hairline(svg, { id, x, y0, y1, label, color = "currentColor", active = true, dashed = false, labelAt = "top", labelDy = 12 } = {}) {
  let g = svg.select(`#${id}`);
  if (g.empty()) {
    g = svg.append("g").attr("id", id).attr("class", "cr-hairline");
    g.append("line");
    g.append("text");
  }
  const op = active ? 1 : 0;
  g.select("line")
    .attr("x1", x).attr("x2", x).attr("y1", y0).attr("y2", y1)
    .attr("stroke", color).attr("stroke-width", 1)
    .attr("stroke-dasharray", dashed ? "3,3" : null)
    .attr("opacity", op);
  const ly = labelAt === "bottom" ? y1 - labelDy : y0 + labelDy;
  g.select("text")
    .attr("x", x + 6).attr("y", ly)
    .attr("fill", color).attr("opacity", op).text(label ?? "");
  return g;
}

/** A horizontal phase-mean marker + its number, faded in when `active`.
 * `labelY` (R1 item 8: confidence-chart phase-mean labels 2.1%/1.4%
 * crowding bottom-right at 390) lets the TEXT sit somewhere other than
 * the line's own y -- e.g. a `charts.dodgeY`-adjusted position -- while
 * the line itself stays at the true data value; defaults to `y` so every
 * existing caller (regimes' own use is line-only, no label collision)
 * is unaffected. */
export function meanSegment(svg, { id, x0, x1, y, labelY, labelDx = 0, labelDy = 0, label, value, color = "currentColor", active = true, decimals = 1, suffix = "%" } = {}) {
  let g = svg.select(`#${id}`);
  if (g.empty()) {
    g = svg.append("g").attr("id", id).attr("class", "cr-mean");
    g.append("line");
    g.append("text");
  }
  const op = active ? 1 : 0;
  const ly = (labelY != null ? labelY : y) + labelDy;
  g.select("line")
    .attr("x1", x0).attr("x2", x1).attr("y1", y).attr("y2", y)
    .attr("stroke", color).attr("stroke-width", 2).attr("opacity", op);
  g.select("text")
    // R1 fix round 1 (F5): `labelDx`/`labelDy` (alongside `labelY` above)
    // let the TEXT move off the series it annotates without touching the
    // line's own x0/x1/y -- charts.dodgeFromPath computes both against
    // the series' actual drawn points, since "2.1%"/"78.7" were being
    // crossed by the noisy series/companion line, not by each other.
    .attr("x", x1 + 6 + labelDx).attr("y", ly).attr("dy", "0.32em")
    .attr("fill", color).attr("opacity", op)
    .text(`${label ? label + " " : ""}${value.toFixed(decimals)}${suffix}`);
  return g;
}

/** Vertically dodge a set of end-label anchors so their rendered bboxes
 * never touch (E5 fix round 2: three end labels with close data values —
 * regimes' headline/core/crawl-band-rate — were landing within ~13px of
 * each other's baseline, less than the ~17px real glyph bbox height
 * measured on Space Grotesk at the 0.8rem chart-label floor, so adjacent
 * labels overlapped by a few px). `items` is any array of `{y, ...}`
 * (order irrelevant); returns a NEW array sorted by original y, each entry
 * carrying its original `y0` and the applied `dy = y - y0`, for an
 * optional leader-tick render when a label was displaced more than about
 * one line. `minGap` (px) is the enforced minimum centre-to-centre
 * spacing between adjacent labels after sorting — default 18 clears that
 * measured 17px bbox height with a small margin rather than sitting
 * exactly on it. */
/* R1 fix round 1 (F4, critic P1: item 8 regressed at 390 -- "Dec 2023 =
 * 100"/"78.7" still overlapping, plus NEW "2026"/"2.1%" and "2.1%"/"1.4%"
 * collisions). Two changes from the E5-round-2 version:
 * (1) an item may now carry `fixed: true` -- its own y never moves, but
 *     neighbours still have to clear it. Callers pass one `fixed` entry
 *     per chart representing the x-axis TICK TEXT row (a y-band charts.js
 *     has no other way to know about, since d3.axisBottom draws it, not
 *     any of these callout helpers) so phase-mean/callout labels stop
 *     landing on top of "2026" etc. A forward-only pass (the E5 version)
 *     can only push LATER items down; a fixed item sorted last (as the
 *     bottom-of-chart axis text always is) never gets to push the
 *     movable item ABOVE it out of the way -- hence the regression. The
 *     added backward pass fixes that by also pushing earlier items up
 *     when they land within minGap of a later, larger-y neighbour.
 * (2) minGap default raised 18->20: the R1 measurement (390, narrow chart
 *     height) found 15-18px still inside Space Grotesk's ~17px real bbox
 *     height at the 0.8rem chart-label floor -- 20 clears it with margin
 *     at the width where labels crowd hardest. */
/* R1c fix2 (H7 / carried-over R1b P1, critic: "clamp dodgeY's output to
 * [margin.top, h - margin.bottom] and let the gap compress when the
 * budget runs out, rather than letting the last label walk off the
 * canvas"): the forward+backward passes above enforce `minGap` correctly
 * between NEIGHBOURS but never checked the group against the caller's own
 * plot bounds -- three end labels at the narrow-chart 36px minGap (regimes
 * @390) need 72px of spread; when the plot doesn't have it, nothing
 * stopped the pass from placing the last item below the svg entirely
 * ("Core" silently missing at every width under 560px). `bounds`
 * (optional, `{min, max}`) is applied AFTER the pairwise dodge: if the
 * whole dodged group is taller than `bounds` allows, compress every gap
 * by one shared scale factor (preserves relative order and spacing
 * proportionally -- clamping the two ends independently and re-running
 * the pairwise pass could reopen the very collision this function exists
 * to prevent); then shift the group by whatever's left so it sits fully
 * inside `bounds`. */
export function dodgeY(items, minGap = 20, bounds = null) {
  const arr = items.map((d) => ({ ...d, y0: d.y })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].fixed) continue;
    if (arr[i].y - arr[i - 1].y < minGap) arr[i].y = arr[i - 1].y + minGap;
  }
  for (let i = arr.length - 2; i >= 0; i--) {
    if (arr[i].fixed) continue;
    if (arr[i + 1].y - arr[i].y < minGap) arr[i].y = arr[i + 1].y - minGap;
  }
  // only MOVABLE items participate -- a `fixed` entry (the axis-tick-row
  // stand-in other callers pass) must stay exactly where its caller put
  // it, bounds or not.
  const movable = arr.filter((d) => !d.fixed);
  if (bounds && movable.length) {
    const span = movable[movable.length - 1].y - movable[0].y;
    const avail = bounds.max - bounds.min;
    if (span > avail && span > 0) {
      const scale = avail / span;
      const mid = (movable[0].y + movable[movable.length - 1].y) / 2;
      movable.forEach((d) => { d.y = mid + (d.y - mid) * scale; });
    }
    const overTop = bounds.min - movable[0].y;
    const overBottom = movable[movable.length - 1].y - bounds.max;
    if (overTop > 0) movable.forEach((d) => { d.y += overTop; });
    else if (overBottom > 0) movable.forEach((d) => { d.y -= overBottom; });
  }
  arr.forEach((d) => { d.dy = d.y - d.y0; });
  return arr;
}

/** Linearly interpolate `perSegment` extra points between every consecutive
 * pair in `points` (pixel space). `d3.line()`'s default curve
 * (curveLinear) draws straight segments between vertices, and a rendered
 * path's `getPointAtLength()` samples ALONG that continuous geometry --
 * but monthly (or sparser) source data leaves consecutive vertices far
 * enough apart in x that a label's collision box can catch the LINE
 * SEGMENT between two points without either endpoint itself being
 * close, an under-measurement `dodgeFromPath` below silently inherits if
 * fed the raw vertex array (measured: two full "fix" passes at the raw
 * 53-point monthly resolution still left 9-17 real path-sample hits,
 * because the collision was mid-segment both times). Densify BEFORE
 * calling `dodgeFromPath`, not inside it, since the caller already has
 * the exact points its own path generator will draw. */
export function densify(points, perSegment = 8) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  }
  if (points.length) out.push(points[points.length - 1]);
  return out;
}

/* R1 fix round 1 (F5): nudge a label off a data series it would otherwise
 * sit on top of -- "2.1%" crossed by its own noisy blue series, "78.7"
 * crossed by the Real-M2 companion line (8-17 path-sample hits inside the
 * glyph box at every viewport, R1's paint-order halo alone didn't move
 * the underlying geometry). `points` is the SAME pixel-space array the
 * caller feeds its `d3.line()` path generator (densified first -- see
 * `densify` above, this function does not do it itself), so this is an
 * exact geometric check against what will actually be drawn -- not a DOM
 * measurement, which isn't available yet (`d3.create("svg")` is still
 * detached from the document at draw time, so `getBBox()` /
 * `getPointAtLength()` on it don't work).
 *
 * `anchor` matters: every caller here renders `text-anchor: start` (d3's
 * default, unset by any of charts.js's helpers), so the glyph box runs
 * FROM `x` rightward, not centred on it -- an earlier version of this
 * function checked a box centred on `x` and missed most of the actual
 * glyph box for anything longer than ~4 characters ("Dec 2023 = 100" at
 * ~100px wide got checked against a ~52px-wide centred box and still
 * measured 9-17 path hits after the "fix"). `boxW` should be a generous
 * estimate of the rendered text width (callers pass ~7.5px/char at the
 * 0.8rem Space Grotesk chart-label size).
 *
 * Tries alternating +/-`step` x-shifts first (`maxShift` cap). Some
 * collisions can't be solved by an x-shift alone -- an index series
 * label sitting where a companion series troughs at a near-identical
 * value crosses at close to the SAME x for both lines, not a spot an
 * x-only search can step around -- so a second phase tries y-shifts
 * before giving up.
 *
 * R1 fix round 1, second pass (F5): the collision box was vertically
 * CENTRED on `y` (`halfH`, symmetric +/-9px) -- but `y` is the SVG text
 * baseline, not the glyph's vertical centre, and Space Grotesk at this
 * chart-label size (0.8rem) renders with a visibly asymmetric ascent/
 * descent: measured via real `getBBox()` on the rendered "Dec 2023 = 100"
 * and "78.7" labels (both, exactly) -- 13px of glyph ABOVE the baseline,
 * 4px below (bbox height 17px total). A symmetric +/-9px box was checking
 * ~4px too low and ~4px too little above, so a placement that "cleared"
 * the approximate box still had its real (measured) top edge crossing the
 * series line -- the 2/4 residual path-sample hits every viewport still
 * showed after the anchor-box and pixel-space fixes. `ascent`/`descent`
 * default to that measurement, not a guess.
 *
 * R1 fix round 1, third pass (F5): even with the corrected ascent/descent
 * box, "Dec 2023 = 100" (a ~100px-wide label competing for a ~40px left
 * margin) settled on x-shifts that cleared the densified check-points by
 * under 1px -- the verify script's finer 40-point-per-path getPointAtLength
 * sample (real rendered geometry) still caught a graze the coarser
 * densified check missed by that margin. `pad` inflates all four box
 * edges so a candidate must clear with real headroom, not just barely,
 * before dodgeFromPath accepts it. */
export function dodgeFromPath(x, y, points, { boxW = 40, ascent = 13, descent = 5, pad = 4, anchor = "start", step = 4, maxShift = 60 } = {}) {
  const boxX = (cx) => (anchor === "middle" ? [cx - boxW / 2 - pad, cx + boxW / 2 + pad] : anchor === "end" ? [cx - boxW - pad, cx + pad] : [cx - pad, cx + boxW + pad]);
  const hits = (cx, cy) => {
    const [x0, x1] = boxX(cx);
    return points.some((p) => p[0] >= x0 && p[0] <= x1 && p[1] >= cy - ascent - pad && p[1] <= cy + descent + pad);
  };
  if (!hits(x, y)) return { x, y, dx: 0, dy: 0 };
  for (let s = step; s <= maxShift; s += step) {
    if (!hits(x + s, y)) return { x: x + s, y, dx: s, dy: 0 };
    if (!hits(x - s, y)) return { x: x - s, y, dx: -s, dy: 0 };
  }
  for (let s = step; s <= maxShift; s += step) {
    if (!hits(x, y - s)) return { x, y: y - s, dx: 0, dy: -s };
    if (!hits(x, y + s)) return { x, y: y + s, dx: 0, dy: s };
  }
  return { x, y, dx: 0, dy: 0 };
}

// ---------------------------------------------------------------- opener --

/**
 * The Politico-style opener: a muted full-length ghost line under a bold
 * reveal line + fading area fill, with a big number riding the head.
 * `points` is the FULL pixel-space series; reveal progress is `t`.
 */
export function hook(d3, svg, { points, value, t, color = "currentColor", decimals = 1, suffix = "", y0 }) {
  const drawn = sliceTo(points, t);
  const head = drawn[drawn.length - 1];

  let ghost = svg.select("#cr-hook-ghost");
  if (ghost.empty()) ghost = svg.append("path").attr("id", "cr-hook-ghost");
  ghost
    .attr("d", d3.line()((points)))
    .attr("fill", "none").attr("stroke", color).attr("stroke-opacity", 0.22).attr("stroke-width", 1.5);

  if (y0 != null) {
    const grad = fadeGradient(svg, "cr-hook-fade", color);
    areaUnder(d3, svg, drawn, y0, { id: "cr-hook-area", fill: grad });
  }

  let path = svg.select("#cr-hook-line");
  if (path.empty()) path = svg.append("path").attr("id", "cr-hook-line");
  path
    .attr("d", d3.line()(drawn))
    .attr("fill", "none").attr("stroke", color).attr("stroke-width", 3);

  bigNumber(svg, { id: "cr-hook-number", x: head[0], y: Math.max(48, head[1] - 20), value, t: 1, decimals, suffix, size: "clamp(2.6rem, 8vw, 6.5rem)" });
  return svg.node ? svg.node() : svg;
}
