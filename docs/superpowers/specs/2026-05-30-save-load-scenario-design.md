# Save / Load Scenario JSON — Design

**Date:** 2026-05-30
**Status:** Queued (task #35); design approved, implementation deferred
**Builds on:** prior specs (v1/v2/v3/CSV-export/CSV-import)

---

## Goal

Let the user save and restore individual section inputs as small JSON files, so scenarios can be shared, backed up, and mixed-and-matched without retyping. Per-section: each card has its own Save + Load pair.

## Non-goals

- Saving results in the JSON (CSV export already handles that)
- A global "Save Entire Scenario" button (multi-section files are possible by hand; no dedicated UI)
- Persisting beyond `localStorage` autosave (which already handles per-tab state)
- Cloud sync / sharing-by-URL
- Per-row save/load inside MT-IMD groups (per-card granularity is enough)

## Deliverable

Continued modifications to `C:\Users\gl450\Harmonics Calculator\harmonics_calculator.html`. Final test count: 37 (existing 34 + 3 new).

---

## Architecture

Pure engine helpers handle serialization and parsing; the UI block wires per-card buttons that call them, then merge results into `state.scenario` and re-render.

```
                          ┌─ Save  → serializeSection(key, slice) → JSON
                          │           Blob + <a download>
each card heading: [S][L] ┤
                          └─ Load  → file picker → FileReader text →
                                    parseScenarioJSON(text) →
                                    merge sections into state.scenario →
                                    renderControl/Harm/SfImd/MtImd + save()
```

No state shape changes. The JSON schema mirrors `scenario.<key>` exactly.

## Engine API additions

```js
// serializeSection(key, slice) → JSON string
//   key: 'control' | 'harmonics' | 'sfImd' | 'mtImd'
//   slice: the matching scenario.<key> object
// Pretty-printed (2-space indent) so the file is hand-readable.
export function serializeSection(key, slice) {
  return JSON.stringify({ [key]: slice }, null, 2);
}

// parseScenarioJSON(text) → { sections, errors }
//   sections: a partial scenario { control?, harmonics?, sfImd?, mtImd? }
//             containing every recognized top-level key in the file
//   errors:   string[] (bad JSON, unknown keys, type-shape mismatches)
//
// Validation:
//   - Top-level must be a plain object
//   - Recognized keys: 'control', 'harmonics', 'sfImd', 'mtImd'
//   - Unrecognized top-level keys → warning in errors (file still
//     usable if other recognized keys validate)
//   - Per-section shape checks: expected field types only; missing
//     optional fields fall back to defaults at merge time
//
// Returns sections={} if no recognized keys; UI surfaces errors[].
export function parseScenarioJSON(text): { sections, errors }
```

## Per-section JSON shapes

Each file's top-level key identifies the section. Multi-section files are valid: the loader merges every recognized key.

**Freq Range (`control`):**
```json
{
  "control": {
    "startF": 100,
    "stopF": 600,
    "jrfl": [200, 300]
  }
}
```

**Harmonics:**
```json
{
  "harmonics": {
    "enabled": true,
    "fundamentals": [100, 225.5]
  }
}
```

**Single-Freq IMD:**
```json
{
  "sfImd": {
    "enabled": true,
    "tones": [100, 105, 108],
    "maxOrder": 5,
    "filterWidth": null
  }
}
```

**Multi-Tone IMD:**
```json
{
  "mtImd": {
    "enabled": true,
    "groups": [
      { "fc": 1000, "n": 3, "df": 10, "maxOrder": 5, "filterWidth": null }
    ]
  }
}
```

## UI changes

### Button placement

Each card's `<h2>` heading area gets a small `Save | Load` button pair. For cards that already have an enable checkbox, the buttons sit after the label:

```
FREQ RANGE                                    [ Save ][ Load ]
┌──────────────────────────────────────────────────────────────┐
│ Start [...] MHz   Stop [...] MHz                             │
│ JRFL: [pill] [pill] [+]                                      │
└──────────────────────────────────────────────────────────────┘

[✓] HARMONICS (H₂..H₁₆)                       [ Save ][ Load ]
┌──────────────────────────────────────────────────────────────┐
│ Fundamentals: [pill] [pill] [+]                              │
└──────────────────────────────────────────────────────────────┘
```

Button style: same `button.icon` size used by chip controls — compact text labels, not heavy primary buttons. Aligned right within the heading.

### Save handler (per card)

```js
function saveSection(key) {
  const slice = state.scenario[key];
  const json = window.__engine.serializeSection(key, slice);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sectionFilename(key);
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sectionFilename(key) {
  const slugMap = { control: 'freq-range', harmonics: 'harmonics',
                    sfImd: 'sf-imd', mtImd: 'mt-imd' };
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `harm-${slugMap[key]}_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}
```

### Load handler (per card)

A single hidden `<input type="file" id="scenario-load-input" accept=".json,application/json">` lives in the body and is shared by all four Load buttons. Each Load button stashes its `key` in a module-level variable before triggering the picker; the change handler reads it back.

```js
let pendingLoadKey = null;

function loadSection(expectedKey) {
  pendingLoadKey = expectedKey;
  const input = document.getElementById('scenario-load-input');
  input.value = '';
  input.click();
}

document.getElementById('scenario-load-input').addEventListener('change', (e) => {
  const expectedKey = pendingLoadKey;
  pendingLoadKey = null;
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const { sections, errors } = window.__engine.parseScenarioJSON(String(reader.result ?? ''));
    const importErrors = [...errors];
    if (Object.keys(sections).length === 0) {
      // Nothing usable in the file.
      flashBanner('Scenario file had no recognized sections. ' + importErrors.join(' '));
      return;
    }
    if (expectedKey && !(expectedKey in sections)) {
      importErrors.push(`Loaded file is missing the expected '${expectedKey}' section.`);
    }
    // Merge each recognized section, in source-of-truth order.
    for (const key of ['control', 'harmonics', 'sfImd', 'mtImd']) {
      if (sections[key]) Object.assign(state.scenario[key], sections[key]);
    }
    renderControl(); renderHarm(); renderSfImd(); renderMtImd();
    save();
    if (importErrors.length) flashBanner(importErrors.join(' '));
  };
  reader.onerror = () => flashBanner('Failed to read file: ' + (reader.error?.message ?? 'unknown'));
  reader.readAsText(file);
});
```

`flashBanner(text)` is a small helper that writes a single banner into the existing `#cap-banner-slot` area for a few seconds. (Reusing the existing cap-banner styling keeps the visual language consistent.)

## Merge semantics

- `Object.assign(state.scenario.<key>, sections.<key>)` shallow-merges loaded fields over current values. Missing optional fields keep current values.
- For arrays (`fundamentals`, `tones`, `groups`, `jrfl`), the loaded value REPLACES the current value (not concatenates). This matches user intent: "Load JRFL" replaces, doesn't append.
- After merge, every card re-renders and autosave fires. localStorage now holds the new state.

## Cross-card behavior

A multi-section file (e.g. one containing both `control` and `harmonics`) loaded from the Harmonics card updates BOTH sections. The "expected key" check only adds a warning if the expected key is missing — it never blocks merging the keys that ARE present.

This means: if you want to load only Harmonics from a multi-section file, the per-card UI doesn't enforce that. A user who wants strict isolation can hand-edit the file. v4 backlog if it becomes a real friction.

## Error surface

All errors surface in the same `#cap-banner-slot` as the existing CSV import errors. Examples:

- `Bad JSON: Unexpected token < at position 0.`
- `Unknown top-level key 'badness' in scenario file (ignored).`
- `Loaded file is missing the expected 'harmonics' section.`
- `'sfImd.tones' must be an array of numbers; got: 'oops'`

No exceptions thrown out of engine helpers — they're total over any string input.

## Tests

Add 3 inline engine tests (running against the existing `_verify/run_engine_tests.mjs` harness):

1. **`serializeSection → parseScenarioJSON round-trip preserves a Harmonics slice`**
   - Build a known harmonics slice, serialize, parse, assert the parsed shape equals the original.

2. **`parseScenarioJSON: file with `control` only returns sections={control} and no errors`**
   - Verifies single-section files work and don't spuriously complain about missing other keys.

3. **`parseScenarioJSON: bad JSON returns sections={} and an error mentioning 'Bad JSON'`**
   - Verifies failure mode is graceful (no thrown exception).

Final count: 37 tests after this feature lands.

## Mobile considerations

- `<input type="file">` with `accept=".json"` works on iOS Safari and Android Chrome.
- `Blob` + `URL.createObjectURL` + `<a download>` works for save on the same browsers.
- Per-card button placement should remain tap-friendly; the existing `@media (max-width: 700px)` block's `button.icon` sizing (32×32) already covers this.

## Out-of-scope follow-ups (v5 backlog)

- Global "Save Entire Scenario" button (one-click whole-state export)
- "Compare scenario" view (diff two loaded files)
- Versioning header in the JSON for future schema migrations
- Cloud sync / share-by-URL
- Per-row Save inside MT-IMD groups

---

## Implementation plan placeholder

When the user is ready to ship this, the implementation plan will live at:

`docs/superpowers/plans/YYYY-MM-DD-save-load-scenario.md`

It will mirror the structure of `2026-05-30-csv-import.md`:

- Task 1: engine helpers (`serializeSection`, `parseScenarioJSON`) + 3 TDD tests → 37 passed
- Task 2: per-card Save/Load buttons + shared hidden file input + change handler + `flashBanner` helper
- Task 3: commit + push (pre-commit hook auto-syncs `index.html`)

Estimated effort: similar to CSV Import (~15–25 min via subagent-driven, ~10 min inline).
