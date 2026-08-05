import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

/**
 * Neutral types/entry (`dist/index.d.ts`, `dist/breakpoints.d.ts`, …) plus the
 * two forge component framework builds (`dist/{react,vue}/`). Matches the prior
 * Vite wiring: `generateFrameworkSources` + entry dts (`declarationModule: '..'`).
 */
export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    clean: true,
    external: ['i18next'],
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: import.meta.dirname,
    frameworks: ['react', 'vue'],
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformBreakpoints',
    declarationModule: '..',
    external: ['i18next'],
  }),
];
