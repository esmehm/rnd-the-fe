---
name: perf-measure
description: >-
  Measure this app's frontend performance under CPU/network throttling and append a
  comparable row to the shared results doc. Use when asked to "measure page performance",
  "run a perf test", "benchmark this screen", "get INP/LCP/heap", or compare a change's
  perf. Part of the stocktake bake-off — every implementation reports the same fixed metric
  set so numbers line up across people/branches.
argument-hint: "[scenario-name] [--runs N] [--cpu 6] [--cold|--warm]"
---

# perf-measure

Measure a scenario under throttle and append one median-of-N row to
`docs/perf/frontend-runs.html`. Numbers must be comparable across the bake-off, so the metric
set and results format are fixed (see `append-row.mjs` COLUMNS).

## Runner options (either works)

- **chrome-devtools MCP** — if connected (new_page / emulate / performance trace / heapsnapshot).
- **Playwright MCP (verified in this repo)** — `mcp__playwright__browser_run_code_unsafe` hands you
  the raw `page`; open a CDP session and you get the same primitives:
  `page.context().newCDPSession(page)` → `Emulation.setCPUThrottlingRate {rate:6}`,
  `Network.emulateNetworkConditions`, `page.addInitScript` (document-start probe), CDP HeapProfiler.
  A ready-to-run function lives in `run-throttled.playwright.js` — pass it to `run_code_unsafe`.
  For **INP + scroll-jank** (interaction latency under throttle), use `run-inp.playwright.js` — it drives
  real clicks/keystrokes (trusted events → Event Timing) and reads INP per interaction.
  **Two gotchas** (baked into that runner): `addInitScript` **accumulates** across calls (+ a
  `if(window.__perf)return` guard makes new probes bail) → **run on a fresh page**; and a
  MutationObserver "ready" stamp was unreliable → stamp `readyAt` with a **requestAnimationFrame poll**.

## Procedure

1. **Read config.** `scenarios.json` (base URL, run command, `dataRequestUrlPattern`, and each
   scenario's `path` + `readySignal` + `dataItemCountSelector`). No login here — the backend
   runs `debug_no_access_control`. The app proxies `/graphql` → `:8000`.
2. **Start the app** if not already up: `npm run dev` (serves `http://localhost:3100`). Confirm
   it responds before measuring.
3. **Install instrumentation BEFORE app scripts.** Inject `PROBE_SRC` from `collect.js` as an
   init/document-start script (chrome-devtools MCP: create the page, add the script to run on
   new document, *then* navigate). This installs a `PerformanceObserver` (paint/LCP/CLS), a
   `fetch` wrapper timing `/graphql` calls + tracking in-flight, and a `MutationObserver` that
   stamps when the ready DOM signal (`[data-testid="stocktake-row"]`) first appears. Buffered
   observers alone miss SPA candidates after a route change — the pre-installed probe is why we
   can capture them.
4. **Throttle** via `emulate`: default **6× CPU** (matches the Lenovo M10 target) + optionally a
   slow network preset. Record the exact settings for the row.
5. **Run N times** (default 5, reload between, **drop the first as warm-up**). For each run:
   wait for `readySignal`, then poll until the data layer is quiet (no in-flight `/graphql` for
   ~500ms), then eval `COLLECT_SRC` and keep the JSON. After a heavy-throttle reload the renderer
   can report "Target crashed" — detect, wait for recovery, and **retry that run** rather than
   recording a bad sample.
6. **Aggregate**: median + min–max across the kept runs for the headline/network timings; format
   as `"<median> (<min>–<max>)"`. Gather run context (git branch/commit via `git`, machine cores
   /OS/Chrome UA, throttle, cold/warm, `dataItemCount` from the collector).
7. **Append** one row: `node .claude/skills/perf-measure/append-row.mjs '<json>'`. Keys must
   match COLUMNS. The appender creates the doc on first run and refuses to write if the `<!--ROWS-->`
   marker is missing/duplicated.
8. **Report** the headline numbers and compare against the previous row for the same scenario
   (regression/improvement).

## Fixed metric set (do not drop; extras allowed after)

Context: UTC time · scenario · branch · commit · machine · CPU× · network · cold/warm ·
**data items** · runs (N) · notes.
Headline (content-based, the ranking metrics): **timeToDataRenderedMs**, **timeToNetworkQuietMs**.
Network: dataRequestCount, slowestDataRequestMs.
Reference (record, don't rank): ttfbMs, fcpMs, loadMs, cls, lcpMs.
Memory/weight: jsHeapUsedMB, domNodes, requestCount, transferKB.

## Gotchas (hard-won — do not skip)

- **Never headline on `load` or LCP for this SPA.** The table is client-rendered after first
  paint and data arrives via GraphQL *after* `load` fires; `load` can read ~10× too fast and
  **LCP is frequently null**. Record them for reference only; rank on network-quiet.
- **One run is noise** (cold/warm, GC, renderer hiccups under throttle swing results 20–40%).
  Always N runs, drop the warm-up, report median + spread.
- **Comparability needs context on every row** — machine, CPU×, cache, and **data-item count**.
  A 9-row filtered view and the full ~1,506-line view are not comparable.
- **Determinism**: the in-page JS lives in `collect.js` and is injected verbatim each run;
  bump `COLLECTOR_VERSION` if you change what's collected.
- **Append-only**: the results doc is marker-guarded; don't hand-edit rows.
