# CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click CSV export of the results table, downloadable from the Results card.

**Architecture:** New pure `toCSV(rows)` helper in the engine block (testable via the existing harness). UI block adds an `Export CSV` button next to the view toggle, builds a Blob, triggers a `<a download>` click.

**Tech Stack:** Vanilla HTML/CSS/JS in the existing single .html file, no new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-30-csv-export-design.md`

**Deliverable:** Continued modifications to `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`. Final tests: 31 (up from 29).

**Sync:** the existing pre-commit hook syncs `harmonics_calculator.html` → `index.html` automatically. All edits go to `harmonics_calculator.html`.

---

## File Map

One runtime file. Two regions modified, one new helper, one new button.

- Modify: `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`
  - `<script type="module" id="engine">` — add `toCSV(rows)` + expose via `window.__engine`
  - `<script type="module" id="ui">` — add `downloadCSV(result)`, `csvFilename()`, button rendering in `renderViewToggle` (or rather: replace `renderViewToggle` with `renderResultsControls` that includes both the toggle and the export button)
  - `<script type="module" id="tests">` — append 2 tests for `toCSV`

---

## Task 1: Engine — `toCSV()` with TDD

**Files:**
- Modify: `harmonics_calculator.html` — `#engine` block (add function), `#tests` block (add 2 tests)

- [ ] **Step 1: Add 2 failing tests in the tests block**

Append to the tests block, just before `console.info('Tests installed. Run window.runEngineTests().');`:

```js
    // ── toCSV() ─────────────────────────────────────────────────────
    const { toCSV } = window.__engine;

    test('toCSV: empty rows produces just the header + CRLF', () => {
      const csv = toCSV([]);
      assertEqual(csv, 'Freq (MHz),Source,Order,JRFL,In bounds\r\n');
    });

    test('toCSV: header + 3 rows match expected with TRUE/FALSE booleans, CRLF line endings, sorted ascending by freq', () => {
      // Deliberately passed out of order to verify sort.
      const rows = [
        { freq: 200, source: 'H_2',         order: 2, jrfl: false, inBand: true  },
        { freq: 100, source: 'Fundamental', order: 1, jrfl: false, inBand: false },
        { freq: 300, source: 'H_3',         order: 3, jrfl: true,  inBand: false }
      ];
      const expected =
        'Freq (MHz),Source,Order,JRFL,In bounds\r\n' +
        '100,Fundamental,1,FALSE,FALSE\r\n' +
        '200,H_2,2,FALSE,TRUE\r\n' +
        '300,H_3,3,TRUE,FALSE\r\n';
      assertEqual(toCSV(rows), expected);
    });
```

- [ ] **Step 2: Run the headless verifier to confirm both tests FAIL**

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected last lines:
```
FAIL toCSV: empty rows produces just the header + CRLF
FAIL toCSV: header + 3 rows match expected with TRUE/FALSE booleans, CRLF line endings, sorted ascending by freq
29 passed, 2 failed
```

The failure messages should be about `toCSV` being undefined (since the engine doesn't export it yet).

- [ ] **Step 3: Add `toCSV()` to the engine block, just above the existing `window.__engine = {…}` line**

```js
    // toCSV(rows) → CSV string
    // Columns: Freq (MHz), Source, Order, JRFL, In bounds
    // Booleans rendered TRUE/FALSE. Rows sorted ascending by freq.
    // Line endings: CRLF for Windows/Excel compatibility.
    // No quoting: source labels are restricted to alphanumerics, '_', '#',
    // hyphens, and spaces, none of which require CSV escaping.
    export function toCSV(rows) {
      const header = 'Freq (MHz),Source,Order,JRFL,In bounds';
      const sorted = (rows ?? []).slice().sort((a, b) => a.freq - b.freq);
      const lines = [header];
      for (const r of sorted) {
        lines.push([
          String(r.freq),
          r.source,
          String(r.order),
          r.jrfl ? 'TRUE' : 'FALSE',
          r.inBand ? 'TRUE' : 'FALSE'
        ].join(','));
      }
      return lines.join('\r\n') + '\r\n';
    }
```

- [ ] **Step 4: Update `window.__engine` to include `toCSV`**

Replace:
```js
    window.__engine = { harmonics, classify, enumerateIMD, calculate, buildPivot,
                        MAX_ORDER_HARD_CAP, PER_ROW_PRODUCT_CAP, AUTO_WIDTH_K,
                        JRFL_TOL_MHZ, HEAVY_COMPUTE_THRESHOLD };
```
with:
```js
    window.__engine = { harmonics, classify, enumerateIMD, calculate, buildPivot, toCSV,
                        MAX_ORDER_HARD_CAP, PER_ROW_PRODUCT_CAP, AUTO_WIDTH_K,
                        JRFL_TOL_MHZ, HEAVY_COMPUTE_THRESHOLD };
```

- [ ] **Step 5: Re-run the headless verifier — both tests should now PASS**

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected last lines:
```
PASS toCSV: empty rows produces just the header + CRLF
PASS toCSV: header + 3 rows match expected with TRUE/FALSE booleans, CRLF line endings, sorted ascending by freq
31 passed, 0 failed

OK — 31 tests passed.
```

If anything fails, debug the engine code (not the tests) until green.

---

## Task 2: UI — `Export CSV` button next to the view toggle

**Files:**
- Modify: `harmonics_calculator.html` — `#ui` block (add `downloadCSV` + `csvFilename`, extend `renderViewToggle` to include the button)

- [ ] **Step 1: Add `csvFilename()` and `downloadCSV()` helpers in the UI block**

Insert just above the existing `function renderViewToggle(result)` definition:

```js
    function csvFilename() {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      return `harmonics_results_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
    }

    function downloadCSV(result) {
      const csv = window.__engine.toCSV(result.rows ?? []);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = csvFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke after a tick so Safari has time to start the download
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
```

- [ ] **Step 2: Extend `renderViewToggle` to append an Export CSV button**

The current `renderViewToggle(result)` looks like:

```js
    function renderViewToggle(result) {
      const wrap = el('span', { class: 'view-toggle' });
      const mkBtn = (label, mode) => el('button', {
        class: viewMode === mode ? 'active' : '',
        onclick: () => { viewMode = mode; renderResults(result); }
      }, label);
      wrap.append(mkBtn('List', 'list'));
      wrap.append(mkBtn('Pivot', 'pivot'));
      return wrap;
    }
```

Replace it with:

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

The Export button reuses the existing `.view-toggle` span's styling and spacing. When `result.rows` is empty, the `disabled` attribute renders the button as inactive (HTML default disabled styling kicks in).

- [ ] **Step 3: Manual verification**

Reload `harmonics_calculator.html` in Chrome.

1. **Empty-results case:** click Clear All → confirm. Click Calculate with all sections off. Expected: `Enable at least one calculator.` summary, no toggle visible (existing short-circuit). Export CSV does not appear because the short-circuit bypasses `renderResults`. This is the existing behavior — acceptable.
2. **Populated-results case:** Enable Harmonics, fundamental = 100. Click Calculate. Expected: `[ List ][ Pivot ][ Export CSV ]` buttons appear next to the count summary. Export CSV is enabled (not greyed out).
3. **Click Export CSV.** Expected: browser downloads `harmonics_results_2026-05-30_HHmm.csv`. Open it in Excel/Numbers/text editor.
4. **Verify file contents:**
   ```
   Freq (MHz),Source,Order,JRFL,In bounds
   100,Fundamental,1,FALSE,FALSE
   200,H_2,2,FALSE,FALSE
   ...
   1600,H_16,16,FALSE,FALSE
   ```
   (16 data rows + 1 header.) JRFL/In-bounds depend on Control settings — verify by setting Start=150, Stop=400, JRFL=[300], re-Calculate, re-Export. Expected: row at 200 has `FALSE,TRUE`; row at 300 has `TRUE,FALSE`.

- [ ] **Step 4: Run engine tests one more time**

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected: `31 passed, 0 failed`. (Sanity check that the UI edits didn't accidentally touch the engine.)

---

## Task 3: Commit + push

- [ ] **Step 1: Stage and commit**

```powershell
cd "C:\Users\gl450\Harmonics Calculator"
git add harmonics_calculator.html docs/superpowers/specs/2026-05-30-csv-export-design.md docs/superpowers/plans/2026-05-30-csv-export.md
git commit -m "Add CSV export of results table (Export CSV button + toCSV engine helper)"
```

The pre-commit hook will sync `index.html` automatically and add it to the commit.

- [ ] **Step 2: Push to GitHub**

```powershell
git push
```

Pages re-deploys in about 60 seconds. The live site at https://gl4500.github.io/harmonics-calculator/ then has the Export button.

- [ ] **Step 3: Verify live**

Open the live URL in a browser, run a calculation, click Export CSV, confirm the file downloads. On mobile, the file may open in the browser preview instead of downloading — the share menu can then save it locally.

Done — CSV export shipped.
