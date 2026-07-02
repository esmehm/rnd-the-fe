# rnd-the-fe — "Thin React" front-end bake-off

Greenfield rebuild of the open mSupply **stocktake** screen, built to answer one question:

> **Can we drastically improve front-end performance *without* leaving React + TypeScript?**

A pure-JS prototype had already shown the performance ceiling was high — but it dropped React *and*
type-safety to get there. This rebuild keeps **React 19 + TypeScript** and removes only the heavy
libraries (MUI / emotion / Material React Table) to see how far that alone gets us — keeping dev + AI
familiarity, lowering rewrite risk, and leaving any "drop React" call as a *later, evidence-based*
decision rather than the premise.

**Answer: yes — ~4× faster and ~5.6× smaller, with React kept.** Details below.

> This is the write-up for colleagues. It's the front door: read this, then follow the links into
> [docs/](docs/) for the depth. Talk deck: [docs/rnd-day-slides.html](docs/rnd-day-slides.html).

---

## The bigger picture: two strands, one thesis

The real question behind this work is **"Should open mSupply rewrite its front end — and if we do, how do
we do it safely?"** A rewrite has been proposed to fix performance on the low-spec tablets (Lenovo M10) in
end-client hands. There are two ways a rewrite goes wrong, so I picked two things to de-risk first:

1. **Can we get the performance win *without leaving React/TypeScript*?** — the useful question, since a
   pure-JS demo already showed the ceiling is high. Mechanistically: how much of the slowness is
   **React's VDOM** vs the **libraries layered on top** (MUI / emotion / MRT)?
2. **Can we prove functional parity without hand-QA'ing everything twice?** — a rewrite is only safe if
   we can show the new app does what the old one did, with automated tests that **survive the rewrite**
   and run against **both** front ends.

**One thesis: a rewrite is justified when you can *measure the win* AND *prove parity* with tests that
don't care which front end they're pointed at.** Strand A (this repo) is the measurement; Strand B (the
`tmf-testing` repo) is the parity proof. The chosen proof page is **stocktake** on both sides, so they
meet on the same screen.

---

## Strand A — Performance (this repo)

Rebuilt the stocktake screen from an empty folder — **keeps React, removes everything else**: Rspack +
React 19 + React Compiler, **TanStack Table + Virtual** (headless, plain DOM cells, virtualised),
**vanilla-extract** (zero-runtime CSS, no emotion), **React Aria** (accessible dialog / DatePicker /
select), graphql-request + codegen + TanStack Query against the **real** backend. Built to strong parity
(list view, status workflow, multi-batch edit modal, table power features, responsive cards, CSV export,
New-stocktake modal, i18next), then a visual-parity pass to align with the old FE + UI standards.

Measured head-to-head against the current MUI/MRT app at **6× CPU throttle** (Lenovo M10 proxy), prod
builds, same backend, same 1,506-line stocktake:

| Metric | Old FE (MUI+MRT+emotion) | **Thin React** | Win |
|---|---|---|---|
| Time to data rendered | 3,781 ms | **911 ms** | ~4.1× |
| First Contentful Paint | 924 ms | **116 ms** | ~8× |
| Code transfer (JS+CSS, gzip) | 1,362 KB | **243 KB** | ~5.6× |
| DOM nodes | 1,363 | **496** | ~2.7× |
| JS heap | 97 MB | **36 MB** | ~2.7× |
| INP — open edit modal | 1,144 ms | **104 ms** | ~11× |

**The answer: yes — and we don't have to leave React to get it.** Swapping only the libraries (headless
behaviour + zero-runtime CSS + a virtualised table) made the same screen ~4× faster and ~5.6× smaller.
Because that win holds **with the VDOM still in place**, the slowness was overwhelmingly the **libraries,
not React's renderer** — so the scary part (swap React for Solid/Svelte) drops from *mandatory* to an
*optional, later* bet. We take the low-risk win now, keep the DX and AI-familiarity, and still have
headroom if we ever decide the renderer swap is worth it.

**Read more:** [docs/oms-frontend-rebuild-rnd.md](docs/oms-frontend-rebuild-rnd.md) (why rebuild + the
option spectrum, written *before* the build) · [docs/stocktake-bakeoff-summary.md](docs/stocktake-bakeoff-summary.md)
(full results + coverage scorecard) · [docs/stocktake-build-log.md](docs/stocktake-build-log.md)
(chronological log + the gotchas) · [docs/perf/frontend-runs.html](docs/perf/frontend-runs.html)
(raw measured rows).

---

## Strand B — Parity testing (in the `tmf-testing` repo)

Behaviour IDs are a single source of truth; a **deterministic** Playwright suite and an **exploratory AI
agent** both anchor to them; the old app is the oracle, so the rewrite becomes **differential testing**
scored on a per-behaviour parity matrix:

| | passes on **old** | fails on **old** |
|---|---|---|
| **passes on new** | ✅ replicated | ⚠️ old bug fixed — confirm intended |
| **fails on new** | 🔴 **regression the rewrite introduced** | known-broken, not a blocker |

The 🔴 cell *is* the rewrite blocker list — "done" stops being "feels close" and becomes "every active
behaviour green on new, at visual parity, within perf budget." And because a test breaks on a new FE
mainly through *how it locates elements* (measured ~98% semantic locators), **a stack bake-off doubles as
a portability check** — that's the bridge back to Strand A.

Pointed at this build (`11bc72d`), the exploratory agent walked the full stocktake workflow in ~26 min and
found a **HIGH data-integrity bug** (Add-item double-count, root-caused to the FE) + 4 more — the class of
bug perf metrics and type-checks never see. (Details in [docs/stocktake-bakeoff-summary.md](docs/stocktake-bakeoff-summary.md#exploratory-testing-vs-the-new-build--how-effective-was-it),
"Exploratory testing vs the new build".)

> **Where Strand B lives:** the `tmf-testing` repo, on the **`behaviour-anchored-testing-strategy` branch
> (PR #10) — not `main` yet**. Key files:
> [FRONTEND_REWRITE_PARITY.md](https://github.com/msupply-foundation/tmf-testing/blob/behaviour-anchored-testing-strategy/FRONTEND_REWRITE_PARITY.md)
> (the rewrite-specific strategy) ·
> [AUTOMATED_TESTING_STRATEGY.md](https://github.com/msupply-foundation/tmf-testing/blob/behaviour-anchored-testing-strategy/AUTOMATED_TESTING_STRATEGY.md)
> (the standing model) · exploratory findings for this build at
> [stocktake-findings-fe-rewrite-11bc72d.md](https://github.com/msupply-foundation/tmf-testing/blob/behaviour-anchored-testing-strategy/projects/oms/core/exploratory/runs/stocktake-findings-fe-rewrite-11bc72d.md).

---

## How the two strands join

```
  Behaviour IDs (tmf-testing)  ── single source of truth ──┐
        │                                                    │
        ├─ deterministic tests (Playwright, covers-tagged) ──┤
        └─ exploratory agent (same IDs)                      │
                                                             ▼
                          run against  ──►  OLD FE  ──┐
                          (BASE_URL)                  ├──►  PARITY MATRIX  ──►  rewrite done-state
                                          NEW FE  ──┘        (per behaviour)
                                       (Thin React)
```

- Strand A proves the rewrite is **worth doing** (and that keeping React is fine).
- Strand B proves any rewrite is **done** — and its portability check is *how you'd pick the stack*.

---

## Status at a glance

**Done ✅**
- Thin React bake-off: ~4× faster, ~5.6× smaller, INP 6–11× — **with React + TS kept**; measured, prod, reproducible.
- Built to strong parity + a visual-parity pass (align to old FE + UI standards; one conscious button divergence kept).
- Behaviour-ID single source of truth + CI guard; parity + testing strategy docs (tmf-testing PR #10).
- Exploratory agent run against the rewrite (`11bc72d`) — found a **HIGH data-integrity bug** + 4 more, each anchored to a behaviour ID.

**In progress 🟡**
- Deterministic parity suite running against the new FE → the cross-FE pass matrix (the demo).
- Stocktake deterministic suite (open-msupply-uno) — 21 tests wired to behaviour IDs.

**Next / open ⬜**
- Fix the exploratory findings (Add-item double-count is FE, root-caused).
- CI perf-budget gate (bundle-per-route + INP) — measured but not yet gating.
- Solid arm (evidence-driven, optional): does dropping the VDOM buy more on top of ~4×?

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
probe + median-of-N, appending a comparable row to [docs/perf/frontend-runs.html](docs/perf/frontend-runs.html).
The reusable meta-prompt teammates can use to generate their own is
[docs/bench-prompt.md](docs/bench-prompt.md) (how it was built:
[docs/bench-prompt-journey.md](docs/bench-prompt-journey.md)).

---

## Where everything lives (for anyone following up)

| What | Repo / branch or path |
|---|---|
| Thin React prototype + perf docs + harness | `rnd-the-fe` @ `thin-react-stocktake-bakeoff` (this repo) |
| Old FE measured in the bake-off | `open-msupply-duo` @ `v3.0.0-RC` (commit `22cdf6eeb6`) |
| Behaviour IDs, strategy docs, exploratory workflows | `tmf-testing` @ `behaviour-anchored-testing-strategy` (PR #10) |
| Deterministic distribution suite | `open-msupply` @ `distribution-regresstion-test` |
| WIP stocktake deterministic suite | `open-msupply-uno` @ `distribution-regresstion-test` |
| Perf-measure skill (throttle + INP runners) | `.claude/skills/perf-measure/` |
| Talk deck (self-contained slides) | [docs/rnd-day-slides.html](docs/rnd-day-slides.html) |
| Recorded new-FE stocktake walkthrough | `docs/perf/exploratory-stocktake-walkthrough.webm` |

> _`open-msupply`, `open-msupply-duo` and `open-msupply-uno` are **separate working copies of the same
> open-msupply repo** — kept side by side so different branches/FEs can run at once._

---

## Reference — the original brief

_The reference material and prompts this project started from, kept verbatim._

### References

[reference doc](https://docs.google.com/document/d/1kkXyCc2Pf1McYCYDE5_ppvOCMEufVD1E2Z3Rlj0ayPk/edit?tab=t.0#heading=h.gokx2jgewyyw)

[that cli tool Craig suggested](https://github.com/szymdzum/browser-debugger-cli)

[docs/bench-prompt.md](docs/bench-prompt.md)

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
