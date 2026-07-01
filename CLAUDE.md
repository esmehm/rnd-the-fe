# CLAUDE.md — Thin React stocktake (bake-off control arm)

Greenfield rebuild of the OMS **stocktake detail** screen. Purpose: isolate how much of OMS's
slowness is React's VDOM vs the MUI/emotion/MRT libraries on top. Keep this codebase **lean and
consistent** — it's also a test of whether AI + humans can extend a golden-path stack reliably.
Full context: [oms-frontend-rebuild-rnd.md](oms-frontend-rebuild-rnd.md) · running log:
[stocktake-build-log.md](stocktake-build-log.md).

## Stack (do not add alternatives without sign-off)

- **Rspack** bundler · **React 19 + React Compiler** (babel-loader runs the compiler — see `babel.config.js`)
- **TanStack Table + TanStack Virtual** (headless; plain DOM cells) — the ONLY table stack
- **vanilla-extract** for ALL styling (zero-runtime, compiled) — the ONLY styling mechanism
- **React Aria** (`react-aria-components`) for interactive/a11y primitives (menu, dialog, select,
  datepicker) — the ONLY headless-UI lib
- **TanStack Query** + **graphql-request** + **graphql-codegen** — the ONLY data layer
- **react-router-dom** v7 for routing

## Golden-path rules (the AI must follow these)

1. **No runtime CSS-in-JS. Ever.** Style only via `*.css.ts` (vanilla-extract). No `style={{…}}`
   for anything themeable, no emotion/styled-components/inline design values.
2. **No raw colours/spacing/sizes.** Use tokens from `src/styles/theme.css.ts` (`vars.color.*`,
   `vars.space.*`, `vars.size.*`, …). If a token is missing, add it there — don't hardcode a hex
   or px. Touch targets use `vars.size.touch` (48px).
3. **Virtualise any list that can exceed ~100 rows.** Use TanStack Virtual (see
   `StocktakeTable.tsx`). Never render an unbounded `.map()` of rows straight to the DOM.
4. **All GraphQL goes through codegen.** Add operations to `src/api/*.graphql`, run
   `npm run codegen`, and call the typed `sdk.*` methods (`src/gql/client.ts`). Never hand-write
   a query string or an untyped `fetch('/graphql')` in a component.
5. **Handle GraphQL union error branches.** OMS mutations return `…Node | …Error`. Select the
   error branch, check `__typename`, and surface `error.description` (see
   `useUpdateStocktakeLine`). A silent success-only path will hide real failures
   (e.g. `AdjustmentReasonNotProvided`).
6. **Don't derive-then-desync.** For an editable cell whose value can also change externally
   (mutation/refetch), sync local draft from props with a focus-guarded effect (see `CountedCell`).
7. **Keep fragments lean.** Only request fields a screen renders — payload size is a measured
   perf lever.
8. **Add `data-testid` for anything the perf harness keys on** (ready signal, data-item count).

## Domain gotchas (stocktake)

- A **variance** (counted ≠ snapshot) requires an **adjustment reason** whose **type matches the
  sign** (`POSITIVE_/NEGATIVE_INVENTORY_ADJUSTMENT`). Send `countedNumberOfPacks` + `reasonOptionId`
  together, or the backend rejects.
- Date fields on `UpdateStocktakeLineInput` are `NullableDateUpdate` → `{ value: "YYYY-MM-DD" | null }`,
  not bare strings.
- Server does sort + filter + pagination: `stocktakeLines(sort:[{key,desc}], filter:{itemCodeOrName:{like}}, page)`.

## Commands

```
npm run dev        # rspack serve on http://localhost:3100 (proxies /graphql -> :8000)
npm run codegen    # regenerate src/gql/generated.ts from the live schema
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

Backend: `http://localhost:8000/graphql`, run with `debug_no_access_control: true` (no auth).
Reference target: stocktake `019f17d0-1444-795c-ac53-da2216c73cff`, store `5B28901C52396E4BB098B9862CCF5DF9`.

## Layout

```
src/
  gql/            client.ts (graphql-request + sdk) · generated.ts (codegen output — don't edit)
  api/            *.graphql operations (edit these, then codegen)
  styles/         theme.css.ts (tokens) · global.css.ts
  ui/             uikit.css.ts (shared React Aria primitive styles)
  features/stocktake/
    StocktakePage.tsx      page shell: header, filter+URL, delete, toast, modal wiring
    StocktakeTable.tsx     TanStack Table + Virtual grid
    columns.tsx  cells.tsx format.ts   column defs + editable cells
    EditLineModal.tsx      React Aria dialog + DatePicker
    api.ts                 TanStack Query hooks
```
