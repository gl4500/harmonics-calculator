# CSV Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Import CSV` button that reads a CSV (same format as Export CSV) and renders its rows into the existing results table, without modifying scenario state.

**Architecture:** Pure `fromCSV(csv)` helper in the engine block (testable headlessly). UI block adds a hidden `<input type="file">` plus an `Import CSV` button next to Export CSV; FileReader → fromCSV → synthetic result → existing `renderResults` orchestrator.

**Tech Stack:** Vanilla HTML/CSS/JS in the single .html file. `<input type="file">` + `FileReader` (no library).

**Spec:** `docs/superpowers/specs/2026-05-30-csv-import-design.md`

**Deliverable:** Continued modifications to `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`. Final tests: 34 (up from 31).

**Sync:** the existing pre-commit hook mirrors `harmonics_calculator.html` → `index.html`. All edits go to the canonical `harmonics_calculator.html`.

---

## File Map

One runtime file. Three regions modified.

- Modify: `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`
  - `<script type="module" id="engine">` — add `fromCSV(csv)` + expose via `window.__engine`
  - `<body>` markup — add hidden `<input type="file" id="csv-import-input">`
  - `<script type="module" id="ui">` — add `importCSV()`, file-input change handler, button in `renderViewToggle`, summary tweak for `result.importedFrom`
  - `<script type="module" id="tests">` — append 3 tests for `fromCSV`

---

## Task 1: Engine — `fromCSV()` with TDD

**Files:**
- Modify: `harmonics_calculator.html` — `#engine` block + `#tests` block

- [ ] **Step 1: Append 3 failing tests in the tests block**

Find the line `console.info('Tests installed. Run window.runEngineTests().');` in the tests block. Append these 3 tests immediately BEFORE it:

```js
    // ── fromCSV() ───────────────────────────────────────────────────
    const { fromCSV } = window.__engine;

    test('fromCSV: round-trip with toCSV preserves rows', () => {
      const rows = [
        { freq: 100, source: 'Fundamental', order: 1, jrfl: false, inBand: false },
        { freq: 200, source: 'H_2',         order: 2, jrfl: false, inBand: true  },
        { freq: 300, source: 'SF-IMD',      order: 3, jrfl: true,  inBand: false }
      ];
      const csv = window.__engine.toCSV(rows);
      const parsed = fromCSV(csv);
      assertEqual(parsed.errors.length, 0);
      assertEqual(parsed.rows.length, 3);
      // The roundtrip preserves freq, source, order, and the boolean fields.
      for (let i = 0; i < rows.length; i++) {
        assertEqual(parsed.rows[i].freq,   rows[i].freq);
        assertEqual(parsed.rows[i].source, rows[i].source);
        assertEqual(parsed.rows[i].order,  rows[i].order);
        assertEqual(parsed.rows[i].jrfl,   rows[i].jrfl);
        assertEqual(parsed.rows[i].inBand, rows[i].inBand);
      }
    });

    test('fromCSV: bad header rejected with error, no rows', () => {
      const r = fromCSV('Wrong,Header,Layout\r\n100,200,300\r\n');
      assertEqual(r.rows.length, 0);
      if (r.errors.length === 0 || !/Header mismatch/i.test(r.errors[0])) {
        throw new Error('expected Header mismatch error, got: ' + JSON.stringify(r.errors));
      }
    });

    test('fromCSV: permissive boolean parser accepts TRUE / true / 1 / yes / empty', () => {
      const csv =
        'Freq (MHz),Source,Order,JRFL,In bounds\r\n' +
        '100,A,1,TRUE,FALSE\r\n' +
        '200,B,2,true,false\r\n' +
        '300,C,3,1,0\r\n' +
        '400,D,4,yes,no\r\n' +
        '500,E,5,,\r\n';
      const r = fromCSV(csv);
      assertEqual(r.errors.length, 0);
      assertEqual(r.rows.length, 5);
      assertEqual(r.rows[0].jrfl, true);   assertEqual(r.rows[0].inBand, false);
      assertEqual(r.rows[1].jrfl, true);   assertEqual(r.rows[1].inBand, false);
      assertEqual(r.rows[2].jrfl, true);   assertEqual(r.rows[2].inBand, false);
      assertEqual(r.rows[3].jrfl, true);   assertEqual(r.rows[3].inBand, false);
      assertEqual(r.rows[4].jrfl, false);  assertEqual(r.rows[4].inBand, false);
    });
```

- [ ] **Step 2: Run headless verifier; all 3 new tests MUST FAIL**

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected last lines:
```
FAIL fromCSV: round-trip with toCSV preserves rows — fromCSV is not a function
FAIL fromCSV: bad header rejected with error, no rows — ...
FAIL fromCSV: permissive boolean parser accepts TRUE / true / 1 / yes / empty — ...
31 passed, 3 failed
```

Important: confirm 3 failures. If you see other errors (syntax error, test runner crash), STOP and report.

- [ ] **Step 3: Add `fromCSV()` to the engine block, just above the existing `window.__engine = {…}` line**

```js
    // fromCSV(csv) → { rows, errors }
    // rows: [{freq, source, order, jrfl, inBand}] — same shape calculate() emits.
    // errors: string[] — header mismatch (then rows=[]) or per-row skips with
    //   "Skipped line N: <reason>" messages.
    //
    // Header (first non-empty line, BOM-stripped) must equal exactly:
    //   'Freq (MHz),Source,Order,JRFL,In bounds'
    // Surrounding whitespace tolerated. CR/LF/CRLF line endings handled.
    //
    // Boolean parser accepts: TRUE/FALSE, true/false, 1/0, yes/no, ✓
    // (case-insensitive). Empty / missing → false.
    // Anything else → row skipped with warning.
    export function fromCSV(csv) {
      const EXPECTED_HEADER = 'Freq (MHz),Source,Order,JRFL,In bounds';
      const errors = [];
      if (typeof csv !== 'string' || csv.trim().length === 0) {
        return { rows: [], errors: ['Empty file'] };
      }
      // Strip UTF-8 BOM if present (Excel often prepends it).
      const text = csv.charCodeAt(0) === 0xFEFF ? csv.slice(1) : csv;
      const lines = text.split(/\r\n|\n|\r/);

      // Find first non-empty line as the header.
      let headerIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().length > 0) { headerIdx = i; break; }
      }
      if (headerIdx < 0) return { rows: [], errors: ['Empty file'] };

      // Normalize header by trimming each field.
      const headerFields = lines[headerIdx].split(',').map(s => s.trim());
      const expectedFields = EXPECTED_HEADER.split(',');
      const headerMatches =
        headerFields.length === expectedFields.length &&
        headerFields.every((f, i) => f === expectedFields[i]);
      if (!headerMatches) {
        return {
          rows: [],
          errors: [`Header mismatch: expected '${EXPECTED_HEADER}', got '${lines[headerIdx].trim()}'`]
        };
      }

      function parseBool(raw) {
        const v = String(raw ?? '').trim().toLowerCase();
        if (v === '' ) return { ok: true, value: false };
        if (v === 'true'  || v === '1' || v === 'yes' || v === 'y' || v === '✓') {
          return { ok: true, value: true };
        }
        if (v === 'false' || v === '0' || v === 'no'  || v === 'n') {
          return { ok: true, value: false };
        }
        return { ok: false, value: false };
      }

      const rows = [];
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const raw = lines[i];
        if (raw.trim().length === 0) continue;
        const cells = raw.split(',');
        if (cells.length < 5) {
          errors.push(`Skipped line ${i + 1}: expected 5 columns, got ${cells.length}`);
          continue;
        }
        const freq = Number(cells[0]);
        if (!Number.isFinite(freq)) {
          errors.push(`Skipped line ${i + 1}: non-numeric freq '${cells[0]}'`);
          continue;
        }
        const source = cells[1].trim();
        if (source.length === 0) {
          errors.push(`Skipped line ${i + 1}: empty source`);
          continue;
        }
        const orderNum = Number(cells[2]);
        if (!Number.isFinite(orderNum) || orderNum < 0 || !Number.isInteger(orderNum)) {
          errors.push(`Skipped line ${i + 1}: invalid order '${cells[2]}'`);
          continue;
        }
        const jrflP = parseBool(cells[3]);
        if (!jrflP.ok) {
          errors.push(`Skipped line ${i + 1}: invalid JRFL '${cells[3]}'`);
          continue;
        }
        const bandP = parseBool(cells[4]);
        if (!bandP.ok) {
          errors.push(`Skipped line ${i + 1}: invalid In bounds '${cells[4]}'`);
          continue;
        }
        rows.push({
          freq, source, order: orderNum,
          jrfl: jrflP.value, inBand: bandP.value
        });
      }
      return { rows, errors };
    }
```

- [ ] **Step 4: Add `fromCSV` to `window.__engine` exposure**

Replace:
```js
    window.__engine = { harmonics, classify, enumerateIMD, calculate, buildPivot, toCSV,
                        MAX_ORDER_HARD_CAP, PER_ROW_PRODUCT_CAP, AUTO_WIDTH_K,
                        JRFL_TOL_MHZ, HEAVY_COMPUTE_THRESHOLD };
```
with:
```js
    window.__engine = { harmonics, classify, enumerateIMD, calculate, buildPivot, toCSV, fromCSV,
                        MAX_ORDER_HARD_CAP, PER_ROW_PRODUCT_CAP, AUTO_WIDTH_K,
                        JRFL_TOL_MHZ, HEAVY_COMPUTE_THRESHOLD };
```

- [ ] **Step 5: Re-run headless verifier; ALL 34 must pass**

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected: `34 passed, 0 failed.`

If a test fails, fix the engine code (not the test). If it's the round-trip test failing on freq, the likely culprit is `toCSV` formatting `100.0` as `"100"` and `Number("100")` returns `100` — that's the correct behavior. If something else fails, debug by reading the actual vs expected in the test failure message.

---

## Task 2: UI — `Import CSV` button + hidden file input + change handler + summary tweak

**Files:**
- Modify: `harmonics_calculator.html` — `<body>` markup, `#ui` block

- [ ] **Step 1: Add the hidden file input to the body markup**

Find the closing `</main>` tag. Insert immediately AFTER it (so the input lives at body level, not inside any card):

```html
  <input type="file" id="csv-import-input" accept=".csv,text/csv" style="display:none">
```

The hidden input is shared across all imports; the visible button just triggers its file picker.

- [ ] **Step 2: Add `importCSV()` and the change handler in the UI block**

Use Grep to find `function renderViewToggle` in the UI block. Insert this block immediately ABOVE that function:

```js
    function importCSV() {
      const input = document.getElementById('csv-import-input');
      input.value = '';   // allow re-importing the same file
      input.click();
    }

    document.getElementById('csv-import-input').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const { rows, errors } = window.__engine.fromCSV(String(reader.result ?? ''));
        renderResults({
          rows,
          warnings: errors,
          capBanners: [],
          sectionsRun: { harmonics: 0, sfImd: 0, mtImd: 0 },
          estimatedCombos: 0,
          importedFrom: file.name
        });
      };
      reader.onerror = () => {
        renderResults({
          rows: [],
          warnings: ['Failed to read file: ' + (reader.error?.message ?? 'unknown')],
          capBanners: [], sectionsRun: {}, estimatedCombos: 0
        });
      };
      reader.readAsText(file);
    });
```

- [ ] **Step 3: Extend `renderViewToggle` to append the Import CSV button**

The current function (after CSV-export task) is:

```js
    function renderViewToggle(result) {
      const wrap = el('span', { class: 'view-toggle' });
      const mkBtn = (label, mode) => el('button', {
        class: viewMode === mode ? 'active' : '',
        onclick: () => { viewMode = mode; renderResults(result); }
      }, label);
      wrap.append(mkBtn('List', 'list'));
      wrap.append(mkBtn('Pivot', 'pivot'));
      const exportBtn = el('button', {
        title: 'Download results as CSV',
        disabled: (result.rows?.length ?? 0) === 0 ? '' : null,
        onclick: () => downloadCSV(result)
      }, 'Export CSV');
      wrap.append(exportBtn);
      return wrap;
    }
```

Append an Import button after the Export button. Replace the function body so it ends:

```js
    function renderViewToggle(result) {
      const wrap = el('span', { class: 'view-toggle' });
      const mkBtn = (label, mode) => el('button', {
        class: viewMode === mode ? 'active' : '',
        onclick: () => { viewMode = mode; renderResults(result); }
      }, label);
      wrap.append(mkBtn('List', 'list'));
      wrap.append(mkBtn('Pivot', 'pivot'));
      const exportBtn = el('button', {
        title: 'Download results as CSV',
        disabled: (result.rows?.length ?? 0) === 0 ? '' : null,
        onclick: () => downloadCSV(result)
      }, 'Export CSV');
      wrap.append(exportBtn);
      const importBtn = el('button', {
        title: 'Load a CSV with the same columns as Export CSV',
        onclick: () => importCSV()
      }, 'Import CSV');
      wrap.append(importBtn);
      return wrap;
    }
```

The Import button has no `disabled` state (no preconditions to import).

- [ ] **Step 4: Tweak the summary text in `renderResults` to honor `importedFrom`**

Find the existing summary-build lines in `renderResults`:

```js
      const jrflHits = result.rows.filter(r => r.jrfl).length;
      sum.replaceChildren();
      sum.append(`${result.rows.length} products, ${jrflHits} JRFL hits.`);
      sum.append(renderViewToggle(result));
```

Replace them with:

```js
      const jrflHits = result.rows.filter(r => r.jrfl).length;
      sum.replaceChildren();
      const importNote = result.importedFrom
        ? ` (imported from ${result.importedFrom})`
        : '';
      sum.append(`${result.rows.length} products, ${jrflHits} JRFL hits${importNote}.`);
      sum.append(renderViewToggle(result));
```

- [ ] **Step 5: Run headless verifier as a sanity check (UI changes shouldn't affect engine tests)**

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected: `34 passed, 0 failed.`

- [ ] **Step 6: Manual verification in Chrome**

1. Reload the page.
2. Enable Harmonics, fundamental = 100. Click Calculate. You should see four buttons next to the count summary: `[ List ][ Pivot ][ Export CSV ][ Import CSV ]`.
3. Click Export CSV — file downloads (e.g. `harmonics_results_2026-05-30_HHmm.csv`).
4. Without changing anything else, click Import CSV → file picker opens. Choose the CSV you just exported.
5. Expected: the same 16 rows redisplay. Summary now reads `16 products, 0 JRFL hits (imported from harmonics_results_…csv).`
6. Toggle List ↔ Pivot to confirm both views show the imported rows.
7. Click Calculate again — the imported view is replaced by a fresh computation (same data in this case, summary loses the "(imported from …)" suffix).
8. Open DevTools → Console. Confirm no errors.

Bad-CSV smoke test (~1 min):
- Open a new CSV file in a text editor with content `Garbage,Header,Layout\n1,2,3`.
- Click Import CSV → choose that file.
- Expected: an orange banner above the table reads `Header mismatch: expected '…'`. Table is empty (or unchanged — Renderer clears it).

---

## Task 3: Commit + push

- [ ] **Step 1: Stage and commit**

```powershell
cd "C:\Users\gl450\Harmonics Calculator"
git add harmonics_calculator.html docs/superpowers/specs/2026-05-30-csv-import-design.md docs/superpowers/plans/2026-05-30-csv-import.md
git commit -m "Add CSV import: fromCSV() engine helper + Import CSV button (view-only)"
```

The pre-commit hook auto-syncs `index.html` and includes it in the commit.

- [ ] **Step 2: Push**

```powershell
git push
```

Pages redeploys in ~60s.

- [ ] **Step 3: Verify live**

Open https://gl4500.github.io/harmonics-calculator/ on desktop or phone. Calculate something, Export CSV, then Import CSV with the file you just saved. The imported view should display correctly.

Done.
