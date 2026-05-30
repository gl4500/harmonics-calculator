# CSV Import — Design

**Date:** 2026-05-30
**Status:** Approved; ready for implementation plan
**Builds on:** prior specs (v1/v2/v3/CSV-export)

---

## Goal

One-click import of a CSV file produced by the Export CSV feature (or any file with the same structure), rendered into the existing results table for visual inspection. View-only: importing does not modify scenario inputs.

## Non-goals

- Importing scenario inputs alongside results (CSV format has no scenario columns)
- Drag-and-drop file upload (button + file picker is sufficient)
- Pivot-format CSV import (matches export which is list-format only)
- Persisting imported rows across page reloads
- Round-trip editing (import → tweak → re-export)
- Re-classifying imported freqs against the current Control panel — tinting honors the CSV's columns, not Control

## Deliverable

Continued modifications to `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`.

---

## Architecture

```
file picker → FileReader.readAsText → string ┐
                                              ├─ fromCSV(string) → { rows, errors }
                                              │
                                              ▼
                           renderResults({ rows, warnings: errors, capBanners: [],
                                           sectionsRun: {}, estimatedCombos: 0 })
                                              │
                                              ├─ renderListTable / renderPivotTable (existing)
                                              └─ count summary, banners (existing)
```

A new pure `fromCSV(csv)` helper in the engine block parses CSV text into the same `result.rows` shape that `calculate()` produces. The UI block adds an `Import CSV` button next to Export CSV; clicking it opens a hidden `<input type="file">`, reads the file via `FileReader`, calls `fromCSV`, and synthesizes a result object to drive the existing `renderResults` orchestrator. Nothing about scenario state changes.

## Engine API addition

```js
// fromCSV(csv) → { rows, errors }
//   rows: [{ freq: number, source: string, order: number, jrfl: boolean, inBand: boolean }]
//     — same shape as calculate().rows so downstream renderers don't care about origin.
//   errors: string[] — header rejection (then rows = []) or per-row skip messages.
//
// Header (first non-empty line) must match: 'Freq (MHz),Source,Order,JRFL,In bounds'
// (case-sensitive, whitespace between fields tolerated). If header mismatches,
// returns { rows: [], errors: ['Header mismatch: …'] }.
//
// Per-row rules:
//   - freq parsed via Number(); rejects non-finite
//   - source: any non-empty string (trimmed)
//   - order parsed via Number() then Math.trunc(); rejects non-integer or negative
//   - jrfl/inBand parsed permissively (see boolean parser)
// Invalid rows are SKIPPED with an error message including the line number.
//
// Empty input or whitespace-only input → { rows: [], errors: ['Empty file'] }.
export function fromCSV(csv): { rows, errors }
```

Boolean parsing accepts: `TRUE/FALSE`, `true/false`, `1/0`, `yes/no`, `✓` (and empty → false). Case-insensitive. Anything else → row-skip warning.

## UI changes

**Button placement:** Inside the existing `renderViewToggle` span, immediately after the Export CSV button. Label: `Import CSV`. Not disabled (no preconditions).

**Hidden file input:** Added once to the page body. Reused for every import click.

```html
<input type="file" id="csv-import-input" accept=".csv,text/csv" style="display:none">
```

**Click handler:**

```js
function importCSV() {
  const input = document.getElementById('csv-import-input');
  input.value = ''; // Allow re-importing the same file
  input.click();
}

document.getElementById('csv-import-input').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const { rows, errors } = window.__engine.fromCSV(String(reader.result ?? ''));
    const synthetic = {
      rows,
      warnings: errors,
      capBanners: [],
      sectionsRun: { harmonics: 0, sfImd: 0, mtImd: 0 },
      estimatedCombos: 0,
      importedFrom: file.name
    };
    renderResults(synthetic);
  };
  reader.onerror = () => {
    renderResults({
      rows: [], warnings: ['Failed to read file: ' + (reader.error?.message ?? 'unknown')],
      capBanners: [], sectionsRun: {}, estimatedCombos: 0
    });
  };
  reader.readAsText(file);
});
```

**Count summary tweak:** when `result.importedFrom` is set, the summary text reads `X products, Y JRFL hits (imported from <filename>)`. Achieved by extending the one-line summary build in `renderResults` to honor that optional field.

## What happens to existing UI behavior

- View toggle (List/Pivot) keeps working — both views consume `result.rows` regardless of where rows came from.
- Tinting: rows carry their own `jrfl`/`inBand` booleans from the CSV; `classify()` is NOT re-run against Control's bounds/JRFL. Imported rows display exactly as exported.
- Calculate button: pressing Calculate replaces the imported view with newly computed rows. There is no "you have unsaved import" warning — the import is transient.
- Clear All: also clears the imported view (it calls `renderResults` indirectly via the reset).
- Export CSV: after an import, Export downloads the imported rows back out — round-trip works.

## Error handling

All errors surface through the existing `warnings` channel which `renderResults` already pipes into the cap-banner area.

| Cause | Behavior |
|---|---|
| Header mismatch | Single banner: `"Header mismatch: expected 'Freq (MHz),Source,Order,JRFL,In bounds'"`. Table cleared. |
| Empty file | Banner: `"Empty file"`. Table cleared. |
| Per-row issue | Row skipped; one banner per issue, e.g. `"Skipped line 5: non-numeric freq '12abc'"`. Valid rows still rendered. |
| FileReader failure (rare) | Banner with the reader's error message. |
| Wrong file type (non-CSV) | `accept=".csv,text/csv"` filters in the picker; if user overrides, parser likely rejects header. |

No exceptions thrown. Engine `fromCSV` is total over any string input.

## Tests

Add 3 inline engine tests:

1. `fromCSV: round-trip with toCSV preserves rows` — produce rows via known input, `toCSV`, then `fromCSV`, verify equivalent rows.
2. `fromCSV: bad header rejected with error, no rows` — verify `errors[0]` mentions "Header mismatch" and `rows.length === 0`.
3. `fromCSV: permissive boolean parser` — feeds a CSV with `TRUE`, `false`, `1`, `yes`, empty cells across columns and verifies the parsed booleans.

Total tests after this task: 34 (existing 31 + 3 new).

The headless verifier (`node _verify/run_engine_tests.mjs`) picks them up automatically.

## Mobile considerations

- `<input type="file">` with `accept` attribute works on iOS Safari and Android Chrome. iOS may show "Photo Library / Take Photo / Choose Files" — choosing "Choose Files" opens Files app for CSV selection.
- `FileReader.readAsText` is supported on all target browsers.
- No download considerations — this is import only.

## Out-of-scope follow-ups (v4 backlog)

- Drag-and-drop file upload
- Compare imported vs computed (e.g. side-by-side view)
- Re-classify imported freqs against Control (toggle in UI)
- Import-then-edit-rows workflow
- Scenario JSON Save/Load (different file format)
