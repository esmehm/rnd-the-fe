# OMS Frontend Rebuild — RnD Decision Notes

_Working notes for the greenfield-frontend RnD day. Captures the key decision factors, the option spectrum, and a deep-dive on the recommended first move ("Thin React")._

---

## 1. The problem

OMS frontend is too slow on the low-spec tablets/PCs used in some deployments — near-unusable for a group of end customers. A full frontend rewrite has been proposed. We want:

- **Performance** on old devices (target hardware: **Lenovo M10 gen2** — MediaTek Helio P22T, 2–4GB RAM, a weak Chromium **WebView**).
- **Smaller bundles** (more remote sites pulling from central; less JS to parse/execute).
- **AI / developer velocity** — a codebase that humans and AI agents can extend reliably.
- **Tablet responsiveness** — data-dense tables that degrade to card views; 48px touch targets; landscape/portrait.

**Out of scope:** improving the *current* frontend, backend perf, UX redesign, runtime CSS-in-JS, SSR, native app.

> Note: Android ships via **Capacitor** (a Chromium WebView), so **web perf == Android perf**. A throttled desktop Chromium profile is a faithful proxy for the M10 — there's no separate native variable to reason about.

---

## 2. What we actually have today (grounded in the codebase)

| Area | Current | Verdict |
|---|---|---|
| Renderer | **React 19.2** | Modern; React Compiler available |
| UI components | **MUI v6** (`@mui/material`, `@mui/lab`, `@mui/x-date-pickers`) + **emotion** | ⚠️ Runtime CSS-in-JS — biggest perf tax. **~300 files** import `@mui` directly |
| Tables | **Material React Table v3** | ⚠️ Heavy; 44 call sites, but funnelled through a shared hook layer → swappable |
| Data layer | **TanStack Query v5** + **graphql-request** + **graphql-codegen** | ✅ Already lean, typed, framework-agnostic. **Not** Apollo |
| Forms | **JSONForms** (53 files, renderers coupled to MUI) | React binding is fine; renderers need re-skinning |
| Plugins | **webpack Module Federation** (runtime remote React components) | Tied to webpack + React |
| Routing | `react-router-dom` v6 | Fine; TanStack Router optional later |
| i18n | `i18next` (+ chained/http/localstorage backends, lang detector) | ✅ Full localisation already |
| Bundler | **webpack 5** (+ babel-loader; SWC already used in Storybook/Jest) | Rspack upgrade is low-risk |

**Key call sites:**
- Table engine is centralised in [client/packages/common/src/ui/layout/tables/useBaseMaterialTable.tsx](client/packages/common/src/ui/layout/tables/useBaseMaterialTable.tsx) (+ `usePaginatedMaterialTable`, `useSimpleMaterialTable`, cell components).
- Card-view-for-small-screens already started: [client/packages/common/src/ui/layout/tables/components/CardList/CardList.tsx](client/packages/common/src/ui/layout/tables/components/CardList/CardList.tsx).
- Plugin federation config in [client/packages/host/webpack.config.js](client/packages/host/webpack.config.js).

**Takeaway:** the data layer is already good. The pain is concentrated in the **view layer: React + MUI/emotion + MRT.** That's a more tractable problem than "rewrite everything."

---

## 3. The central reframe

> **The mandatory, highest-leverage performance work is framework-independent. The framework swap is separable and optional.**

Removing emotion/MUI runtime styling is unavoidable to hit the perf goal — and it's ~300 files of work *regardless* of the framework we land on. React-vs-Solid-vs-Svelte doesn't change that bill. The trap is bundling "rip out MUI" and "replace React" into one big-bang rewrite and blaming all the risk on the scary new framework.

| Lever | Mandatory for perf? | Framework-independent? |
|---|---|---|
| Drop emotion runtime CSS → tokens as CSS variables | **Yes** | Yes |
| Replace MUI with headless + zero-runtime CSS | **Yes** | Yes |
| Virtualise the data tables | **Yes** | Yes (TanStack Table/Virtual) |
| Swap React → Solid/Svelte | No | — (the *optional* bet) |

**Strategy:** do the framework-independent wins first, measure them, and treat the renderer swap as a second, independently-justified decision driven by evidence.

---

## 4. On the "pure JS / no React" prototype

An external dev built an alternate frontend in plain JS, no React. Two separable issues:

- **"We'd lose type safety"** is *not* a property of dropping React. Solid, Svelte 5, Vue, Preact, Lit are all first-class TypeScript. The prototype lost types by *choice*, not necessity. Valid criticism of that prototype; not of the category.
- **"React is what devs/AI know"** is real — most training data, most hireable skills, and our whole ecosystem (MRT, JSONForms, MUI, Module Federation) assumes it.

**Steelman:** they correctly diagnosed that **React's runtime is a genuine CPU tax** on the M10's WebView (reconciliation, cascading re-renders, VDOM diff are pure overhead). They just reached for the most extreme cure and threw away types, the component model, and AI-fluency with it.

**Verdict: right diagnosis, wrong prescription.** The win without the DX regression comes from a **compiler / fine-grained-reactive framework** (Solid, Svelte 5) that compiles the overhead away — not from hand-rolled vanilla that a team has to maintain with AI assistance.

---

## 5. Option spectrum (conservative → out-there)

| # | Option | What | Risk | Win ceiling |
|---|---|---|---|---|
| **A** | **Thin React** (recommended first move) | Keep React 19 + Compiler; remove MUI/emotion + MRT; headless + zero-runtime CSS + TanStack Table | **Low** | High bundle/CSS; medium CPU (VDOM remains) |
| B | Rspack bundler swap | Rust-based, webpack-compatible, keeps Module Federation | Low | Faster builds, smaller output |
| C | **Solid.js** | JSX, fine-grained, no VDOM, ~7KB; keeps TanStack family | Medium | Highest perf. ⚠️ no JSONForms binding |
| D | Vue 3 | Mature; **only non-React option with official JSONForms binding** | Medium-High | High; less skill transfer |
| E | Svelte 5 (runes) | Compiler, tiny, fast | High | High; `.svelte`, no JSONForms, smaller AI corpus |
| F | Canvas data grid | Render killer tables to `<canvas>` (e.g. glide-data-grid) for the 2–3 worst screens | Medium (scoped) | Renders 100k rows on a potato |
| G | Web-component plugins | Plugins as custom elements — framework-agnostic, survives a host swap | Medium | Future-proofs plugin contract |
| H | Rust→WASM hot paths | Move heavy compute (sort/filter/aggregate, sync diff) to WASM; team has Rust | High | "Headroom" story; plays to our strength |
| I | Agnostic core, thin skin | Hard parts (table, data, routing, a11y via Zag.js) framework-agnostic → renderer is a reversible bet | Medium | De-risks the framework choice |
| J | Qwik (resumability) | Ruled out — needs SSR (out of scope). Good "failed experiment" slide | — | — |
| K | Million.js / Preact-compat | React speedups, but smaller project / fragile MUI-compat; fails our supply-chain criteria | — | Low |

---

## 6. Deep dive — **Thin React** (remove MUI + MRT)

### Thesis

**This is a greenfield architecture, not a cleanup of the current app.** We build the screen from an empty folder, in a new shell, on a new stack — we just keep **React as the renderer** while removing everything that actually causes the slowness: **MUI/emotion (runtime CSS-in-JS) and Material React Table.** In their place: **headless behaviour + zero-runtime CSS + a lean table built on TanStack primitives.**

It exists to answer one research question:

> **How much of OMS's slowness is the renderer (React's VDOM) vs. the libraries we layered on top (MUI/emotion/MRT)?**

That makes it the **control arm** of the bake-off (§8): build the screen greenfield on this stack, build it again on Solid, and let the numbers say whether the framework was ever the bottleneck. Keeping React is a **deliberate, defended** stack choice — the JSONForms React binding, the Module Federation plugin system, and team + AI fluency all survive — not a failure to commit to the rebuild.

> **Why this is in-scope for RnD day.** The brief rules out *improving the current frontend* (small fixes). This isn't that: removing MUI/emotion/MRT and rebuilding the view layer on a *compiled* styling model and a *headless/virtualised* table is a **major structural restructure** — it shares the word "React" with the old app and almost nothing else in the view layer. It is **prototyped from scratch, not migrated.** (How we'd eventually roll it across the real codebase is in §10 — explicitly *not* part of the day.)

### What we remove, and why

- **MUI (`@mui/material`, `@mui/lab`) + emotion** — emotion is **runtime CSS-in-JS**: every component serialises its styles and injects `<style>` tags *at render time* on the device. On the M10's WebView that's real CPU per render, plus a large bundle. It's coupled into **~300 files**. Removing it is the **#1 perf lever** and directly aligns with the brief's "no runtime CSS-in-JS going forward."
- **Material React Table** — a rich abstraction layered over TanStack Table + MUI. Heavy render cost on data-dense, editable tables, and it drags MUI in with it. The 44 call sites funnel through our shared hook layer, so the swap point is centralised.

### What we replace them with

| Concern | From | To |
|---|---|---|
| Component behaviour (menus, modals, combobox, tabs, tooltips) | MUI components | **Headless**: React Aria *or* Ark UI (Zag.js) — accessible, unstyled |
| Styling | emotion (runtime) | **Zero-runtime CSS**: vanilla-extract / Panda / CSS Modules (compiled at build) |
| Theming | MUI theme + emotion | **TMF tokens → CSS custom properties** (themeable, scopeable, RTL-friendly) |
| Tables | Material React Table | **TanStack Table** (headless) + **TanStack Virtual** (row/col virtualisation), plain DOM cells |
| Cells | MUI-based cell components | Re-skin existing `TextInputCell`/`NumberInputCell`/etc. onto the new primitives |
| Small screens | (in progress) | Keep/extend the existing `CardList` card-view |
| Date pickers | `@mui/x-date-pickers` | React Aria DatePicker/Calendar (min/max for valid windows, ranges; month/year mode is a small custom) |
| Wasted re-renders | manual `memo`/`useMemo` | **React Compiler** (React 19) — auto-memoisation |

> **Modals stay** (the brief explicitly keeps them) — headless dialog primitives reproduce the same UX without the MUI weight.

### What this *preserves* (the reason to stay on React)

- **JSONForms** — the React binding is untouched; we only re-skin the ~61 renderers onto the new primitives, which is **mandatory anyway** once MUI leaves. **No JSONForms replacement needed.** (This is the single biggest reason to prefer Thin React over Solid/Svelte, which have no JSONForms binding.)
- **Plugins** — webpack Module Federation keeps working; plugins remain React components.
- **TanStack Query, graphql-request, graphql-codegen** — unchanged.
- **Team + AI familiarity** — no new mental model, no retraining.
- **Routing** — `react-router-dom` stays (optionally upgrade to TanStack Router later for better route-based code-splitting).

### Expected performance impact

- **Bundle:** large drop — MUI + emotion + MRT are among the heaviest deps.
- **CPU / INP:** large drop from eliminating runtime style serialisation on every render + lighter table + virtualisation + React Compiler killing wasted re-renders.
- **What stays:** React's **VDOM/reconciliation cost remains** — this is Thin React's ceiling. *That's the point:* if, after Thin React, interaction CPU on a throttled M10 still misses the INP target, we've isolated React's reconciliation as the culprit and have hard data to justify going to Solid. If it *hits* target, we've avoided a framework swap entirely.

### Risks / honest unknowns

- **Re-implementing MRT's niceties** on TanStack Table: column resize, frozen columns, keyboard navigation, screen-reader announcements. TanStack gives the *logic*; we own the *rendering* + some a11y. React Aria's grid patterns help close the WCAG 2.2 gap. *(This is a real cost even for the from-scratch prototype.)*
- Need **perf-budget guardrails in CI** from day one so we don't rebuild the same slowness.
- Volume risk of eventual *adoption* (the ~300 MUI files / ~61 renderers) → see §10 (rollout). Out of scope for the day.

### Why it's worth building as the baseline

1. Lowest risk — no new framework or mental model.
2. Isolates the variable — proves whether the slowness was the libraries or the renderer.
3. It's the **control** for the bake-off: it answers "do we actually need to leave React?" with evidence instead of opinion.

---

## 7. AI / developer-productivity factors

The instinct ("pick the framework AI knows best") is a *minor* factor. The major factors are **consistency and enforced guardrails**, mostly framework-independent:

- **End-to-end types** — keep graphql-codegen producing typed operations; best defence against AI misusing the API.
- **One golden-path primitive catalog** — a small, documented component set the AI is *instructed* to use (in `CLAUDE.md`). Fewer ways to do the same thing → more reliable generation.
- **Perf budgets that fail CI** — bundle-size-per-route + INP-on-throttled-profile checks that *break the build*. Objective feedback signal for humans and AI; this is the "design pattern that stops perf regressing quickly" the brief asks for.
- **Lint rules encoding invariants** — "virtualise lists > N", "no raw hex, use tokens", "no new heavy deps without sign-off". AI obeys lint reliably.
- Secondary: **less magic helps AI.** Solid/Svelte signals avoid React's effect/stale-closure footguns — so the AI argument is closer to a *wash* than an automatic React win.

---

## 8. The RnD-day demo — a bake-off, not an essay

**Screen: stocktake** — our most data-dense, editable workflow. Build it **greenfield: an empty folder, a fresh shell, importing nothing from the current app** (no existing MUI components, no `useBaseMaterialTable`). This is the thing that keeps it a *rebuild* and not a *fix* — there is no current-frontend code being "improved," only new code being written from zero.

Build two fresh implementations and measure them against the existing screen as a reference:

1. **Current stocktake** (React + MUI + MRT) — **not built, only measured** as the baseline reference.
2. **Thin React** (React 19 + Compiler, headless + zero-runtime CSS, TanStack Table + Virtual) — **built from zero.**
3. **Solid** (same TanStack Table/Virtual, Kobalte, zero-runtime CSS) — **built from zero.**

Measure all three identically and put it on one slide:

- **Throttle to match the M10:** Chrome DevTools → **6× CPU slowdown** + slow network (faithful since Android = Chromium WebView).
- Report **INP** (cell-edit, scroll), **LCP** (first load), **bundle size per route**, **rows-before-jank**.

> "Here's the same real OMS screen, three ways, measured on a simulated M10" beats any architecture diagram in 15 minutes.

---

## 9. Compatibility checklist (Thin React)

| Requirement | How Thin React handles it |
|---|---|
| Plugins | webpack Module Federation unchanged (React components) |
| JSONForms | React binding kept; re-skin renderers (mandatory anyway) |
| Tables (large/editable/frozen/keyboard/sort/filter/paginate) | TanStack Table + Virtual; re-implement frozen cols + keyboard nav + a11y (real work) |
| Responsiveness / cards | Extend existing `CardList`; tokens drive breakpoints; 48px targets via tokens |
| Accessibility (WCAG 2.2) | React Aria / Ark UI primitives; grid a11y from React Aria patterns |
| Themes (TMF tokens) | CSS custom properties; scopeable; no runtime cost |
| i18n + RTL | `i18next` unchanged; RTL via CSS logical properties + token direction |
| Navigation + code-splitting | `react-router-dom` (or TanStack Router) + route-level lazy imports |
| GraphQL caching/refetch | TanStack Query unchanged |
| Date picker (month/year, range, valid windows) | React Aria DatePicker/Calendar + small custom for month/year mode |
| Command-K / keyboard shortcuts | Headless command palette + a small shortcut hook |

---

## 10. Real-world rollout (post-RnD — *not* part of the day)

> How we'd *land* the chosen architecture in the real codebase. Recorded here only so the day's prototype connects to a credible path forward — **keep this off the RnD-day slides, or clearly label it "later."** The brief rules out work on the current frontend, so none of this happens on the day.

- **Strangler / per-screen, not big-bang.** Stand up the new primitive catalog + tokens, then move one functional area at a time (**stocktake first**, then the rest of inventory), deleting MUI per package as it empties.
- **The table is the cheapest entry point** — it's centralised behind [useBaseMaterialTable.tsx](client/packages/common/src/ui/layout/tables/useBaseMaterialTable.tsx), so screens can move behind a stable hook interface.
- **The unavoidable bill** (true under *any* option, new framework or not): ~**300 files** import `@mui` directly and ~**61 JSONForms renderers** are MUI-coupled — all must be re-skinned to remove runtime CSS-in-JS. Repetitive + well-typed → a strong AI-assisted task.
- Satisfies the brief's "no measurable regression on any existing screen after migration" — screens move one at a time, measured as they go.
- Independent low-risk enabler: the **Rspack** bundler swap (keeps Module Federation, faster builds, smaller output).

---

## 11. Open questions / next steps

- [x] Confirm zero-runtime CSS choice → **vanilla-extract** (typed token contract → CSS vars; built).
- [x] Confirm headless lib → **React Aria** (grid a11y + DatePicker; built. Solid arm would use Kobalte).
- [x] Stand up the **bake-off harness** → built: `.claude/skills/perf-measure` + a Playwright-CDP 6× throttle runner; greenfield **stocktake** built on TanStack Table + Virtual + vanilla-extract.
- [x] Decide on **Rspack** bundler swap → scaffolded on Rspack (React 19 + Compiler, keeps the Module Federation path).
- [ ] Define the **CI perf budgets** (bundle-per-route, INP on throttled profile) — metrics exist via the harness; **not yet gating the build**. Still open.

## 12. Outcome (RnD day) — bake-off ran, thesis confirmed

Built the greenfield stocktake and measured it against the current MUI/MRT app under 6× CPU (M10 proxy),
prod builds, same backend/store/stocktake (#112, 1,506 lines). **Thin React was ~4.1× faster to data-rendered
(911 → measured vs 3,781 ms), ~8× faster FCP, ~5.6× smaller code (243 KB vs 1,362 KB gzip), 496 vs 1,363 DOM
nodes** — with the VDOM still present. **Conclusion: most of the slowness was the libraries (MUI/emotion/MRT),
not React's renderer** → the framework swap is separable/optional, exactly as §3 argued.

Also built to parity: stocktakes list, status workflow, multi-batch edit modal, More/Log, table power
features (show/hide, resize, freeze, fullscreen, ARIA grid), responsive card view, i18next (key strings),
CSV export, and the full/filtered/blank New-stocktake modal.

- Full write-up + coverage scorecard: [stocktake-bakeoff-summary.md](stocktake-bakeoff-summary.md)
- Chronological build log + gotchas: [stocktake-build-log.md](stocktake-build-log.md)
- Raw measured rows: [docs/perf/frontend-runs.html](docs/perf/frontend-runs.html)

**Gaps vs this brief still open:** (1) **CI perf-budget gate** (§7's "stops perf regressing" pattern); (2) the
**Solid arm** (§8's evidence-driven optional third implementation). **INP is now measured** — full old-FE
head-to-head under 6× CPU, 6–11× snappier on the heavy interactions (open-modal 104 ms vs 1,144 ms), never
worse. Lower-value: full grid keyboard nav, RTL, code-splitting, Command-K.
