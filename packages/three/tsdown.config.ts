import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponents } from '@mission-platform/vite-plugin-forge';

/**
 * Neutral types/entry (`dist/index.d.ts`, …) plus the two forge component
 * framework builds (`dist/{react,vue}/`). Matches the prior Vite wiring:
 * `generateFrameworkSources` over `src/index.ts` + entry dts
 * (`declarationModule: '..'`), with `three` kept external.
 */
export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    clean: true,
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
    name: 'MissionPlatformThree',
    // Encoder is consumed through the package's own `.` entry.
    external: ['i18next'],
  }),
];
