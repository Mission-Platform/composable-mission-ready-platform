import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

/**
 * Workspace `-wasm` package whose already self-contained (base64-inlined) output
 * is bundled into the code-scanner package so the published artifact stays
 * self-contained with no external runtime dependency.
 */
const WASM_PACKAGES = ['@mission-platform/code-scan-wasm'] as const;

/**
 * Neutral self-contained scanner façade (`dist/index.js` + dts) plus the five
 * forge component framework builds (`dist/{vue,react,solid,web-components}/`).
 * Sibling decoder packages stay external so their inlined wasm is not re-bundled.
 */
export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: {
      index: 'src/index.ts',
    },
    unbundle: false,
    clean: true,
    external: ['@mission-platform/qr-code', '@mission-platform/matrix-code', '@mission-platform/barcode'],
    overrides: {
      deps: {
        alwaysBundle: [...WASM_PACKAGES],
      },
    },
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: import.meta.dirname,
    frameworks: ['vue', 'react', 'solid', 'svelte', 'web-components'],
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformCodeScanner',
    external: ['@mission-platform/code-scanner'],
  }),
];
