import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

// Runtime peers stay external; `geojson` is the import path used in source
// (types come from `@types/geojson`) and must stay external so dts does not
// rewrite it to a nested `node_modules` path inside `dist/`.
const mapExternals = ['maplibre-gl', '@turf/turf', '@types/geojson', 'geojson'] as const;

/**
 * Neutral types/entry (`dist/components/…`, `dist/index.d.ts`, …) plus the five
 * forge component framework builds (`dist/{vue,react,solid,svelte,web-components}/`).
 * MapLibre / Turf stay external (peer/runtime deps).
 */
export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    clean: true,
    external: [...mapExternals],
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: import.meta.dirname,
    frameworks: ['vue', 'react', 'solid', 'svelte', 'web-components'],
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformJsxMap',
    external: [...mapExternals],
  }),
];
