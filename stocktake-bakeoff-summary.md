# Stocktake Bake-off — Summary of Work

_RnD day: greenfield "Thin React" rebuild of the OMS stocktake screen, measured head-to-head
against the current MUI/MRT app on a simulated Lenovo M10. Companion docs:
[oms-frontend-rebuild-rnd.md](oms-frontend-rebuild-rnd.md) (decision rationale) ·
[stocktake-build-log.md](stocktake-build-log.md) (chronological build log + gotchas) ·
[docs/perf/frontend-runs.html](docs/perf/frontend-runs.html) (raw results table)._

---

## The question we set out to answer

> How much of OMS's slowness is **React's VDOM** vs the **libraries layered on top** (MUI / emotion
> runtime CSS-in-JS / Material React Table)?

Answer, measured: **the libraries, overwhelmingly.** Keeping React but replacing MUI/emotion/MRT with
a headless + zero-runtime-CSS + virtualised stack made the same screen **~4× faster to usable** and
**~5.6× smaller**, with the VDOM still in place.

## What we built (from an empty folder)

A greenfield stocktake **detail** screen — the most data-dense, editable workflow — importing nothing
from the current app:

- **Rspack** + **React 19 + React Compiler** (auto-memoisation via babel).
- **TanStack Table + TanStack Virtual** — headless grid, plain DOM cells, all 15 columns, row
  virtualisation (only the visible window in the DOM).
- **vanilla-extract** — zero-runtime CSS from a typed token contract (`theme.css.ts`); no emotion.
- **React Aria** — accessible edit-line dialog + segmented **DatePicker** + reason `Select`.
- **graphql-request + graphql-codegen** against the live schema (typed SDK); **TanStack Query** cache.
- Wired to the **real** backend (no mocks): `stocktake` + `stocktakeLines` (server sort/filter/paginate)
  + `updateStocktakeLine` / `deleteStocktakeLine`.

**Verified working** against the real 1,506-line reference stocktake: virtualised render, server sort,
server filter synced to `?filter=` URL param, row select + delete, inline "Packs counted" edit, the
edit-line modal (React Aria) saving counted + reason together, and live update via query invalidation.
(Full interaction list + the 3 real bugs found & fixed are in the build log.)

## The bake-off result

Same stocktake (#112, **1,506 lines**, CHC Ermera store), same `:8000` backend, **both prod builds**
served identically via `scripts/serve-prod.mjs` (gzip + `/graphql`→`:8000` proxy + SPA fallback),
**6× CPU throttle** (M10 proxy), **5 runs each** (warm-up dropped), measured via Playwright's CDP
session. **Both apps virtualise the full set** — no pagination on either detail view, so it's
apples-to-apples on the dataset.

| Metric | Old FE (MUI + MRT + emotion) | **Thin React** | Win |
|---|---|---|---|
| **Time to data rendered** | 3,781 ms (3,748–3,941) | **911 ms** (877–930) | **~4.1×** |
| **Time to network quiet** (ranking metric) | 3,669 ms (3,633–3,806) | **910 ms** (889–925) | ~4.0× |
| **First Contentful Paint** | 924 ms (888–932) | **116 ms** (112–128) | ~8× |
| Largest Contentful Paint | 1,448 ms | **964 ms** | ~1.5× |
| Cumulative Layout Shift | 0.045 | **0** | — |
| **Code transfer (JS+CSS, gzip)** | 1,362 KB | **243 KB** | **~5.6×** |
| Total transfer (gzip) | 1,649 KB | **351 KB** | ~4.7× |
| DOM nodes (same screen) | 1,363 | **496** | ~2.7× |
| JS heap | 97 MB | **36 MB** | ~2.7× |
| GraphQL calls on load | 14 | **3** | ~4.7× fewer |
| HTTP requests | 37 | **7** | ~5× fewer |

**Baseline measured:** old FE = open-msupply-duo **commit `22cdf6eeb6`** (v3.0.0-RC),
built `client/packages/host/dist`. Thin React = this repo (`main`, prod `rspack build`).

### How to read it
- The **8× FCP gap** is the emotion runtime-style-injection + bundle-parse tax the RnD doc predicted.
- The **5.6× smaller bundle** is MUI + emotion + MRT leaving.
- The VDOM is unchanged — so this ~4× is achievable **without** a framework swap. That reframes the
  Solid/Svelte question from "mandatory" to "an optional extra bet on top."

### Honest caveats
- **14 vs 3 GraphQL calls**: the old FE's cold load is chattier (app-shell/bootstrap queries), which
  *flatters* the end-to-end time. But FCP, bundle, DOM, heap and LCP each favour Thin React by 2.7–8×
  independently of network chatter.
- **Load only.** INP (cell-edit / scroll interaction latency) — the other half of the M10 story — is
  **not yet measured**.
- Local backend, **no network throttle** (transfer sizes are gzipped and comparable; adding Slow 4G
  would widen the bundle gap, not narrow it).
- Thin React is a **prototype**: single-line edit modal (not the multi-batch sub-grid), and
  column-resize / frozen columns / full grid keyboard-nav aren't built yet (the known MRT-parity work).

## How to reproduce

```bash
# Thin React
npm install && npm run codegen        # types from live :8000 schema
npm run build                         # prod bundle -> dist/
node scripts/serve-prod.mjs 3200      # serve prod (gzip + /graphql proxy) on :3200

# Old FE (in the open-msupply-duo repo, commit 22cdf6eeb6)
#   yarn && yarn build                # -> client/packages/host/dist
node scripts/serve-prod.mjs --dir /ABS/PATH/open-msupply-duo/client/packages/host/dist --port 3004

# Measure (needs the Playwright MCP): the runner in
#   .claude/skills/perf-measure/run-throttled.playwright.js
# does CPU 6x + document-start probe + N runs + median, then append-row.mjs writes a row.
```

Backend: `http://localhost:8000/graphql`, run with `debug_no_access_control: true`. Login `check`/`pass`,
store CHC Ermera (`5B28901C52396E4BB098B9862CCF5DF9`).

## Perf harness (reusable, per bench-prompt.md)

`.claude/skills/perf-measure/` — a project-tailored measurement skill:
- `collect.js` (versioned probe + collector), `append-row.mjs` (marker-guarded HTML appender, `COLUMNS`
  = single source of truth), `run-throttled.playwright.js` (the CDP runner), `scenarios.json`, `SKILL.md`.
- **Key finding:** the throttled run needs **no chrome-devtools MCP** — Playwright's `run_code_unsafe`
  exposes a CDP session (`Emulation.setCPUThrottlingRate`, `Page.addScriptToEvaluateOnNewDocument`,
  network emulation, heap snapshots). Ranking metric = **time-to-network-quiet** (scoped to the
  `stocktakeLines` query so background polling doesn't skew it).

## Next steps

1. **INP** probe (event-timing + scripted cell-edit/scroll) on both apps — completes the M10 picture.
2. **Solid arm** (same TanStack Table/Virtual, Kobalte, vanilla-extract) — does dropping the VDOM buy
   more on top of the 4×?
3. Optional **Slow 4G** network throttle to model remote-site cold loads.
