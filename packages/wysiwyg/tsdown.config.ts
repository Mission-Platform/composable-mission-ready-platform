import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponents, defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';
import vueJsx from '@vitejs/plugin-vue-jsx';

import type { TsdownPlugin } from 'tsdown';

/**
 * Neutral component declarations (`dist/components/**`) plus the two forge
 * component framework builds (`dist/{react,vue}/`). Matches the prior Vite
 * wiring: `generateFrameworkSources` + per-framework dts via
 * `jsxComponentsDtsPlugin` (no Storyblok).
 *
 * Vue needs `@vitejs/plugin-vue-jsx` because the editor SFC is emitted as
 * `<script setup lang="tsx">`.
 */
export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: 'src/components/index.ts',
    clean: true,
    overrides: {
      outDir: path.resolve(import.meta.dirname, 'dist/components'),
    },
  }),
  defineTsdownForgeComponents({
    rootDir: import.meta.dirname,
    framework: 'vue',
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformWysiwyg',
    overrides: {
      plugins: [vueJsx() as unknown as TsdownPlugin],
    },
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: import.meta.dirname,
    frameworks: ['react'],
    componentsModule: path.resolve(import.meta.dirname, 'src/components/index.ts'),
    name: 'MissionPlatformWysiwyg',
  }),
];
