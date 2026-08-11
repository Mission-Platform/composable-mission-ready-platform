import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponents } from '@mission-platform/vite-plugin-forge';

/**
 * Workspace `-wasm` packages whose already self-contained (base64-inlined)
 * output is bundled into the barcode package so the published artifact stays
 * self-contained with no external runtime dependency.
 */
const WASM_PACKAGES = ['@mission-platform/barcode-encode-wasm', '@mission-platform/barcode-decode-wasm'] as const;

/**
 * Neutral self-contained encoder/decoder (`dist/index.js` + dts) plus the five
 * forge component framework builds (`dist/{vue,react,solid,web-components}/`).
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
  ...defineTsdownForgeComponents({
    rootDir: import.meta.dirname,
    frameworks: [
      forgeVueFramework(),
      forgeReactFramework(),
      forgeSolidFramework(),
      forgeSvelteFramework(),
      forgeWebComponentsFramework(),
    ],
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformBarcode',
    // Encoder is consumed through the package's own `.` entry.
    external: ['i18next'],
  }),
];
