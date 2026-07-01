# R&D Day — FE Rewrite: can we, and can we prove it?

_One-page-ish map of everything in flight, and the backbone for the talk. Newest
detail lives in the linked docs; this file is the joining story + status + slide flow._

---

## The overall question

**Should open mSupply rewrite its front end — and if we do, how do we do it safely?**

A rewrite is being proposed to fix performance on the low-spec tablets (Lenovo M10) in
end-client hands. I picked **two things worth de-risking before anyone commits**, because
they're the two ways a rewrite goes wrong:

1. **Is the performance win real, and where does it actually come from?** — worth building
   the wrong thing only if we're sure it's faster, and sure *what* made it faster.
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

> How much of OMS's slowness is **React's VDOM** vs the **libraries layered on top**
> (MUI / emotion runtime CSS-in-JS / Material React Table)?

### What I built

A greenfield stocktake screen from an empty folder — **keeps React, removes everything
else**: Rspack + React 19 + React Compiler, **TanStack Table + Virtual** (headless, plain
DOM cells, virtualised), **vanilla-extract** (zero-runtime CSS, no emotion), **React Aria**
(accessible dialog/DatePicker/select), graphql-request + codegen + TanStack Query against
the **real** backend. Built to strong parity (list view, status workflow, multi-batch edit
modal, table power features, responsive cards, CSV export, New-stocktake modal, i18next).

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
> 1,363 / 97 MB. Time-to-data-rendered and bundle held across the build-out (progression in the summary)._

**Interaction latency (INP, 6× CPU, isolated):** open edit modal **104 ms vs 1,144 ms (~11×)**,
row-select **48–56 ms vs ~304 ms (~6×)**, cell-edit ~40–88 ms (old FE has *no* inline edit — it's
a modal round-trip). Never worse; 6–11× better on the heavy ones.

### The answer

**It's the libraries, overwhelmingly — not React's renderer.** The ~4× / ~5.6× win holds
**with the VDOM still in place**. That reframes the scary part (swap React for Solid/Svelte)
from *mandatory* to *an optional extra bet* — the high-leverage work (drop emotion/MUI/MRT,
virtualise, zero-runtime CSS) is framework-independent and is where the win lives.

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
| Same tests run on **new FE** → build the matrix | this repo (Thin React) | ⬜ next — needs testid/role parity check |

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
- Thin React bake-off: ~4× faster, ~5.6× smaller, INP 6–11× — measured, prod, reproducible.
- Behaviour-ID single source of truth + CI guard; parity + testing strategy docs.
- Deterministic distribution suite (behaviour-anchored) + runnable exploratory stocktake.

**In progress 🟡**
- Stocktake deterministic suite (open-msupply-uno) — 21 tests wired to behaviour IDs.
- Getting the distribution suite fully green again.
- Visual alignment of the new FE to the old + new design guidelines.

**Next / open ⬜**
- Run the **same** deterministic tests against Thin React → produce the **cross-FE pass matrix** (the demo).
- CI perf-budget gate (bundle-per-route + INP) — measured but not yet gating.
- Solid arm (evidence-driven, optional): does dropping the VDOM buy more on top of ~4×?
- Open decisions in the strategy docs: target-hardware-in-CI, visual-diff tolerance, public vs private tests.

---

## Presentation flow (≈15 min)

1. **The problem (1 slide).** Old tablets, near-unusable, rewrite proposed. Two ways a rewrite
   fails: it's not actually faster, or you can't prove it still works. → my two strands.
2. **Strand A — where's the slowness? (2–3 slides).** The question (VDOM vs libraries). The
   control-arm setup (keep React, rip out MUI/emotion/MRT). **The headline table.** The INP
   head-to-head (11× on opening the edit modal is the visceral one). *Answer: it's the libraries.*
3. **Reframe (1 slide).** So the mandatory, high-leverage work is framework-independent; the
   React→Solid swap is now an optional bet, not the premise. De-risks the whole proposal.
4. **Strand B — proving parity (2–3 slides).** Behaviour IDs as one source of truth → both a
   deterministic suite and an AI exploratory agent anchor to them. **The parity matrix** (old ×
   new). The portability finding (~98% semantic → survives a rewrite if the DOM stays queryable).
5. **The join (1 slide).** The diagram above — measure the win, prove parity, and the bake-off
   *is* the portability check. Stocktake is the shared proof page.
6. **Status + asks (1 slide).** What's done / in-progress / next. Open decisions that need the
   room: target-hardware in CI, public-vs-private tests, and whether to build the Solid arm.

**Live demo option:** old FE vs Thin React side by side on the throttled profile — open the edit
modal on each (1.1 s vs 0.1 s). Then show the `covers`-tagged spec + the results.json that feeds
the matrix. "Same test, two apps, one table" beats any diagram.

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

> _`open-msupply`, `open-msupply-duo` and `open-msupply-uno` are **separate working copies of the same
> open-msupply repo** — kept side by side so different branches/FEs (old-FE prod build, distribution
> suite, stocktake suite) can run at once without churning one checkout._
</content>
</invoke>
