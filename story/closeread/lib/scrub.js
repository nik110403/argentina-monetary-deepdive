// lib/scrub.js — 1-line re-export shim. The real library moved to
// lib/charts.js (SPEC.md closeread-engine E5: "rename charts.js"). Kept as
// a shim, not deleted, only so closeread/template/story.qmd's own bundled
// example — outside this dispatch's Touches fence (template/{lib,brand}/**,
// not the qmd) — keeps rendering unedited. New stories should import
// charts.js directly.
export * from "./charts.js";
