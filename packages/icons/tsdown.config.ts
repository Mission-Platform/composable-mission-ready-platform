import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

/**
 * Neutral component declarations (`dist/components/**`) plus the five forge
 * framework builds (`dist/{vue,react,solid,svelte,web-components}/`). Matches the
 * prior Vite wiring: `generateFrameworkSources` + synthesised entry dts
 * (`declarationModule: '../components'`).
 */
export default [
  // Emit the neutral tree under `dist/components/**` so package exports and the
  // forge entry dts (`declarationModule: '../components'`) resolve the same
  // layout as the prior `tsc --emitDeclarationOnly` output.
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: 'src/components/index.ts',
    clean: true,
    overrides: {
      outDir: path.resolve(import.meta.dirname, 'dist/components'),
    },
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: import.meta.dirname,
    frameworks: ['vue', 'react', 'solid', 'svelte', 'web-components'],
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformIconsJsx',
    declarationModule: '../components',
  }),
];
