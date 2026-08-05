import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

/**
 * Workspace `-wasm` packages whose already self-contained (base64-inlined)
 * output is bundled into the qr-code package so the published artifact stays
 * self-contained with no external runtime dependency.
 */
const WASM_PACKAGES = ['@mission-platform/qr-code-encode-wasm', '@mission-platform/qr-code-decode-wasm'] as const;

/**
 * Neutral self-contained encoder/decoder (`dist/index.js` + dts) plus the five
 * forge component framework builds (`dist/{vue,react,solid,svelte,web-components}/`).
 */
export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: {
      index: 'src/index.ts',
    },
    // Single self-contained ESM bundle (not preserve-modules).
    unbundle: false,
    clean: true,
    overrides: {
      // tsdown externalises package.json dependencies by default; force the
      // self-contained `-wasm` packages into this bundle so the published
      // artifact needs no external runtime dependency.
      deps: {
        alwaysBundle: [...WASM_PACKAGES],
      },
    },
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: import.meta.dirname,
    frameworks: ['vue', 'react', 'solid', 'svelte', 'web-components'],
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformQrCode',
    external: ['@mission-platform/qr-code', '@mission-platform/qr-code/encoder'],
  }),
];
