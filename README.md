# rnd-the-fe — "Thin React" front-end bake-off

Greenfield rebuild of the open mSupply **stocktake** screen, built for an R&D day to answer one question:

> **Can we drastically improve front-end performance *without* leaving React + TypeScript?**

A pure-JS prototype had already shown the performance ceiling was high — but it dropped React *and*
type-safety to get there. This arm keeps **React 19 + TypeScript** and removes only the heavy libraries
(MUI / emotion / Material React Table) to see how far that alone gets us — keeping dev + AI familiarity,
lowering rewrite risk, and leaving any "drop React" call as a *later, evidence-based* decision rather than
the premise.

**Start here:** [RND-DAY.md](RND-DAY.md) — the joining story + status. Talk deck:
[docs/rnd-day-slides.html](docs/rnd-day-slides.html).

---

## What we did

Two strands, one thesis: *a rewrite is justified when you can **measure the win** AND **prove parity**
with tests that don't care which front end they run against.*

### Strand A — performance (this repo)

Rebuilt the stocktake screen from an empty folder: **React 19 + Compiler + Rspack**, **TanStack Table +
Virtual** (headless, virtualised, plain DOM cells), **vanilla-extract** (zero-runtime CSS, no emotion),
**React Aria** (accessible dialog / DatePicker / select), graphql-request + codegen + TanStack Query
against the **real** backend. Measured head-to-head against the current MUI/MRT app at **6× CPU** (Lenovo
M10 proxy), prod builds, same 1,506-line stocktake:

| Metric | Old FE (MUI+MRT+emotion) | Thin React | Win |
|---|---|---|---|
| Time to data rendered | 3,781 ms | **911 ms** | ~4.1× |
| First Contentful Paint | 924 ms | **116 ms** | ~8× |
| Code transfer (JS+CSS, gzip) | 1,362 KB | **243 KB** | ~5.6× |
| DOM nodes | 1,363 | **496** | ~2.7× |
| JS heap | 97 MB | **36 MB** | ~2.7× |
| INP — open edit modal | 1,144 ms | **104 ms** | ~11× |

**Answer: yes — and we don't have to leave React to get it.** The win holds with the VDOM still in
place, so the slowness was overwhelmingly the **libraries, not React's renderer** → the React→Solid/Svelte
swap becomes an *optional, later* bet, not the premise of the rewrite.

More detail: [stocktake-bakeoff-summary.md](stocktake-bakeoff-summary.md) (results) ·
[oms-frontend-rebuild-rnd.md](oms-frontend-rebuild-rnd.md) (decision rationale) ·
[stocktake-build-log.md](stocktake-build-log.md) (chronological log) ·
[docs/perf/frontend-runs.html](docs/perf/frontend-runs.html) (raw measured rows).

### Strand B — parity testing (in the `tmf-testing` repo)

Behaviour IDs are a single source of truth; a **deterministic** Playwright suite and an **exploratory AI
agent** both anchor to them; the old app is the oracle, so the rewrite becomes **differential testing**
scored on a per-behaviour parity matrix. Pointed at this build, the exploratory agent already found a
**HIGH data-integrity bug** (Add-item double-count, root-caused to the FE) + 4 more in ~26 min. See
[RND-DAY.md](RND-DAY.md) (Strand B) for the full picture.

> **Where Strand B lives:** the `tmf-testing` repo, on the **`behaviour-anchored-testing-strategy` branch
> (PR #10) — not `main` yet**, so check that branch out. Key files (all top level unless noted):
> `FRONTEND_REWRITE_PARITY.md`, `AUTOMATED_TESTING_STRATEGY.md`, and the exploratory findings for this
> build at `projects/oms/core/exploratory/runs/stocktake-findings-fe-rewrite-11bc72d.md`.

---

## Run it

```bash
npm install && npm run codegen   # types from the live :8000 schema
npm run dev                      # rspack dev server → http://localhost:3100 (proxies /graphql → :8000)

# production build, served like the bake-off (gzip + /graphql proxy + SPA fallback):
npm run build && node scripts/serve-prod.mjs 3200
```

Backend: `http://localhost:8000/graphql`, run with `debug_no_access_control: true`. Reference stocktake
`019f17d0-1444-795c-ac53-da2216c73cff`, store `5B28901C52396E4BB098B9862CCF5DF9` (CHC Ermera). Other
commands (`codegen`, `typecheck`, `build`) and the golden-path rules + layout: [CLAUDE.md](CLAUDE.md).

## Perf harness

`.claude/skills/perf-measure/` — a project-tailored measurement skill: 6× CPU throttle + document-start
probe + median-of-N, appending a comparable row to `docs/perf/frontend-runs.html`. The reusable
meta-prompt teammates can use to generate their own: [bench-prompt.md](bench-prompt.md) (how it was built:
[bench-prompt-journey.md](bench-prompt-journey.md)).

---

## Reference — the original brief

_The reference material and prompts this project started from, kept verbatim._

### References

[reference doc](https://docs.google.com/document/d/1kkXyCc2Pf1McYCYDE5_ppvOCMEufVD1E2Z3Rlj0ayPk/edit?tab=t.0#heading=h.gokx2jgewyyw)

[that cli tool Craig suggested](https://github.com/szymdzum/browser-debugger-cli)

[bench-prompt.md](bench-prompt.md)

[reference data file](https://drive.google.com/drive/u/1/folders/1QJnS9_l5PQHUSUOD2ULrthkQMuSZnwQB), stocktake:  019f17d0-1444-795c-ac53-da2216c73cff, store_id: 5B28901C52396E4BB098B9862CCF5DF9, use v3.0.0-RC branch, enable in yaml: `debug_no_access_control: true`.

### Stocktake page

If I (Andrei) was implementing it, I would go step by step, measure performance stats and observing what updates when

* Create basic table
* graphql/codegen
* Filter
* Filter in url parameter
* Add checkbox on each row and delete button, delete button deletes selected row
* Add modal for editings stock lines
* After edits in modal table updates

### Examples of things/areas, as an alternative

* Auth and shell, how it's gated and routed, including initialisation (use this PR)
* Lighter version of JSON forms
* How to use AI for performance tests/evaluation
* Design pattern <-> implementations (how to keep those in sync, leverage AI)
* Plugins with vite
* What packager to use ?
