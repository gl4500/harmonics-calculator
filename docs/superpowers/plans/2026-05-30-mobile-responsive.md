# Mobile Responsive Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the single-file HTML calculator render correctly on phones (iPhone Safari, Android Chrome) using only CSS overrides plus a few HTML attributes.

**Architecture:** Append a single `@media (max-width: 700px)` block to the existing `<style>`. Add `inputmode` attributes to all number inputs. Add two passive iOS-friendly `<meta>` tags. Engine, state, UI logic, and the 29-test harness are untouched.

**Tech Stack:** vanilla HTML5 + CSS, no JS changes.

**User said: skip git.** No commits. Verification = `node _verify/run_engine_tests.mjs` for engine sanity (must remain 29/29 green since no JS changes) + manual responsive check via Chrome DevTools device toolbar.

**Spec:** `docs/superpowers/specs/2026-05-30-mobile-responsive-design.md`

**Deliverable:** Continued modifications to `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`.

---

## File Map

Only one runtime file is modified. Three contained edits in three different regions of the file.

- Modify: `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`
  - `<head>` — add 3 meta tags after the existing `viewport` meta
  - `<style>` — append `@media (max-width: 700px) { … }` block before `</style>`
  - `<script type="module" id="ui">` — add `inputmode` to every `el('input', { type: 'number', … })` call across `renderControl`, `renderHarm`, `renderSfImd`, `renderMtImd`

---

## Task 1: Meta tags + viewport hardening

Three new `<meta>` tags in the `<head>` to support iOS toolbar tinting and home-screen install behavior.

**Files:**
- Modify: `harmonics_calculator.html` — `<head>` section

- [ ] **Step 1: Insert 3 meta tags immediately after the existing viewport meta**

Find:
```html
  <meta name="viewport" content="width=device-width, initial-scale=1">
```

After it, insert:
```html
  <meta name="theme-color" content="#2563eb">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
```

- [ ] **Step 2: Verify**

Open file in Chrome desktop. DevTools → Elements → confirm the 3 new meta tags are siblings of viewport in `<head>`. No console errors. No visible change on desktop.

---

## Task 2: Append mobile @media block to the `<style>`

The bulk of the work. A single, contained CSS block at the end of the existing `<style>`. Above 700px viewports, nothing in this block applies.

**Files:**
- Modify: `harmonics_calculator.html` — `<style>` block, just before `</style>`

- [ ] **Step 1: Append the media query block before `</style>`**

```css
    @media (max-width: 700px) {
      body { font-size: 15px; }

      main { margin: 12px auto; padding: 0 12px; gap: 12px; }

      .card { padding: 12px; }
      .card h2 { font-size: 13px; }

      /* ≥16px prevents iOS Safari auto-zoom on input focus */
      input[type="number"], input[type="text"] { font-size: 16px; }

      /* Control's Start/Stop row stacks vertically */
      .row { flex-direction: column; align-items: stretch; gap: 6px; }
      label.field { width: 100%; }
      label.field input { width: 100%; }

      /* MT-IMD group rows: 2-column grid, × button in row 3 right */
      .group-row { grid-template-columns: 1fr 1fr; gap: 8px; }
      .group-row > button.icon { justify-self: end; grid-column: 2 / 3; }

      /* Tap targets */
      button.icon {
        min-width: 32px; min-height: 32px;
        padding: 4px 10px; font-size: 16px;
      }

      /* Chips */
      .chip { padding: 4px 8px; }
      .chip input { width: 90px; font-size: 16px; }

      /* Pivot table: keep horizontal scroll, trim padding */
      table.pivot th, table.pivot td { padding: 4px 6px; min-width: 56px; }
      table.pivot .freq { margin: 1px; padding: 2px 5px; }

      /* List table: trim padding */
      th, td { padding: 4px 6px; }

      /* View-toggle moves under the count text instead of inline */
      .view-toggle { margin-left: 0; margin-top: 6px; }
      #results-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
    }
```

- [ ] **Step 2: Verify engine tests still green (sanity)**

CSS changes can't affect engine math, but run anyway:

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected: `29 passed, 0 failed.`

- [ ] **Step 3: Verify desktop layout unchanged**

Open in Chrome at full window width (>700px). Visual check: header, all 4 cards, action bar, results card all look identical to before.

- [ ] **Step 4: Verify mobile layout in DevTools device toolbar**

DevTools → toggle device toolbar (Ctrl+Shift+M) → choose iPhone XR (375×812).

Check:
- Header readable, no horizontal overflow on the page.
- Control card shows Start input above Stop input (stacked).
- Harmonics, SF-IMD cards have chip lists wrapping naturally.
- SF-IMD card's Max order + Filter width row stacks vertically (one above the other).
- MT-IMD: add a group via `+ Add group`. Confirm Fc/N on row 1, Δf/Max order on row 2, Filter/× on row 3 (× right-aligned).
- Number inputs visibly larger (16px font).
- `+` and `×` buttons easy to tap (32×32 minimum).
- After Calculate: Pivot table scrolls horizontally inside the results card; other cards do NOT widen with it.

If anything looks broken, fix in the same `@media` block, no rules touch outside it.

---

## Task 3: Add `inputmode` to all number inputs in the UI block

Each `<input type="number">` in the rendered UI needs an explicit `inputmode` so mobile keyboards show the right key set. Float fields use `inputmode: 'decimal'`, integer fields use `inputmode: 'numeric'`.

**Files:**
- Modify: `harmonics_calculator.html` — `<script type="module" id="ui">` block

**Inputs to modify (search-and-add `inputmode` to each `el('input', {...})` call):**

| Render function | Field | inputmode |
|---|---|---|
| `renderControl` | Start (MHz) | `decimal` |
| `renderControl` | Stop (MHz)  | `decimal` |
| `renderControl` | JRFL chip   | `decimal` |
| `renderHarm`    | Fundamental chip | `decimal` |
| `renderSfImd`   | Max order   | `numeric` |
| `renderSfImd`   | Filter width| `decimal` |
| `renderSfImd`   | Tone chip   | `decimal` |
| `renderMtImd`   | Fc          | `decimal` |
| `renderMtImd`   | N           | `numeric` |
| `renderMtImd`   | Δf          | `decimal` |
| `renderMtImd`   | Max order   | `numeric` |
| `renderMtImd`   | Filter      | `decimal` |

- [ ] **Step 1: Add inputmode to the 4 Control inputs in `renderControl`**

The current Control fields look like:

```js
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
```

Add `inputmode: 'decimal'` to each `<input>` config object. After the edit:

```js
        el('label', { class: 'field' }, 'Start (MHz)',
          el('input', {
            type: 'number', inputmode: 'decimal', step: 'any', value: c.startF ?? '',
            oninput: (e) => { c.startF = num(e.target.value); save(); }
          })),
        el('label', { class: 'field' }, 'Stop (MHz)',
          el('input', {
            type: 'number', inputmode: 'decimal', step: 'any', value: c.stopF ?? '',
            oninput: (e) => { c.stopF = num(e.target.value); save(); }
          })),
```

Then add `inputmode: 'decimal'` to the JRFL chip input (inside `rerenderChips()`):

```js
        c.jrfl.forEach((v, i) => {
          chipList.append(el('span', { class: 'chip' },
            el('input', {
              type: 'number', inputmode: 'decimal', step: 'any', value: v,
              oninput: (e) => { c.jrfl[i] = num(e.target.value); save(); }
            }),
            ...
          ));
        });
```

- [ ] **Step 2: Add inputmode to the Harmonics fundamental input in `renderHarm`**

Find the chip input in `renderHarm`'s rerender:

```js
        h.fundamentals.forEach((v, i) => {
          list.append(el('span', { class: 'chip' },
            el('input', {
              type: 'number', step: 'any', value: v,
              oninput: (e) => { h.fundamentals[i] = num(e.target.value); save(); }
            }),
```

Add `inputmode: 'decimal'`:

```js
            el('input', {
              type: 'number', inputmode: 'decimal', step: 'any', value: v,
              oninput: (e) => { h.fundamentals[i] = num(e.target.value); save(); }
            }),
```

- [ ] **Step 3: Add inputmode to the 3 SF-IMD inputs in `renderSfImd`**

Find the SF-IMD Max order + Filter width row:

```js
      body.append(el('div', { class: 'row' },
        el('label', { class: 'field' }, 'Max order (2–9)',
          el('input', {
            type: 'number', step: '1', min: '2', max: '9',
            value: s.maxOrder ?? '', placeholder: '5',
            oninput: (e) => { s.maxOrder = num(e.target.value); save(); }
          })),
        el('label', { class: 'field' }, 'Filter width (MHz, full BW)',
          el('input', {
            type: 'number', step: 'any',
            value: s.filterWidth ?? '', placeholder: 'auto',
            oninput: (e) => { s.filterWidth = num(e.target.value); save(); }
          })),
      ));
```

Add `inputmode: 'numeric'` to Max order, `inputmode: 'decimal'` to Filter width:

```js
      body.append(el('div', { class: 'row' },
        el('label', { class: 'field' }, 'Max order (2–9)',
          el('input', {
            type: 'number', inputmode: 'numeric',
            step: '1', min: '2', max: '9',
            value: s.maxOrder ?? '', placeholder: '5',
            oninput: (e) => { s.maxOrder = num(e.target.value); save(); }
          })),
        el('label', { class: 'field' }, 'Filter width (MHz, full BW)',
          el('input', {
            type: 'number', inputmode: 'decimal', step: 'any',
            value: s.filterWidth ?? '', placeholder: 'auto',
            oninput: (e) => { s.filterWidth = num(e.target.value); save(); }
          })),
      ));
```

Then find the tone chip input in `renderSfImd`'s rerender and add `inputmode: 'decimal'`:

```js
            el('input', {
              type: 'number', inputmode: 'decimal', step: 'any', value: v,
              oninput: (e) => { s.tones[i] = num(e.target.value); save(); }
            }),
```

- [ ] **Step 4: Add inputmode to the 5 MT-IMD group inputs in `renderMtImd`**

Find each `<input>` inside the group row build. Add `inputmode` per the field type:

```js
          const row = el('div', { class: 'group-row' },
            el('label', { class: 'field' }, 'Fc (MHz)',
              el('input', {
                type: 'number', inputmode: 'decimal', step: 'any', value: g.fc,
                oninput: (e) => { g.fc = num(e.target.value); refreshErr(); save(); }
              })),
            el('label', { class: 'field' }, 'N',
              el('input', {
                type: 'number', inputmode: 'numeric',
                step: '1', min: '2', value: g.n,
                oninput: (e) => { g.n = num(e.target.value); refreshErr(); save(); }
              })),
            el('label', { class: 'field' }, 'Δf (MHz)',
              el('input', {
                type: 'number', inputmode: 'decimal', step: 'any', value: g.df,
                oninput: (e) => { g.df = num(e.target.value); refreshErr(); save(); }
              })),
            el('label', { class: 'field' }, 'Max order',
              el('input', {
                type: 'number', inputmode: 'numeric',
                step: '1', min: '2', max: '9',
                value: g.maxOrder ?? '', placeholder: '5',
                oninput: (e) => { g.maxOrder = num(e.target.value); save(); }
              })),
            el('label', { class: 'field' }, 'Filter (MHz)',
              el('input', {
                type: 'number', inputmode: 'decimal', step: 'any',
                value: g.filterWidth ?? '', placeholder: 'auto',
                oninput: (e) => { g.filterWidth = num(e.target.value); save(); }
              })),
            ...
```

- [ ] **Step 5: Verify engine tests + sanity check the `el()` attribute spread**

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected: `29 passed, 0 failed.`

Then open the page in Chrome and inspect any number input via DevTools → Elements. The `<input>` tag should have an `inputmode` attribute alongside the existing `type`, `step`, `value`. Confirm typing still works exactly as before (no regression).

The `el()` helper at the top of the UI block already handles arbitrary attributes via `e.setAttribute(k, v)` — `inputmode` will be applied just like `type` and `step`.

---

## Task 4: Final verification

- [ ] **Step 1: Engine tests**

```powershell
node "C:\Users\gl450\Harmonics Calculator\_verify\run_engine_tests.mjs"
```

Expected: `29 passed, 0 failed.`

- [ ] **Step 2: Desktop visual regression**

Open in Chrome at viewport width 1000–1400px. Confirm the page is byte-equivalent to before mobile work began (no visible CSS change outside the `@media` block).

- [ ] **Step 3: Mobile viewport simulation**

DevTools device toolbar → iPhone XR (375×812). Verify:
- Page renders without horizontal page scroll.
- All 4 cards stacked, each readable.
- Number inputs at 16px font.
- MT-IMD group row reflows to 3 lines (2 columns).
- Buttons have minimum 32×32 tap area.
- Pivot table after Calculate scrolls horizontally inside its own card.

- [ ] **Step 4: Real device (if available)**

AirDrop / email / iCloud Drive the `harmonics_calculator.html` to an iPhone. Open in Files app → tap to open in Safari. Or transfer to Android, open in Chrome.

Confirm:
- Tapping Fc/Δf/Filter shows decimal keyboard.
- Tapping N/Max order shows numeric keyboard.
- No focus-zoom on input tap.
- All cards readable, all calculator behavior works.

Done — mobile-friendly v3 is shipped.
