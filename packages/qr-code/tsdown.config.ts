import path from 'node:path';

import { defineTsdownForgeCmsAll } from '@mission-platform/forge-cms-plugin-api';
import { forgeStoryblokCmsTargets } from '@mission-platform/forge-cms-storyblok';
import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponents } from '@mission-platform/vite-plugin-forge';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

/**
 * No legacy wrapper package is bundled: all QR encoder and decoder paths use
 * package-local Forge Web Script artifacts.
 */
const WASM_PACKAGES = [] as const;

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
      deps: {
        alwaysBundle: [...WASM_PACKAGES],
      },
      plugins: [forgeWebScriptPlugin({ rootDir: import.meta.dirname, requireExports: false })],
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
    name: 'MissionPlatformQrCode',
    // Encoder is consumed through the package's own `.` entry.
    external: ['i18next'],
    overrides: {
      plugins: [forgeWebScriptPlugin({ rootDir: import.meta.dirname, requireExports: false })],
    },
  }),
  ...defineTsdownForgeCmsAll({
    rootDir: import.meta.dirname,
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    targets: forgeStoryblokCmsTargets({
      packageName: '@mission-platform/qr-code',
      frameworks: [
        forgeReactFramework(),
        forgeVueFramework(),
        forgeSvelteFramework(),
        forgeSolidFramework(),
        forgeWebComponentsFramework(),
      ],
    }),
  }),
];
