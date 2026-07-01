# Stocktake (Thin React) — Build Log

Running log of decisions and learnings while building the greenfield stocktake screen.
Companion to [oms-frontend-rebuild-rnd.md](oms-frontend-rebuild-rnd.md) (the pre-build
decision doc) — this file is the *during-build* record. Newest entries at the bottom.

---

## Locked decisions (2026-07-01)

| Concern | Choice | Why |
|---|---|---|
| Bundler/scaffold | **Rspack** | User pick; webpack-compatible, keeps Module Federation path open for later |
| Renderer | **React 19 + React Compiler** | Bake-off control arm; auto-memoisation replaces manual `memo`/`useMemo` |
| Table | **TanStack Table + TanStack Virtual** | Headless logic + row virtualisation; plain DOM cells |
| Zero-runtime CSS | **vanilla-extract** | At runtime all zero-runtime options are a wash (no per-render serialisation); VE wins on **typed token contracts** (TMF tokens → CSS vars) and works in **both** React & Solid arms |
| Headless / a11y | **React Aria** | Strongest WCAG 2.2 **grid** keyboard-nav + the DatePicker the RnD doc wants. Solid arm uses Kobalte regardless, so cross-arm sharing was never the tie-breaker |
| Data | **Real GraphQL backend** via graphql-request + graphql-codegen | Faithful perf numbers |
| Scope (this build) | **Full editable workflow** + wire perf harness early | User pick |

## Learnings from probing the live app (localhost:3003 / backend :8000)

- **Endpoint:** `http://localhost:8000/graphql`. Login `check` / `pass` (local v3.0.0-RC).
- **No auth needed for queries:** backend runs `debug_no_access_control: true` — a
  cookie-less query succeeded. So the prototype skips the whole login flow. We still
  **proxy `/graphql` → `:8000` via the Rspack dev server** so the app is same-origin
  (dodges CORS + keeps the client trivial).
- **Reference target:** stocktake `019f17d0-1444-795c-ac53-da2216c73cff` (#112, status
  **NEW / editable**, `isLocked:false`), store **CHC Ermera** `5B28901C52396E4BB098B9862CCF5DF9`,
  **1,506 lines** — the rows-before-jank target. Switch store via the **footer store name**;
  the stocktake 404s ("Stocktake not found") if the wrong store is active.
- **Server-side everything:** `stocktakeLines(stocktakeId, storeId, page, sort, filter)`
  does pagination + sort + filter on the server.
  - Filter (the "Filter items" box): `filter.itemCodeOrName: { like: "..." }`.
  - Sort: `[StocktakeLineSortInput!]` `{ key, desc }`, key ∈ {itemCode, itemName, batch,
    expiryDate, packSize, locationCode, snapshotNumberOfPacks, countedNumberOfPacks, reasonOption}.
  - Mutations: `updateStocktakeLine` (id, countedNumberOfPacks, reasonOptionId, batch,
    expiryDate[NullableDateUpdate], …), `deleteStocktakeLine` ({id}), `batchStocktake`
    (used by the multi-batch edit modal).
- **Columns to replicate:** select · Code · Name (default sort) · Batch · Expiry · Manufacture ·
  Location · Unit name · Pack size · Packs snapshot · **Packs counted (editable)** ·
  **Difference (computed)** · **Reason (dropdown)** · Manufacturer · Comment (horizontal scroll).
- **Edit-line modal** = a mini editable batch sub-grid (tabs Batch/Pricing/Other; date pickers
  DD/MM/YYYY; Reason dropdown; "Add batch (+)"; Cancel / OK / **OK & next**).

## Toolchain gotchas (scaffold)

- **One JSX transform, not two.** Don't stack `builtin:swc-loader` + `babel-loader` on the
  same `.tsx` (double JSX transform breaks). Use **babel-loader only** for app source:
  it does TS strip + JSX (automatic) + **React Compiler** (`target:'19'`) + react-refresh
  in one pass. Slower builds, but build speed isn't the variable we measure.
- **vanilla-extract + Rspack:** set `experiments.css: false`, then `VanillaExtractPlugin`
  + `rspack.CssExtractRspackPlugin` + `css-loader` (`{ url:false }`) for `.css`, so VE owns
  the CSS pipeline and rspack's native CSS doesn't double-process the emitted files.
- **`@babel/preset-env` target `chrome:87`** to mirror the M10-era Chromium WebView.

## Runtime gotchas hit during wiring (all fixed)

- **graphql-request v7 needs an absolute URL.** `new GraphQLClient('/graphql')` throws
  `Failed to construct 'URL': Invalid URL`. Fixed by resolving against
  `window.location.origin` (still same-origin → still proxied). Symptom was a silent
  query rejection with **no** network request.
- **The backend enforces adjustment reasons.** `updateStocktakeLine` with a counted value
  that creates a variance but **no `reasonOptionId`** returns `UpdateStocktakeLineError`
  (`AdjustmentReasonNotProvided`), and the reason **type must match the variance sign**
  (`POSITIVE_/NEGATIVE_INVENTORY_ADJUSTMENT`). Our mutation now selects the error branch and
  throws it; the UI tracks a **pending counted value** so picking a reason commits
  counted + reason together (the edit modal already sends both in one shot).
- **Derived-state trap in the inline counted cell.** The cell's local `draft` didn't refresh
  when the value changed externally (edit modal / refetch), so the input showed stale text
  while the Difference column was correct. Fixed with a focus-guarded `useEffect` that
  re-syncs `draft` from props unless the user is actively typing that input.
- **Edit modal must not coerce unset pack size.** An empty Pack size was being sent as `1`;
  now only sent when it parses to a positive number.
- **Playwright + controlled inputs:** `fill()`/`pressSequentially()` didn't reliably fire
  React's `onChange` for controlled inputs here (only a native-setter + `input` event did).
  Test artifact only — real keystrokes fire `onChange` fine.

## Verified working (real backend, 1,506 lines, no throttle yet)

- Virtualised table renders all 1,506 lines; only the visible window is in the DOM.
- **Server sort** — clicking a sortable header issues `sort:[{key,desc}]` (verified `batch`),
  combined with the active filter in one query.
- **Server filter + URL** — the filter box debounces to `?filter=` and issues
  `filter.itemCodeOrName.like` (verified "paracetamol" → 9 of 9).
- **Inline counted edit** → `updateStocktakeLine`; **Reason** select scoped to variance sign.
- **Edit modal** (React Aria Dialog + DatePicker) saves counted + reason together;
  **live update** via TanStack Query invalidation (Difference + Reason refresh on the row).
- **Row selection** (incl. select-all) + **Delete (n)** button enablement; delete mutation
  wired. *Live destructive delete against the reference stocktake was intentionally NOT run*
  (it would drop the 1,506-line perf baseline / real data we didn't create).

## Deliberate scope cuts (prototype, noted for honesty)

- **Manufacturer** column dropped from the lean fragment (extra join); Comment kept.
- Edit modal is a **single-line editor**, not the OMS multi-batch sub-grid (Batch/Pricing/Other
  tabs, "Add batch", "OK & next"). The single-line form covers the same fields + the React Aria
  DatePicker; multi-batch is a follow-up.
- Column resize / frozen columns / full grid keyboard-nav (WCAG 2.2 grid pattern) not yet built
  — these are the "real work" the RnD doc flagged as MRT-parity cost.

## Perf-measure harness (per bench-prompt.md)

Built the project-tailored skill at `.claude/skills/perf-measure/`:
- `collect.js` (v3) — `PROBE_SRC` (inject at document-start: PerformanceObserver paint/LCP/CLS,
  `fetch` wrapper timing `/graphql` + in-flight tracking, MutationObserver stamping the ready
  signal) + `COLLECT_SRC` (reads the fixed metric set). Ready signal = `[data-testid="stocktake-row"]`;
  data-item count = `[data-testid="stocktake-lines"]@data-line-count` (both added to the app).
- `append-row.mjs` — owns the HTML; `COLUMNS` is the single source of truth; inserts before
  `<!--ROWS-->` and refuses to write if the marker isn't unique. **Verified**: two appends keep
  the marker count at 1. Results doc created at `docs/perf/frontend-runs.html`.
- `scenarios.json` (+ example), `SKILL.md`, `README.md`. No login (debug_no_access_control).
- Headline ranking metric = **timeToNetworkQuietMs** (data layer idle), not `load`/LCP.

**No chrome-devtools MCP needed after all.** The Playwright MCP's `browser_run_code_unsafe` gives raw
`page` access → a CDP session does `Emulation.setCPUThrottlingRate {rate:6}` + `addInitScript`
(document-start probe) + network emulation + heap snapshots. Reusable runner:
`.claude/skills/perf-measure/run-throttled.playwright.js`. (chrome-devtools MCP was simply not
connected to the session, and can't be self-installed mid-session — but it isn't required.)
Two gotchas learned: `addInitScript` **accumulates** across calls (guard makes new probes bail) →
run on a **fresh page**; MutationObserver ready-stamp was unreliable → use a **rAF poll**.

## Headline result — 6× CPU throttle (M10 proxy), 5 runs (warm-up dropped)

Measured via Playwright CDP, `debug_no_access_control` backend, **DEV build**:

| Metric | Thin React | Note |
|---|---|---|
| Data items | **1,506** | full reference stocktake, unpaginated |
| **Total DOM nodes** | **496** (constant) | virtualisation: independent of row count |
| **Time to data rendered** | **1,163 ms** (1,145–1,170) | nav start → 1,506 rows on screen, 6× CPU |
| **Time to network quiet** | **1,051 ms** (1,029–1,092) | data layer idle (ranking metric) |
| Slowest data request | 311 ms (293–350) | 3 GraphQL calls total |
| FCP | 252 ms (244–260) | |
| LCP | **1,212 ms** (1,188–1,216) | not null here — table is the largest paint on fresh nav |
| CLS | 0 | |
| JS heap | 120 MB (78–166) | varies with GC |
| Transfer | 2,105 KB | **DEV/unminified — not representative**; measure prod build for bundle size |

Tight spread (data-rendered 1,145–1,170) → the numbers are stable. For contrast, the RnD journey doc
measured the **current** OMS stocktake at **~1,626 DOM nodes for a paginated 20-row page**; here the
*entire* 1,506-line dataset is **496 DOM nodes**. Virtualisation thesis: demonstrated under throttle.
First row recorded in `docs/perf/frontend-runs.html`.

## Production build — 6× CPU throttle (served via `scripts/serve-prod.mjs`, gzip + /graphql proxy)

| Metric | Dev | **Prod** |
|---|---|---|
| Time to data rendered | 1,163 ms | **911 ms** (877–930) |
| Time to network quiet | 1,051 ms | **910 ms** (889–925) |
| FCP | 252 ms | **116 ms** (112–128) |
| LCP | 1,212 ms | **964 ms** (928–980) |
| JS heap | 120 MB | **36 MB** (21–56) |
| **Code transfer (JS+CSS, gzip)** | 2,105 KB (raw, unminified) | **243 KB** |
| Total transfer | — | 351 KB (incl. GraphQL data) |
| DOM nodes | 496 | **496** |

So the **whole Thin-React app is ~243 KB gzipped JS+CSS**, renders **1,506 rows in ~911 ms on a 6×-throttled
CPU**, holds **496 DOM nodes** and **~36 MB heap**. That's the baseline the Solid arm and the current
MUI/MRT app get measured against. (To serve the prod build for measurement: `npm run build` then
`node scripts/serve-prod.mjs 3200`.)

## BAKE-OFF: Old FE (MUI/MRT) vs Thin React — 6× CPU, prod builds, both served identically

Same stocktake (#112, 1,506 lines, CHC Ermera), same `:8000` backend, both prod builds served via
`serve-prod.mjs` (gzip + `/graphql` proxy), 5 runs each (warm-up dropped), measured via Playwright CDP.
**Commits measured:** old FE `22cdf6eeb6` (open-msupply-duo, v3.0.0-RC, built `packages/host/dist`);
Thin React `be835eb` (this repo, branch `thin-react-stocktake-bakeoff`, prod `rspack build`).
**Both virtualise the full set** (old FE MRT renders 13 rows in DOM, Thin React 27) — no pagination on
either detail view, so it's apples-to-apples on the dataset.

| Metric | Old FE (MUI + MRT + emotion) | **Thin React** | Win |
|---|---|---|---|
| **Time to data rendered** | 3,781 ms (3,748–3,941) | **911 ms** (877–930) | **~4.1× faster** |
| **Time to network quiet** (rank) | 3,669 ms (3,633–3,806) | **910 ms** (889–925) | ~4.0× faster |
| **FCP** | 924 ms (888–932) | **116 ms** (112–128) | ~8× faster |
| LCP | 1,448 ms | **964 ms** | ~1.5× |
| CLS | 0.045 | **0** | — |
| **Code transfer (JS+CSS, gzip)** | 1,362 KB | **243 KB** | **~5.6× smaller** |
| Total transfer (gzip) | 1,649 KB | **351 KB** | ~4.7× |
| DOM nodes (same screen) | 1,363 | **496** | ~2.7× |
| JS heap | 97 MB | **36 MB** | ~2.7× |
| GraphQL calls on load | 14 | **3** | ~4.7× fewer |
| HTTP requests | 37 | **7** | ~5× fewer |

**Read:** keeping React but removing MUI/emotion/MRT gives ~**4× faster time-to-usable** and a ~**5.6×
smaller bundle** on the M10 proxy — with the **VDOM still present**. That directly answers the RnD
question: most of the measured slowness was the **libraries, not the renderer**. The FCP gap (8×) is the
emotion runtime-style-injection + bundle-parse tax the doc predicted. The 14-vs-3 GraphQL calls is a
second, separable win (app-shell/bootstrap chattiness) — worth noting it flatters the end-to-end number,
but even discounting it, render/paint/bundle/DOM/heap all favour Thin React by 2.7–8×.

Recorded in `docs/perf/frontend-runs.html` (rows: Thin React dev, Thin React prod, Old FE prod).

## Still to measure

- **INP** on cell-edit + scroll (interaction latency) — the other half of the M10 story, both apps.
- **Solid arm** (same TanStack Table/Virtual, Kobalte, vanilla-extract) — to test whether dropping the
  VDOM buys more on top of Thin React's already-4× win.
- Optional: **network throttle** (Slow 4G) to model remote-site loads (would widen the transfer gap).
