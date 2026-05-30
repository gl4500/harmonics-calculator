# Harmonics & IMD HTML Calculator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file Chrome HTML calculator that ports the VBA harmonics + IMD logic from `harmonics_v3.xlsm`, producing a unified sortable product table.

**Architecture:** One `.html` file with four internal, strictly-layered script sections — `engine` (pure math), `state` (scenario object + localStorage), `ui` (DOM + events). Tests are an inline harness callable from DevTools console (`runEngineTests()`). No external libraries, no build step.

**Tech Stack:** HTML5, vanilla ES2022+ modules, CSS Grid, `localStorage`. Chrome only.

**User said: skip git for v1.** No commits. Each task verifies in DevTools or by manual interaction. v2 will add JSON save/load, CSV export, and a "Run tests" UI button.

**Spec:** `docs/superpowers/specs/2026-05-29-harmonics-html-calculator-design.md`

**Deliverable:** `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html` (single file).

---

## File Map

Only one runtime file. Tasks add internal sections to it.

- Create: `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html` — the calculator
  - `<style>` — CSS
  - `<body>` — markup
  - `<script type="module" id="engine">` — pure math
  - `<script type="module" id="state">` — scenario + localStorage (also exposes `runEngineTests` to `window`)
  - `<script type="module" id="ui">` — DOM rendering + event wiring
  - `<script type="module" id="tests">` — golden-vector tests for engine; not auto-run

---

## Task 1: Create file scaffold with layout shell

**Files:**
- Create: `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`

- [ ] **Step 1: Create the file with header, CSS reset, and visible empty layout sections**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Harmonics & IMD Calculator</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root {
      --bg: #f7f8fa;
      --card: #ffffff;
      --border: #d8dde5;
      --text: #1f2430;
      --muted: #6b7280;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --row-jrfl: #ffcccc;
      --row-band: #ccffcc;
      --danger: #b91c1c;
      --shadow: 0 1px 2px rgba(0,0,0,.04), 0 1px 8px rgba(0,0,0,.04);
    }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text);
      font: 14px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    main { max-width: 1100px; margin: 24px auto; padding: 0 16px; display: grid; gap: 16px; }
    header h1 { margin: 0 0 4px; font-size: 20px; }
    header p { margin: 0; color: var(--muted); }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px;
      padding: 16px; box-shadow: var(--shadow); }
    .card h2 { margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: .04em;
      color: var(--muted); display: flex; align-items: center; gap: 8px; }
    .card .enable { margin: 0; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .row + .row { margin-top: 8px; }
    label.field { display: inline-flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--muted); }
    label.field input { width: 110px; }
    input[type="number"], input[type="text"] {
      padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; font: inherit;
      background: white;
    }
    input[type="number"]:focus, input[type="text"]:focus {
      outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent);
    }
    button {
      padding: 6px 12px; border: 1px solid var(--border); background: white; border-radius: 6px;
      cursor: pointer; font: inherit;
    }
    button:hover { background: #f1f5f9; }
    button.primary { background: var(--accent); color: white; border-color: var(--accent); }
    button.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
    button.icon { padding: 2px 8px; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; }
    .chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; background: #eef2f7;
      border-radius: 14px; }
    .chip input { width: 70px; padding: 2px 4px; border: none; background: transparent; text-align: right; }
    .chip button { padding: 0 6px; border: none; background: transparent; color: var(--danger); cursor: pointer; }
    .group-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: end; }
    .group-row + .group-row { margin-top: 8px; }
    .inline-error { color: var(--danger); font-size: 12px; margin-top: 4px; }
    .summary { font-size: 13px; color: var(--muted); margin: 8px 0; }
    .cap-banner { background: #fff7ed; border: 1px solid #fdba74; color: #9a3412;
      padding: 8px 12px; border-radius: 6px; margin-bottom: 8px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--border); }
    th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted);
      cursor: pointer; user-select: none; background: #fafbfc; position: sticky; top: 0; }
    th .arrow { color: var(--text); margin-left: 4px; }
    tr.jrfl td { background: var(--row-jrfl); }
    tr.band td { background: var(--row-band); }
    .results-scroll { max-height: 60vh; overflow: auto; border: 1px solid var(--border); border-radius: 6px; }
    .info { font-size: 12px; color: var(--muted); margin-top: 4px; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Harmonics &amp; IMD Calculator</h1>
      <p>Compute harmonics and IMD products; flag JRFL hits and in-band frequencies.</p>
    </header>

    <section class="card" id="card-control">
      <h2>Control</h2>
      <div id="control-body"><!-- populated by ui --></div>
    </section>

    <section class="card" id="card-harm">
      <h2><label class="enable"><input type="checkbox" id="harm-enable"> Harmonics (H<sub>2</sub>..H<sub>16</sub>)</label></h2>
      <div id="harm-body"><!-- populated by ui --></div>
    </section>

    <section class="card" id="card-sfimd">
      <h2><label class="enable"><input type="checkbox" id="sfimd-enable"> Single-Freq IMD</label></h2>
      <div id="sfimd-body"><!-- populated by ui --></div>
    </section>

    <section class="card" id="card-mtimd">
      <h2><label class="enable"><input type="checkbox" id="mtimd-enable"> Multi-Tone IMD</label></h2>
      <div id="mtimd-body"><!-- populated by ui --></div>
    </section>

    <section class="actions">
      <button id="btn-clear">Clear All</button>
      <button id="btn-calc" class="primary">Calculate</button>
    </section>

    <section class="card" id="card-results">
      <h2>Results</h2>
      <div id="results-summary" class="summary">No calculation run yet.</div>
      <div id="cap-banner-slot"></div>
      <div class="results-scroll"><table id="results-table"><thead></thead><tbody></tbody></table></div>
    </section>
  </main>

  <script type="module" id="engine">
    // ── ENGINE ── pure math, no DOM, no globals. Populated in Task 2+.
    export const ENGINE_READY = true;
  </script>

  <script type="module" id="state">
    // ── STATE ── scenario + localStorage. Populated in Task 5.
  </script>

  <script type="module" id="ui">
    // ── UI ── DOM rendering + event wiring. Populated in Task 6+.
  </script>

  <script type="module" id="tests">
    // ── TESTS ── engine golden vectors. Populated in Task 2+. Callable as window.runEngineTests().
  </script>
</body>
</html>
```

- [ ] **Step 2: Open in Chrome and verify the empty layout**

Open `harmonics_calculator.html` by double-clicking it (or `file:///C:/Users/gl450/Harmonics%20Calculator/harmonics_calculator.html`).

Expected:
- Header "Harmonics & IMD Calculator" visible.
- Four empty cards (Control, Harmonics, Single-Freq IMD, Multi-Tone IMD) visible with their `<h2>` titles.
- Clear All / Calculate buttons visible (non-functional).
- Empty Results card with "No calculation run yet."
- DevTools console: zero errors.

If the page is blank or shows errors, fix typos before moving on.

---

## Task 2: Engine — test harness + harmonics()

Build the inline test harness FIRST, then TDD the simplest engine function (harmonics) against it. From this point on, every engine function is added test-first.

**Files:**
- Modify: `harmonics_calculator.html` — `#engine` and `#tests` script blocks

- [ ] **Step 1: Replace the engine `<script>` block — define module exports and test-harness primitives**

Find the line `// ── ENGINE ── pure math, no DOM, no globals. Populated in Task 2+.` and replace the whole `<script type="module" id="engine">…</script>` block with:

```html
  <script type="module" id="engine">
    // ── ENGINE ── pure math. No DOM, no globals beyond exports.

    export const ENGINE_VERSION = 'v1';
    export const MAX_ORDER_HARD_CAP = 9;
    export const PER_ROW_PRODUCT_CAP = 16000;
    export const AUTO_WIDTH_K = 2.5;
    export const JRFL_TOL_MHZ = 0.001;        // 1 kHz
    export const HEAVY_COMPUTE_THRESHOLD = 5_000_000;

    // harmonics(fundMHz, maxH=16) → [2·F, 3·F, …, maxH·F]
    // Throws on non-finite fund. Returns [] if maxH < 2.
    export function harmonics(fundMHz, maxH = 16) {
      if (!Number.isFinite(fundMHz)) throw new Error('harmonics: fundMHz must be finite');
      if (!Number.isFinite(maxH) || maxH < 2) return [];
      const out = [];
      for (let k = 2; k <= maxH; k++) out.push(fundMHz * k);
      return out;
    }

    // Exposed so tests module can import.
    window.__engine = { harmonics, MAX_ORDER_HARD_CAP, PER_ROW_PRODUCT_CAP, AUTO_WIDTH_K,
                        JRFL_TOL_MHZ, HEAVY_COMPUTE_THRESHOLD };
  </script>
```

- [ ] **Step 2: Replace the tests `<script>` block — install test harness + first golden vector**

Find `// ── TESTS ── engine golden vectors. Populated in Task 2+.` and replace the whole `<script type="module" id="tests">…</script>` block with:

```html
  <script type="module" id="tests">
    // ── TESTS ── golden vectors. Run with: runEngineTests() in DevTools console.

    const tests = [];

    function test(name, fn) { tests.push({ name, fn }); }

    function assertEqual(actual, expected, msg = '') {
      if (actual !== expected) throw new Error(`${msg} expected ${expected}, got ${actual}`);
    }
    function assertArrayClose(actual, expected, tol = 1e-9, msg = '') {
      if (!Array.isArray(actual)) throw new Error(`${msg} not an array: ${actual}`);
      if (actual.length !== expected.length) throw new Error(
        `${msg} length expected ${expected.length}, got ${actual.length}`);
      for (let i = 0; i < expected.length; i++) {
        if (Math.abs(actual[i] - expected[i]) > tol) throw new Error(
          `${msg} [${i}] expected ${expected[i]}, got ${actual[i]}`);
      }
    }

    function runEngineTests() {
      let passed = 0, failed = 0;
      console.group(`Engine tests (${tests.length})`);
      for (const t of tests) {
        try { t.fn(); console.log('PASS', t.name); passed++; }
        catch (e) { console.error('FAIL', t.name, '—', e.message); failed++; }
      }
      console.groupEnd();
      console.log(`%c${passed} passed, ${failed} failed`,
        failed === 0 ? 'color:green' : 'color:red');
      return { passed, failed };
    }
    window.runEngineTests = runEngineTests;

    // ── harmonics() ──────────────────────────────────────────────────
    const { harmonics } = window.__engine;

    test('harmonics(100, 16) yields 200..1600 in steps of 100', () => {
      const expected = [];
      for (let k = 2; k <= 16; k++) expected.push(100 * k);
      assertArrayClose(harmonics(100, 16), expected);
    });

    test('harmonics(100, 4) returns 200, 300, 400', () => {
      assertArrayClose(harmonics(100, 4), [200, 300, 400]);
    });

    test('harmonics(0, 4) returns [0, 0, 0]', () => {
      assertArrayClose(harmonics(0, 4), [0, 0, 0]);
    });

    test('harmonics(F, 1) returns []', () => {
      assertEqual(harmonics(123.456, 1).length, 0);
    });

    test('harmonics(NaN) throws', () => {
      let threw = false;
      try { harmonics(NaN); } catch { threw = true; }
      assertEqual(threw, true);
    });

    console.info('Tests installed. Run window.runEngineTests().');
  </script>
```

- [ ] **Step 3: Verify tests pass**

1. Reload the page in Chrome (Ctrl+F5).
2. Open DevTools (F12) → Console.
3. Type `runEngineTests()` and hit Enter.

Expected output: `Engine tests (5)` group with 5 `PASS` lines, then `5 passed, 0 failed` in green.

If any test fails, fix the engine code (not the test) and reload.

---

## Task 3: Engine — classify()

Coloring rule classifier. Red beats green. Bounds may be swapped if `stopF < startF`.

**Files:**
- Modify: `harmonics_calculator.html` — engine block (add function), tests block (add tests)

- [ ] **Step 1: Add classify() to the engine block, just above the `window.__engine = {…}` line**

```js
    // classify(freq, ctl) → 'jrfl' | 'inBand' | 'none'
    // Matches VBA: JRFL within 1 kHz wins over bounds.
    // If both startF and stopF are finite, swap if stopF < startF.
    export function classify(freqMHz, ctl) {
      if (!Number.isFinite(freqMHz)) return 'none';
      const { startF, stopF, jrfl } = ctl;
      if (Array.isArray(jrfl)) {
        for (let i = 0; i < jrfl.length; i++) {
          if (Math.abs(freqMHz - jrfl[i]) <= JRFL_TOL_MHZ) return 'jrfl';
        }
      }
      if (Number.isFinite(startF) && Number.isFinite(stopF)) {
        let lo = startF, hi = stopF;
        if (hi < lo) { const t = lo; lo = hi; hi = t; }
        if (freqMHz >= lo && freqMHz <= hi) return 'inBand';
      }
      return 'none';
    }
```

- [ ] **Step 2: Add `classify` to the exposed `window.__engine` object**

```js
    window.__engine = { harmonics, classify, MAX_ORDER_HARD_CAP, PER_ROW_PRODUCT_CAP,
                        AUTO_WIDTH_K, JRFL_TOL_MHZ, HEAVY_COMPUTE_THRESHOLD };
```

- [ ] **Step 3: Add tests for classify() to the tests block**

Add at the bottom of the tests module (before `console.info(…)`):

```js
    // ── classify() ──────────────────────────────────────────────────
    const { classify } = window.__engine;

    test('classify: JRFL exact match → jrfl', () => {
      assertEqual(classify(225.0, { startF: 100, stopF: 300, jrfl: [225.0] }), 'jrfl');
    });
    test('classify: JRFL within 1 kHz → jrfl', () => {
      assertEqual(classify(225.0009, { startF: 100, stopF: 300, jrfl: [225.0] }), 'jrfl');
    });
    test('classify: JRFL beyond 1 kHz → not jrfl', () => {
      assertEqual(classify(225.0011, { startF: 100, stopF: 300, jrfl: [225.0] }), 'inBand');
    });
    test('classify: in-band, no JRFL → inBand', () => {
      assertEqual(classify(200, { startF: 100, stopF: 300, jrfl: [] }), 'inBand');
    });
    test('classify: bounds swapped → still inBand', () => {
      assertEqual(classify(200, { startF: 300, stopF: 100, jrfl: [] }), 'inBand');
    });
    test('classify: out of band, no JRFL → none', () => {
      assertEqual(classify(50, { startF: 100, stopF: 300, jrfl: [] }), 'none');
    });
    test('classify: missing bounds → none', () => {
      assertEqual(classify(200, { startF: null, stopF: null, jrfl: [] }), 'none');
    });
    test('classify: JRFL beats in-band (red wins)', () => {
      assertEqual(classify(200, { startF: 100, stopF: 300, jrfl: [200] }), 'jrfl');
    });
```

- [ ] **Step 4: Verify all tests pass**

Reload Chrome, run `runEngineTests()` in console.

Expected: 13 total (5 harmonics + 8 classify), all PASS.

---

## Task 4: Engine — enumerateIMD()

Port of VBA `EnumerateTuples` + `EvaluateAndStore`. Recursive integer-coefficient enumeration, sign canonicalization, in-band filter, 1 kHz dedup.

**Files:**
- Modify: `harmonics_calculator.html` — engine + tests

- [ ] **Step 1: Add enumerateIMD() to the engine block**

Insert just above the `window.__engine = {…}` line:

```js
    // enumerateIMD(tones, opts)
    //   tones: number[] of frequencies (MHz, ≥0)
    //   opts: { maxOrder, fLo, fHi, allowSingleTone, productCap = PER_ROW_PRODUCT_CAP }
    // Returns: { products: [{ freq, order }], hitCap, rawCount }
    //   products: sorted ascending by freq, deduped at 1 kHz key; each product
    //     records the smallest order at which it was first discovered.
    //   hitCap: true if PER_ROW_PRODUCT_CAP exceeded mid-enumeration.
    //   rawCount: total coefficient tuples evaluated (diagnostic).
    //
    // Algorithm mirrors VBA EnumerateTuples + EvaluateAndStore:
    //   - For each total order K in [2..maxOrder]:
    //     enumerate every (k_1..k_N) with Σ|k_i| = K, k_i ∈ ℤ.
    //   - Sign canonicalization: first nonzero coefficient must be positive
    //     (drops the ± freq mirror, matches VBA).
    //   - Filter: keep |Σ k_i·f_i| ∈ [fLo, fHi].
    //   - Dedup key: Math.round(absFreq * 1000) (1 kHz precision).
    //   - allowSingleTone=true: require nz ≥ 1 (pure single-tone harmonics allowed).
    //     allowSingleTone=false: require nz ≥ 2 (Single_Freq_Harm handles harmonics).
    export function enumerateIMD(tones, opts) {
      const { maxOrder, fLo, fHi, allowSingleTone } = opts;
      const productCap = opts.productCap ?? PER_ROW_PRODUCT_CAP;
      const N = tones.length;
      if (!Number.isFinite(maxOrder) || maxOrder < 2 || N === 0) {
        return { products: [], hitCap: false, rawCount: 0 };
      }
      const seen = new Map();      // dictKey → order
      let rawCount = 0;
      let hitCap = false;

      const coeffs = new Int32Array(N);
      const minNz = allowSingleTone ? 1 : 2;

      function evaluateAndStore(currentOrder) {
        rawCount++;
        let nz = 0;
        for (let i = 0; i < N; i++) if (coeffs[i] !== 0) nz++;
        if (nz < minNz) return;
        // sign canonicalization: first nonzero must be positive
        for (let i = 0; i < N; i++) {
          if (coeffs[i] !== 0) {
            if (coeffs[i] < 0) return;
            break;
          }
        }
        let freq = 0;
        for (let i = 0; i < N; i++) if (coeffs[i] !== 0) freq += coeffs[i] * tones[i];
        const absFreq = Math.abs(freq);
        if (absFreq === 0) return;
        if (absFreq < fLo || absFreq > fHi) return;
        const key = Math.round(absFreq * 1000);
        if (seen.has(key)) return;
        if (seen.size >= productCap) { hitCap = true; return; }
        seen.set(key, { freq: absFreq, order: currentOrder });
      }

      // Recursive tuple enumeration. idx in [0..N], remaining = magnitudes left to distribute.
      function recurse(idx, remaining, currentOrder) {
        if (hitCap) return;
        if (idx === N) {
          if (remaining === 0) evaluateAndStore(currentOrder);
          return;
        }
        if (idx === N - 1) {
          const mag = remaining;
          if (mag === 0) {
            coeffs[idx] = 0;
            recurse(idx + 1, 0, currentOrder);
          } else {
            for (const sn of [-1, 1]) {
              coeffs[idx] = sn * mag;
              recurse(idx + 1, 0, currentOrder);
              if (hitCap) return;
            }
          }
          return;
        }
        for (let mag = 0; mag <= remaining; mag++) {
          if (mag === 0) {
            coeffs[idx] = 0;
            recurse(idx + 1, remaining, currentOrder);
          } else {
            for (const sn of [-1, 1]) {
              coeffs[idx] = sn * mag;
              recurse(idx + 1, remaining - mag, currentOrder);
              if (hitCap) return;
            }
          }
          if (hitCap) return;
        }
      }

      for (let K = 2; K <= maxOrder; K++) {
        coeffs.fill(0);
        recurse(0, K, K);
        if (hitCap) break;
      }

      const products = Array.from(seen.values()).sort((a, b) => a.freq - b.freq);
      return { products, hitCap, rawCount };
    }
```

- [ ] **Step 2: Add `enumerateIMD` to the `window.__engine` exposure**

```js
    window.__engine = { harmonics, classify, enumerateIMD, MAX_ORDER_HARD_CAP,
                        PER_ROW_PRODUCT_CAP, AUTO_WIDTH_K, JRFL_TOL_MHZ,
                        HEAVY_COMPUTE_THRESHOLD };
```

- [ ] **Step 3: Add golden-vector tests for enumerateIMD()**

Append to the tests block (before `console.info(…)`):

```js
    // ── enumerateIMD() ───────────────────────────────────────────────
    const { enumerateIMD } = window.__engine;

    function freqsOf(result) { return result.products.map(p => p.freq); }

    test('IMD 2-tone (100, 110), order=3, wide filter', () => {
      const r = enumerateIMD([100, 110],
        { maxOrder: 3, fLo: 0, fHi: 1000, allowSingleTone: false });
      const f = freqsOf(r);
      // Expected products with nz≥2 within [0,1000]:
      //   order 2: f2-f1=10, f1+f2=210
      //   order 3: 2f1-f2=90, 2f2-f1=120, 2f1+f2=310, f1+2f2=320
      // sorted ascending: 10, 90, 120, 210, 310, 320
      assertArrayClose(f, [10, 90, 120, 210, 310, 320], 1e-9, '2-tone order 3');
    });

    test('IMD allowSingleTone=true includes 2·F and 3·F', () => {
      const r = enumerateIMD([100],
        { maxOrder: 3, fLo: 0, fHi: 1000, allowSingleTone: true });
      assertArrayClose(freqsOf(r), [200, 300], 1e-9, 'single tone harmonics included');
    });

    test('IMD allowSingleTone=false excludes pure harmonics', () => {
      const r = enumerateIMD([100],
        { maxOrder: 3, fLo: 0, fHi: 1000, allowSingleTone: false });
      assertEqual(r.products.length, 0);
    });

    test('IMD filter window excludes out-of-band products', () => {
      const r = enumerateIMD([100, 110],
        { maxOrder: 3, fLo: 100, fHi: 200, allowSingleTone: false });
      // Of {90, 120, 210, 310, 320}, only 120 is in [100, 200].
      assertArrayClose(freqsOf(r), [120], 1e-9);
    });

    test('IMD dedup: same freq from different tuples appears once', () => {
      // tones=[100,200]: f1+f2 = 300, 3*f1 = 300, 2*f1+0*f2 = 200, etc.
      // With allowSingleTone=true and maxOrder=3, 300 can come from f1+f2 (order 2)
      // and 3*f1 (order 3). Dedup keeps one entry; order should be the smaller (2).
      const r = enumerateIMD([100, 200],
        { maxOrder: 3, fLo: 250, fHi: 350, allowSingleTone: true });
      // products in [250,350]: 300
      assertArrayClose(freqsOf(r), [300]);
      assertEqual(r.products[0].order, 2);
    });

    test('IMD productCap is honored', () => {
      const r = enumerateIMD([100, 110, 120, 130, 140],
        { maxOrder: 7, fLo: 0, fHi: 100000, allowSingleTone: true, productCap: 5 });
      assertEqual(r.hitCap, true);
    });

    test('IMD maxOrder<2 returns no products', () => {
      const r = enumerateIMD([100, 110],
        { maxOrder: 1, fLo: 0, fHi: 1000, allowSingleTone: false });
      assertEqual(r.products.length, 0);
    });
```

- [ ] **Step 4: Verify**

Reload, `runEngineTests()`. Expected: 20 passed, 0 failed (5 harmonics + 8 classify + 7 enumerateIMD).

If any IMD test fails, debug by inspecting `r.products` in the console with the failing input. Common causes: off-by-one in sign canonicalization, dedup key collision, or wrong nz threshold.

---

## Task 5: State — scenario object + localStorage autosave

**Files:**
- Modify: `harmonics_calculator.html` — `#state` script block

- [ ] **Step 1: Replace the state `<script>` block**

```html
  <script type="module" id="state">
    // ── STATE ── scenario object + localStorage autosave. No DOM.

    const LS_KEY = 'harmonics_calc_v1';

    export function newScenario() {
      return {
        control: {
          startF: null, stopF: null,
          maxOrder: 5,
          filterWidth: null,
          jrfl: []
        },
        harmonics:  { enabled: true,  fundamentals: [] },
        sfImd:      { enabled: false, tones: [] },
        mtImd:      { enabled: false, groups: [] }
      };
    }

    export function loadScenario() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return newScenario();
        const parsed = JSON.parse(raw);
        // shallow merge against defaults — protects against missing sub-objects
        const def = newScenario();
        return {
          control:   { ...def.control,   ...(parsed.control   ?? {}) },
          harmonics: { ...def.harmonics, ...(parsed.harmonics ?? {}) },
          sfImd:     { ...def.sfImd,     ...(parsed.sfImd     ?? {}) },
          mtImd:     { ...def.mtImd,     ...(parsed.mtImd     ?? {}) }
        };
      } catch (e) {
        console.warn('loadScenario: bad JSON in localStorage, using defaults', e);
        return newScenario();
      }
    }

    let saveTimer = null;
    export function scheduleSave(scenario) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(scenario)); }
        catch (e) { console.warn('scheduleSave: localStorage write failed', e); }
      }, 250);
    }

    // expose for UI
    window.__state = { newScenario, loadScenario, scheduleSave, LS_KEY };
  </script>
```

- [ ] **Step 2: Verify in DevTools**

Reload. In console:

```js
const s = window.__state.newScenario();
s.control.maxOrder; // → 5
window.__state.scheduleSave(s);
setTimeout(() => console.log(localStorage.getItem('harmonics_calc_v1')), 300);
// → should log the JSON string of s
```

If the timeout output is a JSON string starting with `{"control":…}`, state is working.

Cleanup: `localStorage.removeItem('harmonics_calc_v1')` to clear before UI work.

---

## Task 6: UI — Control card render + wiring

Renders Start/Stop bounds, Max Order, Filter Width inputs, and JRFL chip list. All edits update `state.scenario.control` and trigger autosave.

**Files:**
- Modify: `harmonics_calculator.html` — `#ui` script block

- [ ] **Step 1: Replace the `<script type="module" id="ui">` block with the UI skeleton + Control card render**

```html
  <script type="module" id="ui">
    // ── UI ── DOM rendering + event wiring.

    const { newScenario, loadScenario, scheduleSave } = window.__state;

    const state = { scenario: loadScenario() };

    function num(v) {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }

    function el(tag, attrs = {}, ...kids) {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') e.className = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v);
      }
      for (const kid of kids.flat()) {
        if (kid == null || kid === false) continue;
        e.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
      }
      return e;
    }

    function save() { scheduleSave(state.scenario); }

    // ── Control card ─────────────────────────────────────────────────
    function renderControl() {
      const c = state.scenario.control;
      const body = document.getElementById('control-body');
      body.replaceChildren();

      const row1 = el('div', { class: 'row' },
        el('label', { class: 'field' }, 'Start (MHz)',
          el('input', {
            type: 'number', step: 'any', value: c.startF ?? '',
            oninput: (e) => { c.startF = num(e.target.value); save(); }
          })),
        el('label', { class: 'field' }, 'Stop (MHz)',
          el('input', {
            type: 'number', step: 'any', value: c.stopF ?? '',
            oninput: (e) => { c.stopF = num(e.target.value); save(); }
          })),
        el('label', { class: 'field' }, 'Max order (2–9)',
          el('input', {
            type: 'number', step: '1', min: '2', max: '9', value: c.maxOrder,
            oninput: (e) => { c.maxOrder = num(e.target.value) ?? 5; save(); }
          })),
        el('label', { class: 'field' }, 'Filter width (MHz, full BW)',
          el('input', {
            type: 'number', step: 'any', value: c.filterWidth ?? '',
            oninput: (e) => { c.filterWidth = num(e.target.value); save(); }
          })),
      );
      body.append(row1);

      const jrflLabel = el('div', { class: 'info' }, 'JRFL frequencies (MHz, ±1 kHz match)');
      const chipList = el('div', { class: 'chip-list' });
      function rerenderChips() {
        chipList.replaceChildren();
        c.jrfl.forEach((v, i) => {
          chipList.append(el('span', { class: 'chip' },
            el('input', {
              type: 'number', step: 'any', value: v,
              oninput: (e) => { c.jrfl[i] = num(e.target.value); save(); }
            }),
            el('button', { class: 'icon', title: 'Remove',
              onclick: () => { c.jrfl.splice(i, 1); rerenderChips(); save(); } }, '×')
          ));
        });
        chipList.append(el('button', {
          class: 'icon', title: 'Add JRFL freq',
          onclick: () => { c.jrfl.push(0); rerenderChips(); save(); }
        }, '+'));
      }
      rerenderChips();
      body.append(el('div', { class: 'row' }, jrflLabel));
      body.append(el('div', { class: 'row' }, chipList));
    }

    renderControl();

    // expose for other UI tasks
    window.__ui = { state, el, num, save, renderControl };
  </script>
```

- [ ] **Step 2: Verify in Chrome**

Reload. Expected:
- Control card now shows Start, Stop, Max order, Filter width inputs.
- Below them, a JRFL chip area with just a `+` button.
- Click `+`: a chip with a `0`-valued input appears and a new `+` follows.
- Type in any input: open Application tab in DevTools → Local Storage → file://. After ~300 ms you should see `harmonics_calc_v1` populated with the JSON.
- Reload the page: your values persist.

Manual sanity check, no test runner.

---

## Task 7: UI — Harmonics card render + wiring

**Files:**
- Modify: `harmonics_calculator.html` — `#ui` block (append below Control)

- [ ] **Step 1: Append harmonics card renderer to the UI block**

Insert before the `window.__ui = {…}` line:

```js
    // ── Harmonics card ───────────────────────────────────────────────
    function renderHarm() {
      const h = state.scenario.harmonics;
      const enableBox = document.getElementById('harm-enable');
      enableBox.checked = h.enabled;
      enableBox.onchange = () => { h.enabled = enableBox.checked; save(); };

      const body = document.getElementById('harm-body');
      body.replaceChildren();
      body.append(el('div', { class: 'info' }, 'Each fundamental F yields H₂..H₁₆ = 2F..16F (max order from Control caps harmonics).'));

      const list = el('div', { class: 'chip-list' });
      function rerender() {
        list.replaceChildren();
        h.fundamentals.forEach((v, i) => {
          list.append(el('span', { class: 'chip' },
            el('input', {
              type: 'number', step: 'any', value: v,
              oninput: (e) => { h.fundamentals[i] = num(e.target.value); save(); }
            }),
            el('button', { class: 'icon', title: 'Remove',
              onclick: () => { h.fundamentals.splice(i, 1); rerender(); save(); } }, '×')
          ));
        });
        list.append(el('button', {
          class: 'icon', title: 'Add fundamental',
          onclick: () => { h.fundamentals.push(100); rerender(); save(); }
        }, '+'));
      }
      rerender();
      body.append(el('div', { class: 'row' }, list));
    }

    renderHarm();
```

- [ ] **Step 2: Verify**

Reload. Expected:
- "Harmonics" card heading has a checkbox; preset to checked.
- Card shows the info text and a `+` button (chip list starts empty).
- Clicking `+` adds a `100`-valued chip; the chip's `×` removes it.
- Toggling the enable checkbox persists to localStorage.

---

## Task 8: UI — Single-Freq IMD card render + wiring

**Files:**
- Modify: `harmonics_calculator.html` — `#ui` block

- [ ] **Step 1: Append SF-IMD card renderer**

Insert before the `window.__ui = {…}` line:

```js
    // ── SF-IMD card ──────────────────────────────────────────────────
    function renderSfImd() {
      const s = state.scenario.sfImd;
      const enableBox = document.getElementById('sfimd-enable');
      enableBox.checked = s.enabled;
      enableBox.onchange = () => { s.enabled = enableBox.checked; save(); };

      const body = document.getElementById('sfimd-body');
      body.replaceChildren();
      body.append(el('div', { class: 'info' },
        'List of N independent tones. Window = midpoint(min,max) ± filterWidth/2. ' +
        'Single-tone harmonics ARE included (matches Single_Freq_IMD in spreadsheet).'));

      const list = el('div', { class: 'chip-list' });
      function rerender() {
        list.replaceChildren();
        s.tones.forEach((v, i) => {
          list.append(el('span', { class: 'chip' },
            el('input', {
              type: 'number', step: 'any', value: v,
              oninput: (e) => { s.tones[i] = num(e.target.value); save(); }
            }),
            el('button', { class: 'icon', title: 'Remove',
              onclick: () => { s.tones.splice(i, 1); rerender(); save(); } }, '×')
          ));
        });
        list.append(el('button', {
          class: 'icon', title: 'Add tone',
          onclick: () => { s.tones.push(100); rerender(); save(); }
        }, '+'));
      }
      rerender();
      body.append(el('div', { class: 'row' }, list));
    }

    renderSfImd();
```

- [ ] **Step 2: Verify**

Reload. Expected:
- SF-IMD card has checkbox (unchecked by default), info text, `+` button.
- Add/remove chips work the same as Harmonics.

---

## Task 9: UI — Multi-Tone IMD card render + wiring

Per-row groups: Fc, N, Δf. Per-row inline error for invalid N or Δf shown but does not block other rows.

**Files:**
- Modify: `harmonics_calculator.html` — `#ui` block

- [ ] **Step 1: Append MT-IMD card renderer**

Insert before `window.__ui = {…}`:

```js
    // ── MT-IMD card ──────────────────────────────────────────────────
    function renderMtImd() {
      const m = state.scenario.mtImd;
      const enableBox = document.getElementById('mtimd-enable');
      enableBox.checked = m.enabled;
      enableBox.onchange = () => { m.enabled = enableBox.checked; save(); };

      const body = document.getElementById('mtimd-body');
      body.replaceChildren();
      body.append(el('div', { class: 'info' },
        'Each row: Fc + N uniformly-spaced tones at Δf. Window = Fc ± filterWidth/2. ' +
        'Pure single-tone harmonics are NOT reported (matches MT_IMD_Calc in spreadsheet).'));

      const list = el('div', {});
      function groupError(g) {
        if (!Number.isFinite(g.n) || g.n < 2) return 'N must be ≥ 2';
        if (!Number.isFinite(g.df) || g.df <= 0) return 'Δf must be > 0';
        if (!Number.isFinite(g.fc)) return 'Fc must be a number';
        return null;
      }
      function rerender() {
        list.replaceChildren();
        m.groups.forEach((g, i) => {
          const err = groupError(g);
          const row = el('div', { class: 'group-row' },
            el('label', { class: 'field' }, 'Fc (MHz)',
              el('input', {
                type: 'number', step: 'any', value: g.fc,
                oninput: (e) => { g.fc = num(e.target.value); rerender(); save(); }
              })),
            el('label', { class: 'field' }, 'N',
              el('input', {
                type: 'number', step: '1', min: '2', value: g.n,
                oninput: (e) => { g.n = num(e.target.value); rerender(); save(); }
              })),
            el('label', { class: 'field' }, 'Δf (MHz)',
              el('input', {
                type: 'number', step: 'any', value: g.df,
                oninput: (e) => { g.df = num(e.target.value); rerender(); save(); }
              })),
            el('button', {
              class: 'icon', title: 'Remove row',
              onclick: () => { m.groups.splice(i, 1); rerender(); save(); }
            }, '×')
          );
          list.append(row);
          if (err) list.append(el('div', { class: 'inline-error' }, err));
        });
        list.append(el('div', { class: 'row' },
          el('button', {
            onclick: () => { m.groups.push({ fc: 1000, n: 3, df: 10 }); rerender(); save(); }
          }, '+ Add group')));
      }
      rerender();
      body.append(list);
    }

    renderMtImd();
```

- [ ] **Step 2: Verify**

Reload. Expected:
- MT-IMD card has checkbox, info text, "+ Add group" button.
- Add group → row appears with Fc=1000, N=3, Δf=10. No error shown.
- Change N to 1 → red "N must be ≥ 2" appears below the row.
- Change Δf to 0 → red "Δf must be > 0" appears.
- × on the row removes it.

---

## Task 10: Engine helper — calculate() (pure assembly of all sections)

Before wiring the Calculate button, write the pure function that takes a scenario and returns the product list. Easier to TDD than the DOM handler.

**Files:**
- Modify: `harmonics_calculator.html` — engine + tests

- [ ] **Step 1: Add calculate() to the engine block**

Insert before the `window.__engine = {…}` line:

```js
    // calculate(scenario) → {
    //   rows: [{ freq, source, order, jrfl, inBand }],   // sorted ascending by freq
    //   warnings: string[],
    //   sectionsRun: { harmonics, sfImd, mtImd },        // counts pre-merge
    //   estimatedCombos: number,
    //   capBanners: string[]                              // sections that hit productCap
    // }
    export function calculate(scenario) {
      const warnings = [];
      const capBanners = [];
      const rows = [];
      const sectionsRun = { harmonics: 0, sfImd: 0, mtImd: 0 };
      let estimatedCombos = 0;

      const c = scenario.control;
      let maxOrder = Number.isFinite(c.maxOrder) ? Math.trunc(c.maxOrder) : 5;
      if (maxOrder < 2) maxOrder = 2;
      if (maxOrder > MAX_ORDER_HARD_CAP) {
        warnings.push(`Max order capped at ${MAX_ORDER_HARD_CAP}.`);
        maxOrder = MAX_ORDER_HARD_CAP;
      }
      const ctl = {
        startF: Number.isFinite(c.startF) ? c.startF : null,
        stopF:  Number.isFinite(c.stopF)  ? c.stopF  : null,
        jrfl: (c.jrfl ?? []).filter(Number.isFinite)
      };

      // ── Harmonics ────────────────────────────────────────────────
      // Harmonics ALWAYS emit H_2..H_16 regardless of maxOrder (maxOrder
      // governs IMD enumeration only — per spec).
      if (scenario.harmonics?.enabled) {
        const funds = (scenario.harmonics.fundamentals ?? []).filter(Number.isFinite);
        for (const F of funds) {
          rows.push({ freq: F, source: 'Fundamental', order: 1 });
          const hs = harmonics(F, 16);
          for (let k = 0; k < hs.length; k++) {
            rows.push({ freq: hs[k], source: `H_${k + 2}`, order: k + 2 });
          }
        }
        sectionsRun.harmonics = funds.length;
      }

      // ── Single-Freq IMD ──────────────────────────────────────────
      if (scenario.sfImd?.enabled) {
        const tones = (scenario.sfImd.tones ?? []).filter(Number.isFinite);
        if (tones.length === 0) {
          warnings.push('SF-IMD enabled but no numeric tones.');
        } else if (!Number.isFinite(c.filterWidth)) {
          warnings.push('SF-IMD enabled but filter width missing.');
        } else {
          const fw = Math.abs(c.filterWidth);
          const minF = Math.min(...tones), maxF = Math.max(...tones);
          const center = (minF + maxF) / 2;
          const fLo = Math.max(0, center - fw / 2);
          const fHi = center + fw / 2;
          estimatedCombos += Math.pow(2 * tones.length + 1, maxOrder);
          const r = enumerateIMD(tones, { maxOrder, fLo, fHi, allowSingleTone: true });
          for (const p of r.products) rows.push({ freq: p.freq, source: 'SF-IMD', order: p.order });
          if (r.hitCap) capBanners.push(`SF-IMD hit ${PER_ROW_PRODUCT_CAP}-product cap; tighten filter or lower max order.`);
          sectionsRun.sfImd = tones.length;
        }
      }

      // ── Multi-Tone IMD ───────────────────────────────────────────
      if (scenario.mtImd?.enabled) {
        const groups = scenario.mtImd.groups ?? [];
        if (!Number.isFinite(c.filterWidth)) {
          warnings.push('MT-IMD enabled but filter width missing.');
        } else {
          const fw = Math.abs(c.filterWidth);
          for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            if (!Number.isFinite(g.fc) || !Number.isFinite(g.n) || g.n < 2
                || !Number.isFinite(g.df) || g.df <= 0) continue;
            const N = Math.trunc(g.n);
            const tones = [];
            for (let i = 1; i <= N; i++) {
              tones.push(g.fc + (i - (N + 1) / 2) * g.df);
            }
            const fLo = Math.max(0, g.fc - fw / 2);
            const fHi = g.fc + fw / 2;
            estimatedCombos += Math.pow(2 * N + 1, maxOrder);
            const r = enumerateIMD(tones, { maxOrder, fLo, fHi, allowSingleTone: false });
            for (const p of r.products) rows.push({ freq: p.freq, source: `MT-IMD #${gi + 1}`, order: p.order });
            if (r.hitCap) capBanners.push(`MT-IMD row ${gi + 1} hit ${PER_ROW_PRODUCT_CAP}-product cap.`);
            sectionsRun.mtImd++;
          }
        }
      }

      // dedup identical (freq-1kHz, source, order) tuples
      const dedupKey = (r) => `${Math.round(r.freq * 1000)}|${r.source}|${r.order}`;
      const seen = new Set();
      const deduped = [];
      for (const r of rows) {
        const k = dedupKey(r);
        if (seen.has(k)) continue;
        seen.add(k); deduped.push(r);
      }
      deduped.sort((a, b) => a.freq - b.freq);

      // annotate with classify
      for (const r of deduped) {
        const cls = classify(r.freq, ctl);
        r.jrfl = cls === 'jrfl';
        r.inBand = cls === 'inBand';
      }

      return { rows: deduped, warnings, sectionsRun, estimatedCombos, capBanners };
    }
```

- [ ] **Step 2: Expose calculate() to window.__engine**

```js
    window.__engine = { harmonics, classify, enumerateIMD, calculate,
                        MAX_ORDER_HARD_CAP, PER_ROW_PRODUCT_CAP, AUTO_WIDTH_K,
                        JRFL_TOL_MHZ, HEAVY_COMPUTE_THRESHOLD };
```

- [ ] **Step 3: Add golden-vector tests for calculate()**

Append to tests block (before `console.info(…)`):

```js
    // ── calculate() ──────────────────────────────────────────────────
    const { calculate, newScenario } = (() => {
      const e = window.__engine; const s = window.__state;
      return { calculate: e.calculate, newScenario: s.newScenario };
    })();

    test('calculate: harmonics-only of 100 → Fundamental + H_2..H_16 regardless of maxOrder', () => {
      const sc = newScenario();
      sc.control.maxOrder = 3;          // harmonics ignore maxOrder
      sc.harmonics = { enabled: true, fundamentals: [100] };
      sc.sfImd.enabled = false; sc.mtImd.enabled = false;
      const r = calculate(sc);
      // 1 Fundamental + 15 harmonics (H_2..H_16) = 16 rows, sorted ascending.
      const expected = [100];
      for (let k = 2; k <= 16; k++) expected.push(100 * k);
      assertArrayClose(r.rows.map(x => x.freq), expected);
      assertEqual(r.rows[0].source, 'Fundamental');
      assertEqual(r.rows[1].source, 'H_2');
      assertEqual(r.rows[15].source, 'H_16');
    });

    test('calculate: JRFL hit marks row.jrfl=true and not inBand', () => {
      const sc = newScenario();
      sc.control = { startF: 100, stopF: 600, maxOrder: 3, filterWidth: null, jrfl: [200] };
      sc.harmonics = { enabled: true, fundamentals: [100] };
      sc.sfImd.enabled = false; sc.mtImd.enabled = false;
      const r = calculate(sc);
      const row200 = r.rows.find(x => x.freq === 200);
      assertEqual(row200.jrfl, true);
      assertEqual(row200.inBand, false);
    });

    test('calculate: in-band but not JRFL marks inBand=true', () => {
      const sc = newScenario();
      sc.control = { startF: 100, stopF: 600, maxOrder: 3, filterWidth: null, jrfl: [] };
      sc.harmonics = { enabled: true, fundamentals: [100] };
      sc.sfImd.enabled = false; sc.mtImd.enabled = false;
      const r = calculate(sc);
      const row200 = r.rows.find(x => x.freq === 200);
      assertEqual(row200.inBand, true);
      assertEqual(row200.jrfl, false);
    });

    test('calculate: MT-IMD group Fc=1000 N=3 Δf=10 maxOrder=3 filter=100 yields products', () => {
      const sc = newScenario();
      sc.control = { startF: null, stopF: null, maxOrder: 3, filterWidth: 100, jrfl: [] };
      sc.harmonics.enabled = false;
      sc.sfImd.enabled = false;
      sc.mtImd = { enabled: true, groups: [{ fc: 1000, n: 3, df: 10 }] };
      const r = calculate(sc);
      // tones: 990, 1000, 1010
      // some expected products in [950, 1050]: 980, 990, 1000, 1010, 1020 (3rd-order IMD)
      // we don't pin exact list — just sanity that MT-IMD ran and produced ≥1 in-band product
      const inWindow = r.rows.filter(x => x.freq >= 950 && x.freq <= 1050);
      if (inWindow.length === 0) throw new Error('expected ≥1 in-window MT-IMD product');
      // no pure single-tone harmonics: 990*2=1980 should NOT appear
      const has1980 = r.rows.some(x => Math.abs(x.freq - 1980) < 0.001);
      assertEqual(has1980, false);
    });

    test('calculate: maxOrder>9 is capped and warned', () => {
      const sc = newScenario();
      sc.control.maxOrder = 20;
      sc.harmonics = { enabled: true, fundamentals: [100] };
      sc.sfImd.enabled = false; sc.mtImd.enabled = false;
      const r = calculate(sc);
      const hadWarn = r.warnings.some(w => /capped/i.test(w));
      assertEqual(hadWarn, true);
    });
```

- [ ] **Step 4: Verify**

Reload, `runEngineTests()`. Expected: 25 passed, 0 failed.

---

## Task 11: UI — Calculate button wires engine to results table

**Files:**
- Modify: `harmonics_calculator.html` — `#ui` block

- [ ] **Step 1: Append calculate handler + results renderer**

Insert before `window.__ui = {…}`:

```js
    // ── Calculate / Results ──────────────────────────────────────────
    const sortState = { col: 'freq', dir: 'asc' };

    function estimateCombos(scenario) {
      const c = scenario.control;
      let mo = Number.isFinite(c.maxOrder) ? c.maxOrder : 5;
      if (mo < 2) mo = 2;
      if (mo > 9) mo = 9;
      let est = 0;
      if (scenario.sfImd?.enabled) {
        const n = (scenario.sfImd.tones ?? []).filter(Number.isFinite).length;
        if (n > 0) est += Math.pow(2 * n + 1, mo);
      }
      if (scenario.mtImd?.enabled) {
        for (const g of scenario.mtImd.groups ?? []) {
          if (Number.isFinite(g.n) && g.n >= 2) est += Math.pow(2 * Math.trunc(g.n) + 1, mo);
        }
      }
      return est;
    }

    function sortRows(rows) {
      const k = sortState.col, d = sortState.dir === 'asc' ? 1 : -1;
      return rows.slice().sort((a, b) => {
        const av = a[k], bv = b[k];
        if (av === bv) return 0;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * d;
        return String(av).localeCompare(String(bv)) * d;
      });
    }

    function renderResults(result) {
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

      const cols = [
        { key: 'freq', label: 'Freq (MHz)' },
        { key: 'source', label: 'Source' },
        { key: 'order', label: 'Order' },
        { key: 'jrfl', label: 'JRFL hit' },
        { key: 'inBand', label: 'In bounds' }
      ];
      thead.replaceChildren();
      const trh = el('tr');
      for (const c of cols) {
        const arrow = sortState.col === c.key ? (sortState.dir === 'asc' ? '▲' : '▼') : '';
        trh.append(el('th', {
          onclick: () => {
            if (sortState.col === c.key) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
            else { sortState.col = c.key; sortState.dir = 'asc'; }
            renderResults(result);
          }
        }, c.label, ' ', el('span', { class: 'arrow' }, arrow)));
      }
      thead.append(trh);

      tbody.replaceChildren();
      const sorted = sortRows(result.rows);
      for (const r of sorted) {
        const cls = r.jrfl ? 'jrfl' : (r.inBand ? 'band' : '');
        const tr = el('tr', { class: cls },
          el('td', {}, r.freq.toFixed(6).replace(/\.?0+$/, '')),
          el('td', {}, r.source),
          el('td', {}, String(r.order)),
          el('td', {}, r.jrfl ? '✓' : ''),
          el('td', {}, r.inBand ? '✓' : '')
        );
        tbody.append(tr);
      }
    }

    document.getElementById('btn-calc').onclick = () => {
      const est = estimateCombos(state.scenario);
      if (est > window.__engine.HEAVY_COMPUTE_THRESHOLD) {
        const ok = confirm(
          `Heavy compute: ~${est.toLocaleString()} coefficient combos. Continue?`);
        if (!ok) return;
      }
      const sectionsEnabled = state.scenario.harmonics?.enabled ||
                              state.scenario.sfImd?.enabled ||
                              state.scenario.mtImd?.enabled;
      if (!sectionsEnabled) {
        document.getElementById('results-summary').textContent = 'Enable at least one calculator.';
        document.getElementById('results-table').querySelector('tbody').replaceChildren();
        document.getElementById('cap-banner-slot').replaceChildren();
        return;
      }
      const result = window.__engine.calculate(state.scenario);
      renderResults(result);
    };
```

- [ ] **Step 2: Verify (manual end-to-end)**

Reload. In the UI:

1. Control: leave bounds blank, Max order = 5, leave filter width blank.
2. Harmonics: enabled. Add a fundamental `100`.
3. SF-IMD: disabled. MT-IMD: disabled.
4. Click **Calculate**.

Expected:
- Summary: `16 products, 0 JRFL hits.` (Fundamental at 100 plus H_2..H_16 at 200..1600 — harmonics ignore maxOrder per spec).
- Table shows 16 rows sorted ascending.

Now set Control: Start=150, Stop=350, JRFL=[`300`]. Click Calculate again.

Expected:
- Row 100: no tint (out of band).
- Row 200: green tint (`In bounds: ✓`).
- Row 300: red tint (`JRFL hit: ✓`, in-bounds checkmark blank).
- Rows 400, 500, …, 1600: no tint (above stop).
- Summary: `16 products, 1 JRFL hits.`

Click the `Source` column header: rows sort by source alphabetically; arrow appears.

If anything is off, fix and re-verify.

---

## Task 12: UI — Clear All button

**Files:**
- Modify: `harmonics_calculator.html` — `#ui` block

- [ ] **Step 1: Append clear handler**

Insert before `window.__ui = {…}`:

```js
    document.getElementById('btn-clear').onclick = () => {
      if (!confirm('Clear all inputs and results?')) return;
      state.scenario = newScenario();
      try { localStorage.removeItem(window.__state.LS_KEY); } catch {}
      renderControl(); renderHarm(); renderSfImd(); renderMtImd();
      document.getElementById('results-summary').textContent = 'No calculation run yet.';
      document.getElementById('cap-banner-slot').replaceChildren();
      document.getElementById('results-table').querySelector('thead').replaceChildren();
      document.getElementById('results-table').querySelector('tbody').replaceChildren();
    };
```

- [ ] **Step 2: Verify**

Reload. Populate Control + Harmonics + SF-IMD with values. Calculate. Then click **Clear All** → confirm.

Expected:
- All inputs reset (Max order back to 5, JRFL empty, fundamentals/tones/groups empty, SF-IMD and MT-IMD unchecked, Harmonics still checked since that's the default in `newScenario()`).
- Results section back to "No calculation run yet." with empty table.
- localStorage `harmonics_calc_v1` removed (verify in DevTools Application tab).

---

## Task 13: Validation pass against spreadsheet

Reproduce the three seed cases from the spec side-by-side with `harmonics_v3.xlsm` and document discrepancies inline as comments at the bottom of the .html file.

- [ ] **Step 1: Seed case A — Harmonics-only**

In the HTML: Control → Max order = 5 (any value; harmonics ignore it). Harmonics enabled, fundamental = `100`. Calculate.

Expected: 16 rows (Fundamental at 100, H_2..H_16 at 200..1600). Confirm by glancing at spreadsheet's `Single_Freq_Harm` row with B=100 — columns C..Q should equal H_2..H_16.

If the row count or values disagree, note discrepancy.

- [ ] **Step 2: Seed case B — SF-IMD**

In the spreadsheet: open `Single_Freq_IMD`, set B2=100, B3=105, B4=108, C2=3, D2=200, click `CalculateSFIMD_AllRows`. Copy the resulting frequencies.

In the HTML: same Control max order = 3, filter width = 200. Harmonics disabled. SF-IMD enabled with tones `100, 105, 108`. Calculate.

Expected: result set matches (within 1 kHz). If discrepancy, note inline in HTML and inspect: SF-IMD window in v1 is `center ± filterWidth/2` where `center=(100+108)/2=104`, so window=[4, 204] → much wider than VBA's `center ± filterWidth` would have been. This is the spec's documented behavior; spreadsheet output should still match because spreadsheet's D2 IS treated as full bandwidth in `CalculateSFIMD_AllRows`.

- [ ] **Step 3: Seed case C — MT-IMD**

In the spreadsheet: `MT_IMD_Calc` row 2: B2=1000, C2=3, D2=10, E2=5, F2=100. Click `CalculateIMD_AllRows`. Copy products.

In HTML: Control Max order=5, filter width=200 (because spreadsheet's F-col filter width was 100 ONE-SIDED, equivalent to 200 full BW). Harmonics off, SF-IMD off, MT-IMD enabled with row Fc=1000, N=3, Δf=10. Calculate.

Expected: result set matches spreadsheet. Confirm count and a spot check of 3–5 values.

- [ ] **Step 4: Add a "Notes" comment block at the bottom of harmonics_calculator.html**

Insert as the last lines before `</body>`:

```html
  <!--
    Validation notes (2026-05-29):
      - Filter-width convention: this app treats filter width as FULL bandwidth
        everywhere. The original spreadsheet's MT_IMD_Calc treated it as
        one-sided. To reproduce a spreadsheet MT-IMD result here, use 2× the
        spreadsheet's F-col value as Control → Filter width.
      - Single-tone harmonics:
          Harmonics card  → always emits H_2..H_min(16,maxOrder)
          SF-IMD card     → includes pure n·F_i products (matches VBA allowSingleTone=True)
          MT-IMD card     → excludes pure n·F_i (matches VBA nz≥2 rule)
      - Dedup is per (1 kHz rounded freq, source, order). Different sources at
        the same frequency are intentionally kept (e.g. H_2 of 100 MHz and an
        IMD product both at 200 MHz appear as two rows).
  -->
```

- [ ] **Step 5: Final smoke test**

Reload, `runEngineTests()` → 25 passed, 0 failed.

Click through every UI control once: add/remove chip in each section, toggle each enable, click Calculate, click Clear All. Confirm no console errors.

Done — the v1 deliverable is `harmonics_calculator.html`. Ship it.
