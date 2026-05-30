# Pivot Results Table — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Source × Order pivot view to the existing HTML calculator's Results card, with a List / Pivot toggle and per-frequency tinting inside pivot cells.

**Architecture:** Pure helper `buildPivot(rows)` added to the engine block (testable via existing harness). The UI block refactors `renderResults` to dispatch on a local `viewMode` flag, calling either the existing list renderer or a new pivot renderer.

**Tech Stack:** Same as v1 — vanilla HTML/CSS/JS in a single `.html` file, Chrome only, no external libraries, no build step.

**User said: skip git for v1 + v2.** No commits. Each task verifies via DevTools console, the headless Node harness at `_verify/run_engine_tests.mjs`, or manual UI interaction.

**Spec:** `docs/superpowers/specs/2026-05-30-pivot-results-table-design.md`

**Deliverable:** Continued modifications to `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`.

---

## File Map

Only one runtime file is modified. The headless harness needs no changes — it discovers the engine block dynamically and will pick up `buildPivot` automatically.

- Modify: `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`
  - `<style>` — add CSS rules for `.view-toggle`, `.pivot-scroll`, `table.pivot`, `.freq` spans
  - `<script type="module" id="engine">` — add `buildPivot()` + expose on `window.__engine`
  - `<script type="module" id="ui">` — add `viewMode`, `renderViewToggle`, refactor `renderResults` → `renderListTable`, add `renderPivotTable`
  - `<script type="module" id="tests">` — add 2 tests for `buildPivot`

After all tasks, total engine tests = 27 (25 existing + 2 new).

---

## Task 1: Engine — buildPivot() pure helper

Pure data transform. No DOM. Tested headlessly via the existing harness.

**Files:**
- Modify: `harmonics_calculator.html` — `#engine` block (insert) and `#tests` block (add 2 tests)

- [ ] **Step 1: Insert `buildPivot()` in the engine block, just above the existing `window.__engine = {…}` line**

```js
    // buildPivot(rows) → { sourceLabels: string[], matrix: Map<string, Map<number, Cell[]>> }
    //   where Cell = { freq: number, jrfl: boolean, inBand: boolean }
    //
    // Groups result rows by source:
    //   - 'Fundamental' or 'H_<k>' → 'Harmonics'
    //   - 'SF-IMD'                 → 'Single-Freq IMD'
    //   - 'MT-IMD #<n>'            → 'Multi-Tone IMD #<n>' (one row per n)
    //   - anything else            → 'Other' (catch-all safety net)
    //
    // Within each (source, order) cell, frequencies are sorted ascending.
    // sourceLabels are ordered: Harmonics first, then Single-Freq IMD, then
    // Multi-Tone IMD #1, #2, …, then 'Other' last.
    export function buildPivot(rows) {
      const matrix = new Map();        // sourceLabel → (order → Cell[])
      const mtGroups = new Set();      // numeric N values seen for MT-IMD

      function labelOf(source) {
        if (source === 'Fundamental') return 'Harmonics';
        if (/^H_\d+$/.test(source)) return 'Harmonics';
        if (source === 'SF-IMD') return 'Single-Freq IMD';
        const m = /^MT-IMD #(\d+)$/.exec(source);
        if (m) {
          const n = Number(m[1]);
          mtGroups.add(n);
          return `Multi-Tone IMD #${n}`;
        }
        return 'Other';
      }

      for (const r of rows) {
        const label = labelOf(r.source);
        if (!matrix.has(label)) matrix.set(label, new Map());
        const byOrder = matrix.get(label);
        if (!byOrder.has(r.order)) byOrder.set(r.order, []);
        byOrder.get(r.order).push({ freq: r.freq, jrfl: !!r.jrfl, inBand: !!r.inBand });
      }

      // sort each cell ascending by freq
      for (const byOrder of matrix.values()) {
        for (const cells of byOrder.values()) {
          cells.sort((a, b) => a.freq - b.freq);
        }
      }

      // build ordered sourceLabels
      const sourceLabels = [];
      if (matrix.has('Harmonics')) sourceLabels.push('Harmonics');
      if (matrix.has('Single-Freq IMD')) sourceLabels.push('Single-Freq IMD');
      const mtSorted = [...mtGroups].sort((a, b) => a - b);
      for (const n of mtSorted) sourceLabels.push(`Multi-Tone IMD #${n}`);
      if (matrix.has('Other')) sourceLabels.push('Other');

      return { sourceLabels, matrix };
    }
```

- [ ] **Step 2: Update `window.__engine` to expose `buildPivot`**

Change:
```js
    window.__engine = { harmonics, classify, enumerateIMD, calculate,
                        MAX_ORDER_HARD_CAP, PER_ROW_PRODUCT_CAP, AUTO_WIDTH_K,
                        JRFL_TOL_MHZ, HEAVY_COMPUTE_THRESHOLD };
```
to:
```js
    window.__engine = { harmonics, classify, enumerateIMD, calculate, buildPivot,
                        MAX_ORDER_HARD_CAP, PER_ROW_PRODUCT_CAP, AUTO_WIDTH_K,
                        JRFL_TOL_MHZ, HEAVY_COMPUTE_THRESHOLD };
```

- [ ] **Step 3: Append 2 tests in the tests block, before `console.info('Tests installed. Run window.runEngineTests().');`**

```js
    // ── buildPivot() ─────────────────────────────────────────────────
    const { buildPivot } = window.__engine;

    test('buildPivot: Harmonics + SF-IMD scenario produces grouped matrix', () => {
      const rows = [
        { freq: 100, source: 'Fundamental', order: 1, jrfl: false, inBand: false },
        { freq: 200, source: 'H_2',         order: 2, jrfl: false, inBand: true  },
        { freq: 300, source: 'H_3',         order: 3, jrfl: true,  inBand: false },
        { freq: 90,  source: 'SF-IMD',      order: 3, jrfl: false, inBand: false },
        { freq: 120, source: 'SF-IMD',      order: 3, jrfl: false, inBand: false }
      ];
      const { sourceLabels, matrix } = buildPivot(rows);
      assertEqual(sourceLabels.length, 2);
      assertEqual(sourceLabels[0], 'Harmonics');
      assertEqual(sourceLabels[1], 'Single-Freq IMD');
      const harm = matrix.get('Harmonics');
      assertEqual(harm.get(1)[0].freq, 100);
      assertEqual(harm.get(2)[0].freq, 200);
      assertEqual(harm.get(2)[0].inBand, true);
      assertEqual(harm.get(3)[0].freq, 300);
      assertEqual(harm.get(3)[0].jrfl, true);
      const sf = matrix.get('Single-Freq IMD');
      // cell freqs sorted ascending: [90, 120]
      assertEqual(sf.get(3).length, 2);
      assertEqual(sf.get(3)[0].freq, 90);
      assertEqual(sf.get(3)[1].freq, 120);
    });

    test('buildPivot: multiple MT-IMD groups ordered by numeric N', () => {
      const rows = [
        { freq: 1000, source: 'MT-IMD #2', order: 3, jrfl: false, inBand: false },
        { freq: 500,  source: 'MT-IMD #1', order: 3, jrfl: false, inBand: false },
        { freq: 1500, source: 'MT-IMD #10', order: 3, jrfl: false, inBand: false }
      ];
      const { sourceLabels } = buildPivot(rows);
      assertEqual(sourceLabels.length, 3);
      assertEqual(sourceLabels[0], 'Multi-Tone IMD #1');
      assertEqual(sourceLabels[1], 'Multi-Tone IMD #2');
      // #10 sorted numerically AFTER #2, not alphabetically before
      assertEqual(sourceLabels[2], 'Multi-Tone IMD #10');
    });
```

- [ ] **Step 4: Verify all tests pass headlessly**

Run from PowerShell:

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected last lines:

```
27 passed, 0 failed

OK — 27 tests passed.
```

If any new test fails, debug by reading the buildPivot output: add a `console.log(JSON.stringify({ sourceLabels, matrix: [...matrix.entries()] }, null, 2))` line inside the test to inspect, fix the engine code (not the test), re-run.

---

## Task 2: CSS — view toggle + pivot table rules

Pure styling. Add new rules to the `<style>` block in the HTML head. No JS impact yet.

**Files:**
- Modify: `harmonics_calculator.html` — `<style>` block

- [ ] **Step 1: Append these rules at the end of the `<style>` block, just before `</style>`**

```css
    .view-toggle {
      display: inline-flex; gap: 4px; margin-left: 12px; vertical-align: middle;
    }
    .view-toggle button {
      padding: 2px 10px; font-size: 12px; border-radius: 4px;
    }
    .view-toggle button.active {
      background: var(--accent); color: white; border-color: var(--accent);
    }
    .pivot-scroll {
      overflow-x: auto; border: 1px solid var(--border); border-radius: 6px; max-height: 60vh;
    }
    table.pivot { width: max-content; min-width: 100%; }
    table.pivot th, table.pivot td {
      border-bottom: 1px solid var(--border); padding: 6px 8px;
      vertical-align: top; min-width: 64px;
    }
    table.pivot td:first-child, table.pivot th:first-child {
      font-weight: 500; white-space: nowrap;
      position: sticky; left: 0; background: var(--card); z-index: 1;
    }
    table.pivot th { background: #fafbfc; cursor: default; }
    table.pivot th:first-child { background: #fafbfc; }
    table.pivot .freq {
      display: inline-block; padding: 2px 6px; border-radius: 4px;
      margin: 2px; font-variant-numeric: tabular-nums;
    }
    table.pivot .freq.jrfl { background: var(--row-jrfl); }
    table.pivot .freq.band { background: var(--row-band); }
```

- [ ] **Step 2: Verify in Chrome**

1. Reload `harmonics_calculator.html`.
2. Open DevTools → Elements → click `<style>` and search for `.view-toggle`. Confirm new rules present.
3. Run `window.getComputedStyle(document.body).getPropertyValue('--row-jrfl').trim()` in console — should return `#ffcccc` (proves variable still available).
4. No console errors.

UI is unchanged at this point (no markup uses these classes yet).

---

## Task 3: UI — refactor `renderResults` to extract `renderListTable`

No behavior change. Just move existing logic into a dedicated function. This makes Task 5's dispatch trivial.

**Files:**
- Modify: `harmonics_calculator.html` — `#ui` block

- [ ] **Step 1: Locate the existing `renderResults(result)` function**

It currently runs:
- Clear banner slot
- Append cap banners + warnings
- Set summary text
- Render sortable list table (cols header → th onclick → sort → tbody rows with row-class tints)

- [ ] **Step 2: Rename the existing `function renderResults(result) { … }` to `function renderListTable(result) { … }`**

Use Edit with `old_string` = `function renderResults(result) {` and `new_string` = `function renderListTable(result) {`. This is a single rename, one occurrence.

- [ ] **Step 3: Add the new `renderResults(result)` orchestrator just above `renderListTable`**

```js
    let viewMode = 'pivot';   // 'list' | 'pivot' — UI-local, not persisted

    function renderResults(result) {
      // Common: summary text + banners
      const sum = document.getElementById('results-summary');
      const banner = document.getElementById('cap-banner-slot');

      banner.replaceChildren();
      for (const b of result.capBanners ?? []) {
        banner.append(el('div', { class: 'cap-banner' }, b));
      }
      for (const w of result.warnings ?? []) {
        banner.append(el('div', { class: 'cap-banner' }, w));
      }

      const jrflHits = result.rows.filter(r => r.jrfl).length;
      sum.replaceChildren();
      sum.append(`${result.rows.length} products, ${jrflHits} JRFL hits.`);
      sum.append(renderViewToggle(result));

      if (viewMode === 'pivot') {
        renderPivotTable(result);
      } else {
        renderListTable(result);
      }
    }

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

- [ ] **Step 4: Remove the existing summary-setting line + cap-banner loop from inside `renderListTable`**

The block inside `renderListTable` currently starts with:

```js
    function renderListTable(result) {
      const sum = document.getElementById('results-summary');
      const banner = document.getElementById('cap-banner-slot');
      const tbl = document.getElementById('results-table');
      const thead = tbl.querySelector('thead');
      const tbody = tbl.querySelector('tbody');

      banner.replaceChildren();
      for (const b of result.capBanners ?? []) {
        banner.append(el('div', { class: 'cap-banner' }, b));
      }
      for (const w of result.warnings ?? []) {
        banner.append(el('div', { class: 'cap-banner' }, w));
      }

      const jrflHits = result.rows.filter(r => r.jrfl).length;
      sum.textContent = `${result.rows.length} products, ${jrflHits} JRFL hits.`;

      const cols = [...
```

Remove the `sum` variable plus the lines starting with `banner.replaceChildren();` through `sum.textContent = ...;` (the summary line). Keep the `tbl/thead/tbody` lookups. The function should now start:

```js
    function renderListTable(result) {
      const tbl = document.getElementById('results-table');
      const thead = tbl.querySelector('thead');
      const tbody = tbl.querySelector('tbody');

      const cols = [...
```

This avoids duplicating summary/banner work that `renderResults` now owns.

- [ ] **Step 5: Add a placeholder `renderPivotTable` just below `renderListTable`**

Make it a stub for Task 4 — must not crash if invoked, but doesn't have to render yet:

```js
    function renderPivotTable(result) {
      const tbl = document.getElementById('results-table');
      tbl.querySelector('thead').replaceChildren();
      tbl.querySelector('tbody').replaceChildren();
      // Real implementation in Task 4.
    }
```

- [ ] **Step 6: Verify**

1. Reload Chrome.
2. Run a quick calculation: Harmonics enabled, fundamental = `100`, Calculate.
3. Expected: summary text reads `16 products, 0 JRFL hits.` immediately followed by the toggle `[ List ][ Pivot ]` with `Pivot` active (blue background).
4. Click `List` — table appears with the 16 rows (existing behavior).
5. Click `Pivot` — table area goes empty (stub).
6. No console errors.

---

## Task 4: UI — `renderPivotTable` implementation

Render the Source × Order matrix using `buildPivot` from the engine.

**Files:**
- Modify: `harmonics_calculator.html` — `#ui` block

- [ ] **Step 1: Replace the stub `renderPivotTable` with the real implementation**

Find the placeholder block from Task 3 Step 5 and replace it with:

```js
    function renderPivotTable(result) {
      const tbl = document.getElementById('results-table');
      const thead = tbl.querySelector('thead');
      const tbody = tbl.querySelector('tbody');

      // Apply pivot styling. The existing table uses no extra class; we toggle
      // it by removing/adding 'pivot' on the table element.
      tbl.classList.add('pivot');

      const { sourceLabels, matrix } = window.__engine.buildPivot(result.rows);

      // Header row: Source | Order 1 | Order 2 | ... | Order 16
      thead.replaceChildren();
      const trh = el('tr', {}, el('th', {}, 'Source'));
      for (let o = 1; o <= 16; o++) trh.append(el('th', {}, `Order ${o}`));
      thead.append(trh);

      // Body rows
      tbody.replaceChildren();
      for (const label of sourceLabels) {
        const byOrder = matrix.get(label);
        const tr = el('tr', {}, el('td', {}, label));
        for (let o = 1; o <= 16; o++) {
          const cells = byOrder.get(o);
          const td = el('td');
          if (cells) {
            for (const c of cells) {
              const cls = c.jrfl ? 'freq jrfl' : (c.inBand ? 'freq band' : 'freq');
              td.append(el('span', { class: cls }, c.freq.toFixed(6).replace(/\.?0+$/, '')));
            }
          }
          tr.append(td);
        }
        tbody.append(tr);
      }
    }
```

- [ ] **Step 2: Update `renderListTable` to remove the pivot class before rendering**

The table element is shared between modes. When switching back to List, the `.pivot` class lingers and breaks list styling. Add `tbl.classList.remove('pivot');` as the first DOM mutation inside `renderListTable`. After modification, the function should start:

```js
    function renderListTable(result) {
      const tbl = document.getElementById('results-table');
      tbl.classList.remove('pivot');
      const thead = tbl.querySelector('thead');
      const tbody = tbl.querySelector('tbody');

      const cols = [...
```

- [ ] **Step 3: Wrap the existing `<table id="results-table">` in a pivot-scroll container when in pivot mode**

The existing HTML markup is:

```html
      <div class="results-scroll"><table id="results-table"><thead></thead><tbody></tbody></table></div>
```

The `.results-scroll` container clips horizontal overflow. Pivot needs `.pivot-scroll` instead (which allows horizontal scroll). Rather than swap markup, give the existing container BOTH classes via JS in each renderer.

Inside `renderListTable`, after the `tbl.classList.remove('pivot');` line, add:

```js
      tbl.parentElement.classList.remove('pivot-scroll');
      tbl.parentElement.classList.add('results-scroll');
```

Inside `renderPivotTable`, after the `tbl.classList.add('pivot');` line, add:

```js
      tbl.parentElement.classList.remove('results-scroll');
      tbl.parentElement.classList.add('pivot-scroll');
```

- [ ] **Step 4: Verify (manual UI smoke test)**

1. Reload Chrome.
2. Control: Start = 150, Stop = 350, JRFL = 300. Harmonics enabled, fundamental = `100`. Click Calculate.
3. Pivot view should be active by default. Expected:
   - Single row labeled `Harmonics`.
   - 16 order columns, Order 1 has `100` (no tint, out of bounds), Order 2 has `200` (green tinted), Order 3 has `300` (red tinted), Orders 4..16 have 400..1600 (no tint, above stop).
4. Click `List` toggle. Expected: same 16 rows as the existing list table, with row-level tints.
5. Click `Pivot` again. Expected: pivot returns, no flicker, no console errors.
6. Edge case: click Clear All, confirm. Then click Calculate without any input — summary should say `Enable at least one calculator.`. The view toggle is intentionally NOT shown in this state (the Calculate handler's short-circuit bypasses `renderResults`); table is empty.
7. Edge case: enable SF-IMD with tones `100, 105, 108`, set filter width = `200`, Calculate. Expected pivot view: `Harmonics` row (with H_2..H_16 of each enabled fundamental — if Harmonics is still on from earlier, it'll show those) plus `Single-Freq IMD` row with products listed in their respective order columns.

---

## Task 5: Validation pass

- [ ] **Step 1: Headless verification still green**

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected: `27 passed, 0 failed.`

- [ ] **Step 2: UI smoke test — toggle behavior**

In Chrome, with any non-empty calculation:
- Toggle Pivot → List → Pivot multiple times. Expect no console errors, table updates instantly, summary text stays the same on each toggle.
- The active button (`Pivot` initially) has blue background; inactive button is plain.

- [ ] **Step 3: UI smoke test — JRFL highlighting in pivot cells**

Control: Start = 100, Stop = 600, JRFL = `200`. Harmonics enabled, fundamental = `100`. Calculate.
- Pivot view: `Harmonics` row. Order 1 cell = `100` (no tint — below start). Order 2 cell = `200` (red tinted — JRFL hit). Order 3 cell = `300` (green tinted — in band). Order 4..6 = `400..600` (green tinted). Order 7..16 = `700..1600` (no tint — above stop).
- Switch to List. Verify the same rows have row-level (not span-level) tinting.

- [ ] **Step 4: UI smoke test — empty result state**

Click Clear All. Click Calculate (with nothing enabled). Expected:
- Summary: `Enable at least one calculator.` (view toggle NOT shown — the short-circuit bypasses `renderResults`).
- Table: empty.
- No console errors.

- [ ] **Step 5: UI smoke test — multi-source pivot**

Enable Harmonics with fundamentals = `100` and SF-IMD with tones = `100, 105`. Set filter width = `100`. Calculate. Switch to Pivot view.
- Expect two rows: `Harmonics`, `Single-Freq IMD`.
- `Harmonics` row populated as in earlier test.
- `Single-Freq IMD` row has freqs in Order 2, 3 columns (none above; the IMD enumeration caps at max-order 5 by default).
- Each freq appears as its own pill-shaped span inside the cell.

- [ ] **Step 6: Done**

The pivot feature is complete. Notes:
- View mode is not persisted across reloads (UI-only local var, per spec).
- Pivot CSV export and viewMode persistence are deferred to v2 backlog (see spec).
