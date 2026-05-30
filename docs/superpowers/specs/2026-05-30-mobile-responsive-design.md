# Mobile Responsive Layout — Design

**Date:** 2026-05-30
**Status:** Approved; ready for implementation plan
**Builds on:** previous specs (single-file HTML calculator, pivot results table, per-section/per-row IMD config)

---

## Goal

Make the existing single-file calculator render and operate correctly on phones (iPhone Safari, Android Chrome) without changing the desktop experience. CSS-only adaptation; no JS changes, no hosting, no PWA manifest.

## Non-goals

- Mobile-specific code paths or feature detection
- Server-side rendering, build step, or hosting infrastructure
- PWA / "Add to Home Screen" manifest + icons
- A separate mobile-only file or stylesheet
- Persisted scenario or other state changes

## Deliverable

Continued modifications to `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`.

---

## Approach

A single `@media (max-width: 700px)` block appended to the existing `<style>` overrides desktop defaults when the viewport is narrow. Plus two passive changes that work everywhere: `inputmode` attributes on number inputs and two iOS-friendly `<meta>` tags. The `viewport` meta is already present.

The 700px breakpoint covers:
- Phones (portrait, 320–430px)
- Phones (landscape, 568–926px)
- Small tablets in narrow split-screen
- Desktop windows resized narrow (engineer dogfooding)

Above 700px → desktop CSS unchanged. Below → mobile overrides activate.

## Changes

### 1. Meta tags in `<head>`

Add immediately after the existing `viewport` meta:

```html
<meta name="theme-color" content="#2563eb">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
```

- `theme-color`: tints the browser chrome (Android Chrome address bar, iOS Safari toolbar on newer iOS) to match the app's accent color.
- `apple-mobile-web-app-*`: optional iOS-only hints used when the page is added to the home screen. Harmless if never used.

### 2. `inputmode` on number inputs (no media query)

For each `<input type="number">` in the UI:
- Float fields (Fc, Δf, Filter width, Start, Stop, JRFL chips, fundamentals, SF-IMD tones) → `inputmode="decimal"`
- Integer fields (N, Max order) → `inputmode="numeric"`

This tells mobile keyboards which key set to show. Desktop browsers ignore the attribute.

### 3. Mobile-only media query block

Append to the `<style>` block, just before `</style>`:

```css
@media (max-width: 700px) {
  body { font-size: 15px; }

  main { margin: 12px auto; padding: 0 12px; gap: 12px; }

  /* Reduce card padding to claw back horizontal space */
  .card { padding: 12px; }
  .card h2 { font-size: 13px; }

  /* Number inputs ≥ 16px prevents iOS auto-zoom on focus */
  input[type="number"], input[type="text"] { font-size: 16px; }

  /* Control's Start/Stop and similar field rows stack vertically */
  .row { flex-direction: column; align-items: stretch; gap: 6px; }
  label.field { width: 100%; }
  label.field input { width: 100%; }

  /* MT-IMD group rows collapse from 5+1 columns to 2 columns
     so the 5 inputs flow across 3 lines, with × tucked at the end */
  .group-row {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .group-row > button.icon {
    justify-self: end;
    grid-column: 2 / 3;
  }

  /* Larger tap targets for + and × buttons */
  button.icon {
    min-width: 32px; min-height: 32px;
    padding: 4px 10px;
    font-size: 16px;
  }

  /* Chip-list buttons reflow on smaller screens */
  .chip { padding: 4px 8px; }
  .chip input { width: 90px; font-size: 16px; }

  /* Pivot view: keep horizontal scroll working; just trim padding */
  table.pivot th, table.pivot td { padding: 4px 6px; min-width: 56px; }
  table.pivot .freq { margin: 1px; padding: 2px 5px; }

  /* List view: trim padding similarly */
  th, td { padding: 4px 6px; }

  /* View-toggle stays inline but doesn't push the count text off-screen */
  .view-toggle { margin-left: 0; margin-top: 6px; }
  #results-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
}
```

The block consumes ~50 lines but only activates below 700px.

## What stays the same

- All JS (engine, state, UI logic, tests)
- All 29 engine tests
- Desktop layout above 700px is byte-for-byte identical (no CSS rules outside the media query are touched)
- Single-file deliverable, no external dependencies, no build step

## Behavior assumptions

- Phones use the in-OS Safari (iOS) or Chrome (Android). Other mobile browsers (Firefox Mobile, Brave, Samsung Internet) ship the same standards — should work fine but not explicitly tested.
- iOS Safari 14+ and Android Chrome 87+ baseline — covers most devices from ~2020 onwards. Older devices may see degraded styling but core math still runs.
- File is opened via Files app (iOS), Files / Drive (Android), or directly from email/AirDrop. No URL hosting required for "represent well" goal.

## Testing strategy

1. **Engine tests** (`node _verify/run_engine_tests.mjs`) — must remain 29/29 green. CSS changes don't affect math layer.
2. **Desktop manual check** — at viewport > 700px, layout looks identical to current state.
3. **Browser DevTools mobile preview** — switch to iPhone XR (375×812) and iPhone 14 Pro Max (430×932) presets. Verify:
   - All cards stack vertically (already do)
   - Number inputs are tappable without zoom
   - MT-IMD group rows show 5 inputs across 3 lines, × button visible
   - + and × buttons are easy to tap (32×32 minimum)
   - Pivot table scrolls horizontally inside its card; other cards do NOT widen with it (existing `min-width: 0` on `.card` still applies)
4. **Real device** (if available) — open on actual iPhone or Android, verify keyboards show correct key set (decimal for Fc, numeric for N) and no auto-zoom on focus.

## Out of scope (explicit)

- No new tests added (this is presentation only).
- No persisted "mobile mode" or user toggle.
- No accessibility audit beyond keeping tap targets ≥ 32px.
- No landscape-specific tweaks (700px covers landscape phones naturally).
- No dark mode.

## v3 backlog (potential follow-ups)

- PWA manifest + icons so the file can be "installed" to home screen and behaves like a real app.
- Static URL hosting (GitHub Pages) so the file is one tap away.
- Dark mode via `prefers-color-scheme: dark` media query.
- Accessibility audit (screen reader labels, focus rings, color contrast).
