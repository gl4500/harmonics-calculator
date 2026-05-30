# CSV Export — Design

**Date:** 2026-05-30
**Status:** Approved; ready for implementation plan
**Builds on:** prior v1/v2/v3 specs (single-file calculator, pivot, per-section/per-row, mobile)

---

## Goal

One-click CSV export of the current results table. Long-format (one row per product) regardless of which view (List or Pivot) is active. File opens cleanly in Excel / Numbers / Google Sheets without manual fix-up.

## Non-goals

- Pivot-format CSV (embedded commas in cells would break parsing)
- Export of warnings, cap-banners, or input scenario alongside the rows
- CSV import / round-trip
- Custom delimiter selection (tab-separated, semicolon, etc.)

## Deliverable

Continued modifications to `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`.

---

## Architecture

A new pure helper `toCSV(rows)` lives in the engine block alongside the other pure data transforms. It accepts the same shape `result.rows` produced by `calculate()` and returns a CSV string. The UI block adds an `Export CSV` button next to the view toggle, builds a Blob from the CSV string, triggers a download via a temporary `<a download>` element, and revokes the URL.

```
calculate(scenario).rows  ─┐
                            ├─ toCSV(rows) → string ── Blob ── <a download> click ── revoke
                            └─ buildPivot(rows) (existing)
```

Engine purity preserved: `toCSV` is DOM-free and testable headlessly.

## Engine API addition

```js
// Convert result rows to a CSV string with a header row.
// Columns: Freq (MHz), Source, Order, JRFL, In bounds
// Booleans rendered as TRUE / FALSE (Excel recognizes both).
// Rows sorted ascending by freq before serialization.
// No quoting needed: source labels and column values contain no commas,
// quotes, or newlines (verified by the data model — Source is one of
// 'Fundamental' | 'H_<k>' | 'SF-IMD' | 'MT-IMD #<n>'; Order is integer;
// freq is a finite number).
export function toCSV(rows): string
```

The returned string ends with a trailing newline. Line ending: `\r\n` (CRLF) for Windows/Excel friendliness; Mac Numbers and Google Sheets handle CRLF transparently.

## UI changes

**Button placement:** in the existing `#results-summary` flex container, after the `view-toggle` span. Button text: `Export CSV`. Disabled when `result.rows.length === 0`.

**Click handler:**

```js
function downloadCSV(result) {
  const csv = window.__engine.toCSV(result.rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = csvFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvFilename() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `harmonics_results_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
}
```

The button is rendered alongside the view toggle so it stays adjacent to the count summary and view-switching controls.

## CSV format

```
Freq (MHz),Source,Order,JRFL,In bounds
100,Fundamental,1,FALSE,FALSE
200,H_2,2,FALSE,TRUE
300,H_3,3,TRUE,FALSE
```

- Header row exactly as shown above
- Numeric columns rendered with no fixed precision (`String(value)`): preserves all digits of the engine's actual computation
- Boolean columns serialized as bare `TRUE` / `FALSE`
- Line terminator `\r\n`
- UTF-8 (no BOM) — modern Excel reads UTF-8 fine; spreadsheet apps detect encoding from `;charset=utf-8` in the Blob MIME

## Mobile considerations

`Blob` + `URL.createObjectURL` + `<a download>` click is supported on:
- iOS Safari 14.5+ (download attribute respected from this version)
- Android Chrome (universal)
- Desktop Chrome / Safari / Firefox / Edge (universal)

On older iOS, the download falls back to opening the CSV in a new tab; user can use the share menu to save. Acceptable.

## Tests

Add 2 inline engine tests to the existing harness:

1. `toCSV: empty rows produces just the header + newline`
2. `toCSV: header + sample rows match expected CSV string (verifies boolean serialization + numeric format + line endings)`

Total tests after this task: 31 (existing 29 + 2 new).

The headless verifier (`node _verify/run_engine_tests.mjs`) picks them up automatically — no harness changes needed.

## Out-of-scope but worth noting

- **Pivot CSV** — Pivot view contains nested data (multiple freqs per cell). Trying to flatten that to CSV requires either escaped multi-line cells or a different file format (TSV with semicolons inside cells). Skipped for v3.
- **Export of input scenario** — Could be valuable for reproducibility but belongs in a separate "Save scenario" feature (JSON, not CSV).
- **Cap-banner / warnings** — Visible in the UI when relevant; not part of the data export.

## v4 backlog

- JSON Save/Load scenarios (save named setups)
- "Run tests" UI button surfacing engine test results in-page
- Spectrum chart view (third tab next to List / Pivot)
- Pivot CSV via TSV with semicolon-separated cell freqs (only if user asks)
