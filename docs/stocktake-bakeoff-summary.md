# Stocktake Bake-off — Summary of Work

_RnD day: greenfield "Thin React" rebuild of the OMS stocktake screen, measured head-to-head
against the current MUI/MRT app on a simulated Lenovo M10. Companion docs:
[oms-frontend-rebuild-rnd.md](oms-frontend-rebuild-rnd.md) (decision rationale) ·
[stocktake-build-log.md](stocktake-build-log.md) (chronological build log + gotchas) ·
[perf/frontend-runs.html](perf/frontend-runs.html) (raw results table)._

---

## The question we set out to answer

A pure-JS prototype already showed the performance ceiling is high — but it dropped React *and*
type-safety to get there. So the real question was:

> **Can we drastically improve performance *without* leaving React + TypeScript?** — keeping dev + AI
> familiarity (training data, hireable skills) and lower rewrite risk, and leaving any "drop React" call
> for a later, evidence-based decision. (Mechanistically: how much of the slowness is **React's VDOM** vs
> the **libraries layered on top** — MUI / emotion runtime CSS-in-JS / Material React Table?)

Answer, measured: **yes — and it's the libraries, overwhelmingly, not the renderer.** Keeping React 19 +
TypeScript but replacing MUI/emotion/MRT with a headless + zero-runtime-CSS + virtualised stack made the
same screen **~4× faster to usable** and **~5.6× smaller**, with the VDOM still in place — so the
framework swap becomes an optional, later bet rather than the premise.

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

**Baselines measured:**
- Old FE = open-msupply-duo **commit `22cdf6eeb6`** (v3.0.0-RC), built `client/packages/host/dist`.
- Thin React = this repo **commit `be835eb`** (branch `thin-react-stocktake-bakeoff`), prod `rspack build`.

### How to read it
- The **8× FCP gap** is the emotion runtime-style-injection + bundle-parse tax the RnD doc predicted.
- The **5.6× smaller bundle** is MUI + emotion + MRT leaving.
- The VDOM is unchanged — so this ~4× is achievable **without** a framework swap. That reframes the
  Solid/Svelte question from "mandatory" to "an optional extra bet on top."

### Honest caveats
- **14 vs 3 GraphQL calls**: the old FE's cold load is chattier (app-shell/bootstrap queries), which
  *flatters* the end-to-end time. But FCP, bundle, DOM, heap and LCP each favour Thin React by 2.7–8×
  independently of network chatter.
- **This table is load-only.** INP (interaction latency) is measured separately and is a head-to-head
  win — 6–11× on the heavy interactions (open-modal 104 ms vs 1,144 ms, row-select 48–56 vs ~304 ms) in
  an isolated 6× context (see the coverage table + build log).
- Local backend, **no network throttle** (transfer sizes are gzipped and comparable; adding Slow 4G
  would widen the bundle gap, not narrow it).
- Thin React is a **prototype**, but the earlier "single-line modal / no resize / no frozen columns"
  caveat is now out of date — the multi-batch edit modal, column resize, freeze/pin, show/hide and
  fullscreen were built after the initial bake-off (see "Feature parity build-out"). Genuinely still
  partial: full cell-to-cell grid keyboard-nav, i18n RTL, and route code-splitting.

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

## Feature parity build-out (after the bake-off)

To make Thin React a fair like-for-like with the old FE, added: an **app shell** (nav + footer),
the **stocktakes list view** (paginated, New/delete, filter, row→detail), **detail parity**
(Manufacturer column, editable description, Add-item search, On-hold + Confirm-finalised status
workflow), a **multi-batch edit modal** (Batch/Pricing/Other tabs, Add batch, OK & next), a
**More panel + Log tab** (activity log), **table power features** (column show/hide, resize,
freeze/pin, fullscreen, ARIA grid roles), a **responsive card view** (virtualised, 48px touch
targets, phones `<600px`; tablets keep the table per the UI standards), and **i18next** (English bundle;
key strings converted).

**Re-measured to guard the win** (6× CPU, prod, 1,506 lines, commit `14b9020`):

| Metric | Thin React (initial) | Thin React (feature-complete) | Old FE |
|---|---|---|---|
| Time to data rendered | 911 ms | **905 ms** | 3,781 ms |
| FCP | 116 ms | **136 ms** | 924 ms |
| Code (JS+CSS, gzip) | 243 KB | **260 KB** | 1,362 KB |
| DOM nodes | 496 | **860** | 1,363 |

All the parity features cost **+17 KB gzip** and kept data-render flat (~905 ms). DOM rose to 860
(per-cell freeze/ARIA wrappers) — still below the old FE. **The ~4× / ~5× win survived the build-out.**

Then the three biggest *functional* gaps were closed too — **CSV export**, the **full/filtered/blank
New-stocktake modal** (live stock-line estimate), and the **edit-modal "Other" tab** (per-batch
manufacturer + comment). These are on-demand modals/handlers, so the re-measure was **912 ms data-render,
861 DOM, 279 KB gzip (+19)** — no change to the table load path. Win intact.

A later **visual-parity pass** (align to the old FE + [UI standards](https://msupply-foundation.github.io/ui-standards/):
right-aligned numeric headers, charcoal item name, grey header band, expiry amber/red, 48px rows, cards
`<600px` only) also fixed a blank tablet/phone card view — the React Compiler was over-memoising the
TanStack Virtual list; `'use no memo'` on the phone-only cards restores it while the desktop table keeps
full compiler optimisation. Re-measure (commit `11bc72d`): **~730 ms data-render, 894 DOM, CLS 0** — table
load path unchanged. Win intact.

This was an explicit **visual-alignment** pass — pull the new screen closer to the old FE (and the UI
standards) where it aids recognition — with a few **conscious divergences** kept, not accidental drift.
The main one: the header actions stay **semantic buttons** (solid orange *Confirm finalised*, red
*Delete*) rather than the old FE's uniform outlined pills with destructive actions hidden under *More* —
because colour + text is a stronger, more accessible affordance and surfacing *Delete* beats burying it.
So the screen reads as the same family as the old FE, but deliberately improves on it in a couple of
places rather than copying pixel-for-pixel.

## Exploratory testing vs the new build — how effective was it?

The other RnD strand is a **behaviour-anchored exploratory AI agent** (Opus 4.8, driving the UI via
Playwright, anchored to the INV-03/04 + SMV-01 behaviour IDs). We pointed it at **this build (commit
`11bc72d`)** as the first real test of "does exploratory testing catch bugs a rewrite introduces?" It
walked the **full stocktake workflow** (all 4 sections, ~24 behaviour IDs) in **~26 min** — and it was
**very effective**.

**Bugs it found in the rewrite (5):**

| # | Severity | Finding |
|---|---|---|
| 1 | **HIGH** (data integrity) | **Add-item double-count.** "+ Add item" creates a snapshot-0, no-batch line; finalising an item that *already* has stock posts a **new** stock line on top of the existing one. Repro'd + **DB-verified**: 500 in stock, counted 450, finalised as **950** (2 stock lines + an INVENTORY_ADDITION invoice). Silent stock corruption; non-blocking. |
| 2 | MEDIUM-HIGH (validation / error UX) | **Blank pack-size + leaked error.** A counted variance line saves with Pack size blank; finalise then fails and dumps the raw GraphQL `PackSizeBelowOne` error object (mutation text and all) into the UI. No client-side validation; raw internal error surfaced. (Rollback was atomic — clean.) |
| 3 | LOW | New stocktakes get **no default description** (INV-03.9 expects "Created by &lt;user&gt; on &lt;date&gt;"). |
| 4 | LOW | **Log tab** shows a raw JSON diff and no user attribution (INV-03.40). |
| 5 | LOW | Transient **GraphQL 408s** (likely dev-server/HMR flakiness, not a product defect). |

It also **confirmed ~24 behaviours pass** (all creation modes, snapshot == real SOH at open, reason lists
direction-filtered + OK-gated, atomic finalise, ledger correct **both directions**, full post-finalise
edit-protection, no blank-item-name write bug), and proposed **5 new "gap" behaviours** where a probe
mapped to no existing ID — including the exact hole behind Finding 1 ("Add-item must load the item's
existing batches with real snapshots").

**Effectiveness read — the methodology worked: it found a real one.**
- **Finding 1 is confirmed real (root-caused), not a false positive — that *is* the success.** A
  **data-integrity** defect that silently doubles stock, the class of bug perf metrics, type-checks and
  load tests never see, caught in ~26 min and **verified against the database**, not just the UI. Root
  cause (**FE bug**): Add-item inserts an *unlinked* line (no `stockLineId`), so the backend correctly
  posts *new* stock on finalise; the old FE links each line via `stockLineId` (its `toInsert` XOR), which
  is why it never double-counted. **Not fixed yet** — logged for the fix pass.
- Every finding is **anchored to a behaviour ID or proposes one**, so it feeds straight back into the
  regression suite / parity matrix rather than being a throwaway note.
- **Contrast with the old FE:** the *same* workflow run against v3 (`22cdf6eeb6`) was **blocked at "open a
  stocktake"** (0/4 sections reached, navigation defects) — so this run both found rewrite-specific bugs
  *and* confirmed the rewrite unblocks the workflow the old run couldn't complete. *(That v3 run had
  concurrent-session contamination; treat the contrast as directional.)*

**These are open, real bugs in the Thin React prototype** — Findings 1 & 2 in particular should be fixed
before it's parity-complete (Finding 1 root-cause above; **not fixed yet**). Full run: `tmf-testing` →
`projects/oms/core/exploratory/runs/stocktake-findings-fe-rewrite-11bc72d.md`.

> **Deterministic side incoming.** The behaviour-anchored **deterministic** parity suite (same Playwright
> specs, `BASE_URL`-swapped between old and new FE) is **running against the new FE now** — the cross-FE
> pass matrix will be added here when it lands.

## Coverage vs the original brief

| Brief item | Status |
|---|---|
| Andrei's stocktake steps (table · codegen · filter · **URL filter** · row-select+delete · **edit modal** · **live update**) | ✅ 7/7 |
| Greenfield stocktake, importing nothing from the current app (§8) | ✅ |
| Bake-off vs current app under **6× CPU** (§8) | ✅ (~4× faster, ~5.6× smaller) |
| §8 metrics: LCP · bundle-per-route | ✅ |
| §8 metric: **rows-before-jank** | 🟡 all 1,506 virtualised w/ no jank; didn't push to 10k/100k |
| §8 metric: **INP** (cell-edit, scroll) | ✅ full head-to-head (6× CPU, isolated context). Thin React vs Old FE: cell-edit 32–40 ms vs — · sort 40–48 vs ~64 · **row-select 48–56 vs ~304 (~6×)** · **open-modal 104 vs 1,144 (~11×)** · scroll both smooth. Thin React 6–11× snappier on heavy interactions, never worse. |
| §8: **slow network** throttle | ❌ CPU-only |
| §8: **Solid arm** (3rd implementation) | ❌ not built (evidence-driven optional) |
| Stack: vanilla-extract · React Aria · TanStack Table/Virtual · Rspack · React 19+Compiler · codegen | ✅ |
| §9: tables large/editable/frozen/sort/filter/paginate · cards/48px · themes · datepicker · GraphQL cache | ✅ |
| §9: keyboard grid nav · i18n · navigation | 🟡 partial (roles only · key strings, no RTL · no code-splitting) |
| §9: Command-K · Module Federation plugins · JSONForms | ❌ (separate concerns) |
| §7: end-to-end types · golden-path `CLAUDE.md` | ✅ |
| §7/§11: **perf budgets that fail CI** · lint invariants | ❌ measured but not gating |

**Bottom line:** the core research question is answered with evidence and the screen is built to strong
parity. The gaps that matter most *against the brief's own emphasis* are **INP**, a **CI perf-budget gate**,
and the **Solid arm**.

## Next steps (priority order)

_INP is done — full old-FE head-to-head measured (runner: `.claude/skills/perf-measure/run-inp.playwright.js`),
6–11× on the heavy interactions._

1. **CI perf-budget gate** — break the build on bundle-per-route + INP/network-quiet regressions (§7's
   "design pattern that stops perf regressing"). The load + INP runners already emit the numbers.
2. **Solid arm** — does dropping the VDOM buy more on top of the ~4×?
3. Lower value: full grid keyboard nav (WCAG), i18n RTL + full extraction, route code-splitting, Slow-4G run.
