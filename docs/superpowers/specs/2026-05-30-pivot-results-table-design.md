# Pivot Results Table — Design

**Date:** 2026-05-30
**Status:** Approved by user; ready for implementation plan
**Builds on:** `2026-05-29-harmonics-html-calculator-design.md` (v1)

---

## Goal

Add a Source × Order pivot view of the results table to the existing single-file HTML calculator. User toggles between the existing long-format list and the new pivot via a button in the Results card header. Per-frequency tinting inside pivot cells preserves JRFL / in-band visual cues.

## Non-goals

- Engine changes
- Scenario shape changes
- CSV / clipboard export of pivot (deferred to v2 along with existing CSV export backlog)
- Persisting view choice across sessions
- Sortable pivot columns (columns ARE the sort key)
- Click-through, filter, or expand interactions on pivot cells

## Deliverable

Continued modifications to `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`. UI block only.

---

## Architecture

No state changes. `calculate(scenario)` already produces `result.rows = [{freq, source, order, jrfl, inBand}]`. A pure pivot-builder helper `buildPivot(rows)` is added to the engine block (alongside `calculate`) so the existing test harness can verify it directly via `window.__engine`. The UI block dispatches on a local `viewMode` variable to call either the existing list renderer or a new pivot renderer.

```
calculate(scenario)
        │
        ▼
result.rows = [{freq, source, order, jrfl, inBand}, ...]
        │
        ├── viewMode === 'list'  → renderListTable(result)    [existing]
        └── viewMode === 'pivot' → renderPivotTable(result)   [new]
                                        │
                                        ▼
                                buildPivot(result.rows)
                                        │
                                        ▼
                                { sourceLabels, matrix }
```

## UI changes

**1. View toggle in Results card header.** Two small buttons immediately after the `Results` heading:

```
RESULTS    [ List | Pivot ]    16 products, 1 JRFL hits.
```

`viewMode` is a UI-only local variable (`'list'` | `'pivot'`), not persisted in scenario or localStorage. Default = `'pivot'`.

**2. Pivot grouping rules.** `buildPivot(rows)` groups by source:

- Rows where `source === 'Fundamental'` or `source` matches `/^H_\d+$/` → one group, label `Harmonics`.
- Rows where `source === 'SF-IMD'` → one group, label `Single-Freq IMD`.
- Rows where `source` matches `/^MT-IMD #(\d+)$/` → one group per N, label `Multi-Tone IMD #N`. Sort numerically by N.

Groups that end up empty are omitted from the rendered table. Order of remaining groups in the table:

1. Harmonics (if any)
2. Single-Freq IMD (if any)
3. Each Multi-Tone IMD #N in ascending N

**3. Pivot column range.** Always 16 fixed columns labeled `Order 1` through `Order 16`. Header row uses the same `<th>` styling as the list table but no sort cursor / arrow (sorting is meaningless here).

**4. Cell content.** Each cell holds zero or more frequencies. Frequencies are sorted ascending within the cell. Rendering:

```html
<td>
  <span class="freq jrfl">300</span>
  <span class="freq band">210</span>
  <span class="freq">90</span>
</td>
```

`.freq` is a new CSS class with small padding (2px 6px), rounded corners (4px), `display: inline-block`, and `margin: 2px`. The existing `tr.jrfl td` and `tr.band td` background rules do NOT apply to pivot rows — pivot rows have no row-level tint, only per-`<span>` tint.

Number formatting uses the same `freq.toFixed(6).replace(/\.?0+$/, '')` rule as the list table. (The known minor issue where exactly 0 renders as empty string carries over — out of scope.)

**5. Empty cells.** No `&mdash;`, no placeholder text. Empty `<td>` with no children. CSS gives cells a fixed min-height (1.5em) so empty cells still align rows visually.

## Data flow

```js
// in renderResults(result):
const viewToggle = renderViewToggle(viewMode, (next) => {
  viewMode = next;
  renderResults(result);   // re-render with same result data
});

if (viewMode === 'pivot') {
  renderPivotTable(result);
} else {
  renderListTable(result);  // existing logic, factored out
}
```

`buildPivot(rows)`:

```
input:  [{freq, source, order, jrfl, inBand}, ...]
output: {
  sourceLabels: ['Harmonics', 'Single-Freq IMD', 'Multi-Tone IMD #1', ...],
  matrix: Map<sourceLabel, Map<orderInt, [{freq, jrfl, inBand}, ...]>>
}
```

The matrix is built in one pass over `rows`. For each row:
1. Compute its `sourceLabel` from the source string (regex match).
2. Insert `{freq, jrfl, inBand}` into `matrix.get(sourceLabel).get(order)`.

After the pass, sort the inner arrays ascending by `freq` and sort `sourceLabels` per the rule above.

## CSS additions

```css
.view-toggle {
  display: inline-flex;
  gap: 4px;
  margin-left: 12px;
  vertical-align: middle;
}
.view-toggle button {
  padding: 2px 10px;
  font-size: 12px;
  border-radius: 4px;
}
.view-toggle button.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.pivot-scroll {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 6px;
  max-height: 60vh;
}
table.pivot { width: max-content; min-width: 100%; }
table.pivot th, table.pivot td {
  border-bottom: 1px solid var(--border);
  padding: 6px 8px;
  vertical-align: top;
  min-width: 64px;
}
table.pivot td:first-child {
  font-weight: 500;
  white-space: nowrap;
  position: sticky;
  left: 0;
  background: var(--card);
  z-index: 1;
}
table.pivot .freq {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  margin: 2px;
  font-variant-numeric: tabular-nums;
}
table.pivot .freq.jrfl { background: var(--row-jrfl); }
table.pivot .freq.band { background: var(--row-band); }
```

The pivot table uses `width: max-content` to allow horizontal scrolling if 16 order columns exceed page width on narrow viewports. The first column (source label) is sticky-left so it stays visible while scrolling.

## Error handling

- If `result.rows` is empty, render an empty pivot table (just the header row) plus the existing summary text. No special "no data" state needed.
- If `buildPivot()` is called with malformed rows, it ignores them (regex misses are silently dropped to the catch-all `Other` row). For the current engine output this can't happen, but the catch-all is a safety net.

## Testing strategy

Add 2 inline engine tests for `buildPivot()` (pure function, no DOM):

1. Harmonics + SF-IMD scenario produces a matrix with the expected source labels and per-cell frequencies in expected order columns.
2. MT-IMD multiple groups produce distinct rows ordered by group number.

Manual UI verification:
1. Default load shows Pivot view.
2. Toggle to List, then back to Pivot — same data, no flicker / data loss.
3. JRFL hit highlight: set JRFL = `200`, fundamental = `100`, Calculate, switch to Pivot — `200` cell inside Harmonics row, Order 2 column should have a red tinted `<span>`.
4. Empty pivot when no calc has run shows just headers.

## Implementation order

1. Refactor existing `renderResults(result)` to extract `renderListTable(result)` (no behavior change, just move code).
2. Add `viewMode` UI-local state, defaulting to `'pivot'`.
3. Add `buildPivot(rows)` pure helper + 2 tests.
4. Add `renderPivotTable(result)` and view-toggle UI.
5. CSS rules for `.view-toggle`, `.pivot-scroll`, `table.pivot`, etc.
6. Wire `renderResults(result)` to dispatch on `viewMode`.
7. Manual UI smoke test in Chrome.

## v2 follow-up backlog

- CSV export honors current view mode (long or pivot).
- Persist `viewMode` to localStorage so the user's preference survives reload.
- Click a frequency span → highlight its provenance (which tuple produced it).
- "Show all order columns" toggle that hides empty trailing columns when irrelevant.
