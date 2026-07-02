# R&D Day — FE Rewrite: can we, and can we prove it?

_One-page-ish map of everything in flight. Newest detail lives in the linked docs; this file is the
joining story + status. The talk itself is the deck at [docs/rnd-day-slides.html](docs/rnd-day-slides.html)._

---

## The overall question

**Should open mSupply rewrite its front end — and if we do, how do we do it safely?**

A rewrite is being proposed to fix performance on the low-spec tablets (Lenovo M10) in
end-client hands. I picked **two things worth de-risking before anyone commits**, because
they're the two ways a rewrite goes wrong:

1. **Can we get the performance win *without leaving React/TypeScript*?** — a pure-JS demo already
   showed the ceiling is high; the useful question is whether we can capture most of it while keeping
   React + TS (dev + AI familiarity, lower risk), and *where* the win comes from — so "drop React" stays
   a later, evidence-based call rather than the premise of the rewrite.
2. **Can we prove functional parity without hand-QA'ing everything twice?** — a rewrite is
   only safe if we can show the new app does what the old one did. That needs automated
   tests that **survive the rewrite** and can run against **both** front ends.

Two strands, one thesis: **a rewrite is justified when you can measure the win AND prove
parity with tests that don't care which front end they're pointed at.**

---

## Strand A — Performance: the "Thin React" bake-off

**Full write-ups:** [oms-frontend-rebuild-rnd.md](oms-frontend-rebuild-rnd.md) (decision
rationale) · [stocktake-bakeoff-summary.md](stocktake-bakeoff-summary.md) (results) ·
[stocktake-build-log.md](stocktake-build-log.md) (chronological log) ·
[docs/perf/frontend-runs.html](docs/perf/frontend-runs.html) (raw rows).

### The research question

A pure-JS prototype already showed the raw performance ceiling is high — but it got there by dropping
React *and* type-safety. So the question I actually wanted answered was:

> **Can we drastically improve performance *without* leaving React + TypeScript?**

Keeping them preserves dev + AI familiarity (training data, hireable skills) and the ecosystem pieces we
*keep* — **JSONForms' React-only binding, Module Federation plugins, the TanStack data layer** — and
reduces rewrite risk, and it lets "do we drop React?" be a *separate, later, evidence-based* decision
rather than the premise. (MUI/MRT are React-only too, but we're dropping them regardless, so they're not a
reason to stay — JSONForms is.) Mechanistically that's the same as asking how
much of the slowness is **React's VDOM** vs the **libraries layered on top** (MUI / emotion / MRT) — which
the bake-off answers directly.

### What I built

A greenfield stocktake screen from an empty folder — **keeps React, removes everything
else**: Rspack + React 19 + React Compiler, **TanStack Table + Virtual** (headless, plain
DOM cells, virtualised), **vanilla-extract** (zero-runtime CSS, no emotion), **React Aria**
(accessible dialog/DatePicker/select), graphql-request + codegen + TanStack Query against
the **real** backend. Built to strong parity (list view, status workflow, multi-batch edit modal with
Batch/Pricing/Other tabs, More panel + activity Log, table power features, responsive cards, CSV export,
New-stocktake modal, i18next), then a **visual-parity pass** to align with the old FE + UI standards —
with a few **conscious divergences** kept (e.g. semantic Confirm/Delete buttons rather than the old FE's
outlined pills, because colour + text is a stronger, more accessible affordance).

### The headline (6× CPU throttle = M10 proxy, prod builds, same backend, stocktake #112, 1,506 lines)

| Metric | Old FE (MUI+MRT+emotion) | **Thin React** | Win |
|---|---|---|---|
| Time to data rendered | 3,781 ms | **911 ms** | **~4.1×** |
| First Contentful Paint | 924 ms | **116 ms** | **~8×** |
| Code transfer (JS+CSS, gzip) | 1,362 KB | **243 KB** | **~5.6×** |
| DOM nodes (same screen) | 1,363 | **496** | ~2.7× |
| JS heap | 97 MB | **36 MB** | ~2.7× |

> _DOM/heap here are the **initial control-arm build**. The feature-complete screen (list + modals +
> table power features) sits at **~860–894 DOM nodes / ~40 MB heap** — still well under the old FE's
> 1,363 / 97 MB. Time-to-data-rendered held across the build-out **and a later visual-parity pass**
> (911 → ~905 → ~730 ms across re-measures, CLS 0; progression in the summary) — the win never regressed._

**Interaction latency (INP, 6× CPU, isolated):** open edit modal **104 ms vs 1,144 ms (~11×)**,
row-select **48–56 ms vs ~304 ms (~6×)**, cell-edit ~40–88 ms (old FE has *no* inline edit — it's
a modal round-trip). Never worse; 6–11× better on the heavy ones.

### The answer

**Yes — and we don't have to leave React to get it.** Keeping React 19 + TypeScript and swapping only the
libraries (headless behaviour + zero-runtime CSS + a virtualised table) made the same screen **~4× faster
and ~5.6× smaller**. Because that win holds **with the VDOM still in place**, the slowness was
overwhelmingly the **libraries, not React's renderer** — so the scary part (swap React for Solid/Svelte)
drops from *mandatory* to an *optional, later* bet. We take the low-risk win now, keep the DX and
AI-familiarity, and still have headroom if we ever decide the renderer swap is worth it.

---

## Strand B — Testing: proving parity without doubling QA

**Full write-ups (in `tmf-testing`, branch `behaviour-anchored-testing-strategy` / PR #10):**
[FRONTEND_REWRITE_PARITY.md](https://github.com/msupply-foundation/tmf-testing/blob/behaviour-anchored-testing-strategy/FRONTEND_REWRITE_PARITY.md)
(the rewrite-specific strategy) · [AUTOMATED_TESTING_STRATEGY.md](https://github.com/msupply-foundation/tmf-testing/blob/behaviour-anchored-testing-strategy/AUTOMATED_TESTING_STRATEGY.md)
(the standing model).

### The core idea: one single source of truth, two test engines, one oracle

- **Behaviour IDs as the single source of truth.** Every rule QA used to check by hand is now
  an atomic, individually-ID'd **behaviour** (`OMS-REG-DIST-04.3`, `OMS-REG-INV-03.9`) living in
  the human-readable case in tmf-testing. Both test engines *anchor* to these IDs; neither
  redefines them. (PR #10: ~112 case files migrated to this behaviour-anchored format, + a CI
  guard that fails if a test references a behaviour ID that doesn't exist.)
- **Two engines, same anchor:**
  - **Deterministic (Playwright)** — tags the behaviour ID it covers via a `covers` annotation;
    emits a `json` report so a coverage map can be generated, not hand-maintained.
  - **Exploratory (AI agent)** — reads the *same* behaviours as outcomes to confirm, then probes
    freely (anomaly patterns), tagging findings by behaviour ID. Runnable stocktake + setup
    workflows exist (ported from Brian's exploratory work), anchored to the INV/SMV behaviour IDs.
- **The old app is the oracle.** Because both FEs run side-by-side on one unchanged backend,
  the running old app is a *second executable spec*. The rewrite becomes **differential testing**.

### The payoff: a parity matrix (this is the money slide for the rewrite)

The deterministic suite's `baseURL` is already `process.env.BASE_URL` — so the *same* spec runs
against old and new. Per behaviour you get one cell:

| | passes on **old** | fails on **old** |
|---|---|---|
| **passes on new** | ✅ replicated | ⚠️ old bug fixed — confirm intended |
| **fails on new** | 🔴 **regression the rewrite introduced** | known-broken, not a blocker |

The 🔴 cell *is* the rewrite blocker list. Definition-of-done stops being "feels close" and
becomes "every active behaviour green on new, at visual parity, within perf budget."

### Are the tests actually portable across a rewrite? (measured, not hoped)

Assessed on the distribution workflow: **~98% semantic locators** (`getByRole` 90, `getByTestId`
55, `getByText` 27) vs **3 brittle** (CSS-hash / nth-child). So a test breaks on a new FE mainly
through *how it locates elements*, not what it asserts — and portability is a property of the
**render target, not the framework**: any FE that emits a **queryable, accessible DOM + preserved
`data-testid`s** keeps the suite. (Failure mode to flag: `<canvas>`/WebGL grids → no DOM → every
locator dies at once.) **A stack bake-off doubles as a portability check** — run the behaviour-
tagged tests against each prototype and see which pass unchanged. This is the bridge to Strand A.

### Current state (concrete)

| Piece | Where | State |
|---|---|---|
| Behaviour-ID single source of truth + CI guard | tmf-testing PR #10 | ✅ ~112 files migrated |
| FE-rewrite parity strategy doc | tmf-testing PR #10 | ✅ written, for discussion |
| Deterministic **distribution** suite (behaviour-anchored) | open-msupply `distribution-regresstion-test` | ✅ 31 tests, `covers` + json reporter; being made green again |
| Deterministic **stocktake** suite (the chosen PoC page) | open-msupply-uno (WIP) | 🟡 21 tests, ~30 INV-03/04 + SMV-01 behaviour IDs |
| Runnable **exploratory** stocktake + setup workflows | tmf-testing PR #10 | ✅ anchored to behaviour IDs |
| **Exploratory agent** run against the **new FE** | this repo @ `11bc72d` | ✅ full workflow walked (~24 behaviours, ~26 min); **5 findings incl. 1 HIGH** data-integrity (Add-item double-count) |
| **Deterministic** tests run on **new FE** → build the matrix | this repo (Thin React) | 🟡 running now — cross-FE pass matrix incoming |

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
- The chosen proof page is **stocktake** on both sides, so they meet on the same screen.

---

## Status at a glance

**Done ✅**
- Thin React bake-off: ~4× faster, ~5.6× smaller, INP 6–11× — **with React + TS kept**; measured, prod, reproducible.
- Behaviour-ID single source of truth + CI guard; parity + testing strategy docs.
- Deterministic distribution suite (behaviour-anchored) + runnable exploratory stocktake.
- **Exploratory agent run against the rewrite (`11bc72d`)** — walked the full stocktake workflow and found a
  **HIGH data-integrity bug** (Add-item double-count, root-caused to the FE) + 4 more in ~26 min, each
  anchored to a behaviour ID. *The methodology's first real catch on the rewrite.*
- **Visual-parity pass** (align to old FE + UI standards; conscious button divergence kept) shipped in `11bc72d`.

**In progress 🟡**
- Stocktake deterministic suite (open-msupply-uno) — 21 tests wired to behaviour IDs.
- Getting the distribution suite fully green again.
- **Deterministic parity suite running against the new FE** → cross-FE pass matrix (the demo) incoming.

**Next / open ⬜**
- **Fix the exploratory findings**: Add-item double-count (FE — root-caused), blank pack-size validation + raw-error leak.
- CI perf-budget gate (bundle-per-route + INP) — measured but not yet gating.
- Solid arm (evidence-driven, optional): does dropping the VDOM buy more on top of ~4×?
- Open decisions in the strategy docs: target-hardware-in-CI, visual-diff tolerance, public vs private tests.

---

## Repo/branch cheat-sheet (for anyone following up)

| What | Repo / branch |
|---|---|
| Thin React prototype + perf docs + harness | `rnd-the-fe` @ `thin-react-stocktake-bakeoff` (this repo) |
| Old FE measured in the bake-off | `open-msupply-duo` @ `v3.0.0-RC` (commit `22cdf6eeb6`) |
| Behaviour IDs, strategy docs, exploratory workflows | `tmf-testing` @ `behaviour-anchored-testing-strategy` (PR #10) |
| Deterministic distribution suite | `open-msupply` @ `distribution-regresstion-test` |
| WIP stocktake deterministic suite | `open-msupply-uno` @ `distribution-regresstion-test` |
| Perf-measure skill (throttle + INP runners) | `rnd-the-fe` `.claude/skills/perf-measure/` |
| Talk deck (self-contained slides) | `rnd-the-fe` `docs/rnd-day-slides.html` |
| Recorded new-FE stocktake walkthrough | `rnd-the-fe` `docs/perf/exploratory-stocktake-walkthrough.webm` |

> _`open-msupply`, `open-msupply-duo` and `open-msupply-uno` are **separate working copies of the same
> open-msupply repo** — kept side by side so different branches/FEs (old-FE prod build, distribution
> suite, stocktake suite) can run at once without churning one checkout._
</content>
</invoke>
