import fs from 'node:fs';
import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

import type { TsdownPlugin } from 'tsdown';

/**
 * Inline `*.wasm` referenced via Emscripten's
 * `new URL('hunspell.wasm', import.meta.url)` as base64 `data:` URIs so the
 * worker/chunk stays self-contained (same contract as the prior Vite
 * `assetsInlineLimit` treatment).
 */
function inlineWasmUrlPlugin(): TsdownPlugin {
  return {
    name: 'mission-platform:hunspell-inline-wasm-url',
    enforce: 'pre',
    transform(code, id) {
      if (!code.includes('.wasm') || !code.includes('import.meta.url')) {
        return;
      }

      const filePath = id.split('?')[0] ?? id;
      let touched = false;
      const next = code.replaceAll(
        /new URL\(\s*(['"])([^'"]+\.wasm)\1\s*,\s*import\.meta\.url\s*\)/g,
        (match, _quote: string, wasmFile: string) => {
          const resolved = path.resolve(path.dirname(filePath), wasmFile);
          if (!fs.existsSync(resolved)) {
            return match;
          }
          touched = true;
          const base64 = fs.readFileSync(resolved).toString('base64');
          return `new URL(${JSON.stringify(`data:application/wasm;base64,${base64}`)})`;
        },
      );

      return touched ? next : undefined;
    },
  };
}

/**
 * Inline `?raw` dictionary imports as string exports (Vite-compatible).
 */
function rawImportPlugin(): TsdownPlugin {
  return {
    name: 'mission-platform:hunspell-raw-import',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!source.includes('?raw')) {
        return;
      }
      const cleaned = source.replace(/\?raw$/, '');
      const resolved = importer ? path.resolve(path.dirname(importer), cleaned) : path.resolve(cleaned);
      return `${resolved}?raw-inline`;
    },
    load(id) {
      if (!id.endsWith('?raw-inline')) {
        return;
      }
      const filePath = id.slice(0, -'?raw-inline'.length);
      const contents = fs.readFileSync(filePath, 'utf8');
      return `export default ${JSON.stringify(contents)};`;
    },
  };
}

/**
 * Self-contained ESM bundles. Entry names are chosen so the JS emit matches
 * the package `exports` contract (`dist/hunspell.js`, `dist/hunspell.worker.js`).
 * Declaration emit is left to `tsc --emitDeclarationOnly` so `dist/index.d.ts`
 * and `dist/worker/hunspell.worker.d.ts` keep their historical paths.
 */
export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: {
    hunspell: 'src/index.ts',
    'hunspell.worker': 'src/worker/hunspell.worker.ts',
  },
  // Single self-contained file per entry (worker embeds wasm + dictionaries).
  unbundle: false,
  clean: true,
  external: ['monaco-editor'],
  overrides: {
    plugins: [rawImportPlugin(), inlineWasmUrlPlugin()],
  },
});
