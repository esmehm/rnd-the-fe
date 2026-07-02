# perf-measure (this project's copy)

Measures a page under CPU/network throttle and appends a **comparable** row to
`docs/perf/frontend-runs.html`. Part of the stocktake bake-off: everyone reports the same
fixed metric set so branches/people line up.

## One-time setup

- **chrome-devtools MCP** must be available (the skill drives it: new page, add-init-script,
  navigate, emulate, evaluate, wait). If you only have Playwright, ask Claude to emit an
  equivalent `npm run perf` Playwright runner that follows the same protocol and writes the
  same HTML — the fixed metric set + rules are the contract, not the runner.
- No credentials needed: the backend runs `debug_no_access_control` and the app proxies
  `/graphql` → `http://localhost:8000`. (If that ever changes, add a gitignored
  `perf.local.json` and load creds from it — never hardcode secrets.)

## Run it

```
npm run dev            # serve on :3100 (in another terminal)
```
Then ask Claude: **"run a perf test on the stocktake scenario"** (optionally `--runs 5 --cpu 6`).

## Files

- `SKILL.md` — the procedure + the non-negotiable gotchas.
- `collect.js` — versioned in-page collector: `PROBE_SRC` (inject at document-start) +
  `COLLECT_SRC` (read metrics after ready). Bump `COLLECTOR_VERSION` if you change the shape.
- `append-row.mjs` — owns the HTML format; `COLUMNS` is the single source of truth; inserts
  before the `<!--ROWS-->` marker and refuses to write if it's missing.
- `machine.mjs` — prints the machine descriptor (`chip (Nc, NGB) macOS x`) for the `machine`
  field, so rows are comparable across teammates. The chip name isn't visible from the browser.
- `scenarios.json` — pages to measure (`path`, `readySignal`, `dataItemCountSelector`).

## Add a scenario

Add an entry to `scenarios.json` with a friendly `name`, the `path`, a `readySignal` DOM
selector (the moment the *real content* is on screen — not `load`), and a
`dataItemCountSelector`. In the app, expose a stable `data-testid` for both.

## Add a metric

Add a field in `collect.js` `COLLECT_SRC` (bump `COLLECTOR_VERSION`) and a matching entry in
`append-row.mjs` `COLUMNS`. Keep the fixed columns; put extras after them.

## Ranking metric

**timeToNetworkQuietMs** — when the data layer goes idle — is the real "page is done" moment
for this data-fetching SPA. Do not rank on `load`/LCP.
