import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

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
  ...defineTsdownForgeComponentsAll({
    rootDir: import.meta.dirname,
    frameworks: ['react', 'vue'],
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformThree',
    declarationModule: '..',
    external: ['three'],
  }),
];
