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

// Runtime peers stay external; `geojson` is the import path used in source
// (types come from `@types/geojson`) and must stay external so dts does not
// rewrite it to a nested `node_modules` path inside `dist/`.
const mapExternals = ['maplibre-gl', '@turf/turf', '@types/geojson', 'geojson'] as const;

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

/**
 * Neutral types/entry (`dist/components/…`, `dist/index.d.ts`, …) plus the five
 * forge component framework builds (`dist/{vue,react,solid,svelte,web-components}/`).
 * MapLibre / Turf stay external (peer/runtime deps).
 */
export default [
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: 'src/index.ts',
    clean: true,
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
    name: 'MissionPlatformJsxLayouts',
    external: ['i18next', ...mapExternals],
  }),
  ...defineTsdownForgeCmsAll({
    rootDir: rootDirectory,
    componentsModule,
    targets: forgeStoryblokCmsTargets({
      packageName: '@mission-platform/map',
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
