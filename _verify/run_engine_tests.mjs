// Headless harness: extract the engine + state + tests script bodies from the
// HTML file and run them in Node. Mocks the bits of window/document/localStorage
// the engine + state + tests actually touch.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(here, '..', 'harmonics_calculator.html');
const html = readFileSync(htmlPath, 'utf8');

function extractScript(id) {
  const re = new RegExp(
    `<script\\s+type="module"\\s+id="${id}"\\s*>([\\s\\S]*?)</script>`, 'm');
  const m = html.match(re);
  if (!m) throw new Error(`script id="${id}" not found`);
  return m[1];
}

const engineSrc = extractScript('engine');
const stateSrc  = extractScript('state');
const testsSrc  = extractScript('tests');

// Minimal mocks.
const localStorageStore = new Map();
globalThis.localStorage = {
  getItem(k) { return localStorageStore.has(k) ? localStorageStore.get(k) : null; },
  setItem(k, v) { localStorageStore.set(k, String(v)); },
  removeItem(k) { localStorageStore.delete(k); }
};
globalThis.window = globalThis;
globalThis.document = { /* never used by engine/state/tests */ };

// The HTML uses `export` keywords in inline modules. Strip them because we're
// using Function() to eval, not import.
function stripExports(src) {
  return src.replace(/\bexport\s+(function|const|let|var)\b/g, '$1');
}

new Function(stripExports(engineSrc))();
new Function(stripExports(stateSrc))();
new Function(stripExports(testsSrc))();

const result = globalThis.runEngineTests();
if (result.failed > 0) {
  console.error(`\nFAIL — ${result.failed} of ${result.passed + result.failed} tests failed.`);
  process.exit(1);
} else {
  console.log(`\nOK — ${result.passed} tests passed.`);
  process.exit(0);
}
