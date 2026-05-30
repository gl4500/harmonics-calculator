# Harmonics & IMD Calculator

Single-file HTML calculator that computes harmonics (H₂..H₁₆) and intermodulation distortion (IMD) products for RF analysis, with JRFL hit detection and in-band highlighting. Port of the VBA macros from `harmonics_v3.xlsm` to a Chrome/Safari-compatible web page.

**Live:** https://gl4500.github.io/harmonics-calculator/

## Features

- **Harmonics** — Each fundamental → H₂..H₁₆
- **Single-Frequency IMD** — Arbitrary tone list; per-section Max Order and Filter Width
- **Multi-Tone IMD** — Per-row Fc / N / Δf / Max Order / Filter Width groups
- **Highlighting** — Start/Stop bounds (green) and JRFL frequencies (red, ±1 kHz match)
- **Results** — List view (sortable) and Pivot view (Source × Order matrix); per-frequency tinting
- **Persistence** — Scenario auto-saves to localStorage
- **Mobile-friendly** — Responsive layout for phones (iOS Safari, Android Chrome)

## Files

- `index.html` / `harmonics_calculator.html` — the calculator (one file, no build, no dependencies)
- `harmonics_v3.xlsm` — original Excel workbook with VBA macros (source of truth for the math)
- `_verify/run_engine_tests.mjs` — headless Node test harness (29 golden-vector tests)
- `docs/superpowers/specs/` — design specs (v1, pivot, mobile)
- `docs/superpowers/plans/` — implementation plans

## Run locally

Open `index.html` in any modern browser. No server, no build, no external dependencies.

## Run engine tests

```
node _verify/run_engine_tests.mjs
```

Expected output: `29 passed, 0 failed.`

## Math

The engine is a direct port of the VBA `EnumerateTuples` + `EvaluateAndStore` routines from `harmonics_v3.xlsm`:

- For each total order K ∈ [2..MaxOrder]: enumerate every integer coefficient tuple (k₁..kₙ) with Σ|kᵢ| = K
- Sign canonicalization (first nonzero coefficient must be positive) to avoid ± duplicates
- 1 kHz dedup via integer-rounded key
- VBA-style auto-fallback for filter width when not explicitly set

## License

MIT — use freely.
