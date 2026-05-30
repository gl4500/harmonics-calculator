# Harmonics & IMD HTML Calculator — v1 Design

**Date:** 2026-05-29
**Status:** Approved by user; ready for implementation plan
**Source artifact:** `harmonics_v3.xlsm` (VBA macros in `MainModule.bas`)

---

## Goal

Replace the macro-driven Excel workbook with a single-file HTML calculator that runs in Chrome. Same math as the VBA, reorganized around a unified, sortable product table instead of three sheets with wrapped output bands.

## Non-goals (deferred to v2)

- Save / Load scenarios as JSON files
- CSV export of the product table
- Formal "Run tests" button with golden vectors
- A dedicated scenario type / schema beyond what v1 needs
- Spectrum chart
- Multi-browser support (Chrome only)

## Deliverable

One file: `harmonics_calculator.html`. Double-click to open in Chrome. No server, no build, no external libraries.

---

## Architecture

Single HTML file with four internal sections separated by banner comments. Strict directional dependencies:

```
engine  ←  state  ←  ui
   ↑                  ↓
   └──── tests (v2) ──┘
```

- **engine** — pure math. No DOM, no `localStorage`, no globals. Input/output are plain numbers and arrays. Trivially testable in a Node REPL.
- **state** — scenario data model (plain JS objects), in-memory only for v1, plus localStorage autosave/restore. Calls engine. Never touches DOM.
- **ui** — only section that touches `document`, listens to events, calls `localStorage`. Calls engine and state; engine and state never call back.
- **tests** — v2; placeholder slot reserved at the bottom of the file.

The four sections live in separate `<script type="module">` blocks (or one module with banner-delimited subsections) inside one `.html` file.

## Engine API (pure functions)

```js
// Single fundamental → array of harmonics H_2..H_maxH (multipliers 2..maxH).
harmonics(fundMHz: number, maxH: number = 16): number[]

// One global IMD enumeration over a tone list.
// Returns sorted-ascending, deduped (1 kHz) products inside [fLo, fHi].
// allowSingleTone=true mirrors Single_Freq_IMD (include pure n·f_i).
// allowSingleTone=false mirrors MT_IMD_Calc (require ≥2 nonzero coeffs).
enumerateIMD(
  tones: number[],
  opts: { maxOrder: number, fLo: number, fHi: number,
          allowSingleTone: boolean, productCap?: number }
): { products: number[], hitCap: boolean, rawCount: number }

// Coloring classifier (matches VBA precedence: red wins over green).
classify(freqMHz: number, ctl: {
  haveBounds: boolean, startF: number, stopF: number,
  jrfl: number[]   // empty array if none
}): 'jrfl' | 'inBand' | 'none'
```

Constants (ported from VBA):
- `MAX_ORDER_HARD_CAP = 9`
- `PER_ROW_PRODUCT_CAP = 16000`
- `AUTO_WIDTH_K = 2.5`
- JRFL match tolerance: `0.001` MHz (1 kHz)
- Dedup key: `Math.round(absFreq * 1000)` (1 kHz precision)
- Heavy-compute confirm threshold: `(2N+1)^maxOrder > 5_000_000`

The enumeration algorithm is a direct port of VBA `EnumerateTuples` + `EvaluateAndStore`: integer coefficient tuples `(k_1, …, k_N)` with `Σ|k_i| ∈ [2, maxOrder]`, first nonzero coefficient must be positive (sign-canonicalization to avoid `±` duplicates), result must lie in `[fLo, fHi]`, dedup by integer-rounded kHz key.

## Data model (v1)

Plain JS object held in `state.scenario`. No class, no schema, no validation framework — v2 will formalize.

```js
{
  control: {
    startF: number | null,        // MHz; null = no lower bound
    stopF:  number | null,        // MHz; null = no upper bound
    maxOrder: number,             // 2..9
    filterWidth: number | null,   // MHz; null = auto = AUTO_WIDTH_K × span
    jrfl: number[]                // MHz; empty array allowed
  },
  harmonics: {
    enabled: boolean,
    fundamentals: number[]        // MHz
  },
  sfImd: {
    enabled: boolean,
    tones: number[]               // MHz
  },
  mtImd: {
    enabled: boolean,
    groups: [{ fc: number, n: number, df: number }]  // each row = one group
  }
}
```

Persistence: `state` autosaves the scenario to `localStorage` under key `harmonics_calc_v1` on every input edit (debounced ~250 ms). On page load, state restores from localStorage if present, else uses an empty default scenario.

## UI layout

Single-column responsive page. Top to bottom:

1. **Header** — title, brief subtitle.
2. **Control card** — Start / Stop bounds, Max Order, Filter Width, JRFL list (dynamic add/remove chips).
3. **Harmonics card** — enable checkbox, fundamentals list (dynamic add/remove), per-section info text.
4. **Single-Freq IMD card** — enable checkbox, tone list (dynamic add/remove), info text.
5. **Multi-Tone IMD card** — enable checkbox, rows of `(Fc, N, Δf)` with add/remove row buttons.
6. **Action bar** — `Calculate` (primary), `Clear All` (secondary, with confirm).
7. **Results panel** — count summary (`X products, Y JRFL hits`), sortable table with columns: `Freq (MHz) | Source | Order | JRFL | In bounds`. Row tint follows `classify()`: JRFL hit → `#FFCCCC`, in-band → `#CCFFCC`, otherwise no tint.

Sort: default ascending by Freq. Clicking column headers toggles sort. Source column shows one of: `Fundamental` (the input tone itself when included), `H_k` (harmonic of order k), `SF-IMD`, `MT-IMD`.

Add/remove controls use small `+` and `×` icon buttons. Empty inputs are ignored on Calculate (no NaN propagation).

## Calculation flow

On Calculate:

1. Read `state.scenario`. Reject if zero sections enabled — toast: "Enable at least one calculator."
2. Build a list of "result rows" `{ freq, source, order }` by union:
   - **Harmonics** (if enabled): for each fundamental F, emit `{F, 'Fundamental', 1}` plus `{k·F, 'H_'+k, k}` for k=2..16. (Fundamental row is included so the table is self-explanatory.)
   - **SF-IMD** (if enabled): call `enumerateIMD(tones, { maxOrder, fLo, fHi, allowSingleTone: true })`. For each product, emit `{freq, 'SF-IMD', order}` where order is the tuple's total `Σ|k_i|`. (Order returned alongside `products` — needs a small engine extension to track order per product.)
   - **MT-IMD** (if enabled): for each group, build symmetric tone array `tones_i = Fc + (i − (N+1)/2)·Δf`, then `enumerateIMD(tones, { maxOrder, fLo, fHi, allowSingleTone: false })`. Window = `[Fc − filterWidth/2, Fc + filterWidth/2]` (see filter-width convention note below).
3. SF-IMD window = `[center − filterWidth/2, center + filterWidth/2]` where `center = (min(tones) + max(tones))/2` (per VBA).

> **Filter width convention (resolution of a VBA inconsistency):** the original spreadsheet treated the filter-width field as *full bandwidth* in `Single_Freq_IMD` (D2) and as *one-sided half-width* in `MT_IMD_Calc` (col F). v1 standardizes on **full bandwidth everywhere** — i.e. the MT-IMD window in this app is `[Fc − filterWidth/2, Fc + filterWidth/2]`, which is half as wide as the spreadsheet's MT-IMD window for the same numeric input. This is the user-facing semantic change; SF-IMD behavior is unchanged.
4. Merge all result rows. Dedup at 1 kHz across the merged set, but **keep all distinct (source, order) pairs that map to the same freq** — they're informationally distinct (e.g. H_2 of 100 MHz and a 3rd-order IMD product can both land on 200 MHz). The 1 kHz dedup only collapses identical (source, order, freq) tuples.
5. Sort ascending by freq.
6. For each row, set `jrfl = MatchesJRFL(freq, ctl.jrfl, tol=0.001)`, `inBounds = ctl.haveBounds && startF ≤ freq ≤ stopF`.
7. Render into table. Update count summary.

Heavy-compute guard: before running each section, compute estimate `(2N+1)^maxOrder` (using that section's effective N). If sum across all enabled sections > 5M, show `confirm()` dialog before proceeding.

## Coloring rules (verbatim port from VBA)

- JRFL match (within 1 kHz of any JRFL freq) → `#FFCCCC` (red). Wins.
- Otherwise, bounds present AND `startF ≤ freq ≤ stopF` → `#CCFFCC` (green).
- Otherwise → no tint.
- If `stopF < startF`, swap them (VBA does this).
- Bounds missing or non-numeric → treated as no bounds.

## Error handling

- Non-numeric inputs: skipped silently on Calculate. Visible in the UI as the input being blank or with the user's literal text — no auto-clear.
- `N < 2` in an MT-IMD group: that group skipped, with an inline error message under the group: `"N must be ≥ 2"`.
- `Δf ≤ 0` in an MT-IMD group: that group skipped, inline message: `"Δf must be > 0"`.
- `maxOrder < 2`: clamp to 2.
- `maxOrder > 9`: clamp to 9, inline note: `"Capped at 9"`.
- Filter width missing on SF-IMD: inline error: `"Filter width required"`. SF-IMD section skipped, others proceed.
- Per-section enumeration hitting 16k product cap: that section's contribution truncated, banner above the table: `"SF-IMD hit 16,000-product cap; tighten filter or lower order."`

No `try/catch` shotgun. Engine functions are total over valid input; UI is responsible for filtering invalid input before calling engine.

## Persistence (v1)

- `localStorage` key: `harmonics_calc_v1`
- Value: `JSON.stringify(state.scenario)`
- Write: debounced 250 ms after any input change
- Read: on page load, restore if present; on JSON parse error, log to console and use empty default
- No versioning yet — v2 will add a version field when JSON file save/load lands

## Testing strategy (v1)

No automated test runner in v1 — deferred to v2. Validation in v1 is by hand against the spreadsheet: open `harmonics_v3.xlsm` and the new HTML side by side, compare a few seed cases:

- Single fundamental at 100 MHz → harmonics 200, 300, …, 1600 (trivial)
- Three-tone SF-IMD at 100, 105, 108 MHz, max order 3, wide filter → product set should match the spreadsheet's E..Z dump
- MT-IMD: Fc=1000, N=3, Δf=10, max order 5, filter 100 MHz → product set match

These three seed cases will be promoted into v2's automated golden-vector tests.

## Out of scope (explicit)

- No charts in v1.
- No CSV export in v1 (use browser copy/paste from the table if needed).
- No JSON save/load in v1.
- No undo/redo.
- No multi-scenario tabs.
- No print stylesheet.
- No accessibility audit beyond using semantic HTML + sensible tab order.

## v2 follow-up backlog

- JSON Save/Load with a version field.
- CSV export.
- "Run tests" button with golden vectors captured from this v1 against the spreadsheet.
- Spectrum visualization (frequency axis with JRFL marks and bound band).
- Per-product provenance tooltip (the actual coefficient tuple, e.g. `2·F1 − F2 + F3`).
