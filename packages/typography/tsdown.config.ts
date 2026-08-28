import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponents } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

/**
 * Neutral component declarations (`dist/components/**`) plus the five Forge
 * framework builds (`dist/{vue,react,solid,svelte,web-components}/`).
 */
export default [
  // Emit the neutral tree under `dist/components/**` so package exports and the
  // Forge entry declarations resolve the same layout as the source barrel.
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: 'src/components/index.ts',
    dts: { build: false, generator: 'oxc' },
    clean: true,
    overrides: {
      outDir: path.resolve(import.meta.dirname, 'dist/components'),
    },
  }),
  ...defineTsdownForgeComponents({
    rootDir: rootDirectory,
    frameworks: [
      forgeReactFramework(),
      forgeSolidFramework(),
      forgeSvelteFramework(),
      forgeWebComponentsFramework(),
      forgeVueFramework(),
    ],
    componentsModule,
    name: 'MissionPlatformJsxTypography',
    declarationModule: '..',
  }),
];
