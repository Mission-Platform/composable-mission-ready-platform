import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import {
  defineTsdownForgeComponents,
  defineTsdownForgeComponentsAll,
  defineTsdownForgeStoryblokAll,
} from '@mission-platform/vite-plugin-forge';
import vueJsx from '@vitejs/plugin-vue-jsx';

import type { TsdownPlugin } from 'tsdown';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

/**
 * Neutral component tree (`dist/components/**`, including `./forge-drawer`) plus
 * the four forge framework builds (real per-framework dts via
 * `jsxComponentsDtsPlugin`) and Storyblok wrappers
 * (`dist/storyblok/{react,vue}/` + `components.json`).
 *
 * Vue needs `@vitejs/plugin-vue-jsx` because forge emits `<script setup lang="tsx">`
 * SFCs for components whose body cannot become a native `<template>`.
 *
 * Neutral `.d.ts` files are emitted by tsdown (`dts: true` → `{ build: true }`
 * against `tsconfig.build.json`) so type-only re-exports like `DrawerDraggable`
 * stay intact. `./styles` keeps pointing at `src/styles/_a11y.scss`.
 */
export default [
  defineTsdownLibrary({
    rootDir: rootDirectory,
    // Explicit `forge-drawer` entry so `./forge-drawer` resolves to a real
    // `dist/components/forge-drawer/index.js` (rolldown otherwise inlines the
    // barrel into the root components entry and omits the file).
    entry: {
      index: 'src/components/index.ts',
      'forge-drawer/index': 'src/components/organisms/forge-drawer/index.ts',
    },
    // Emit the same neutral `.d.ts` tree previously produced by
    // `tsc --emitDeclarationOnly` (via tsconfig.build.json declarationDir).
    dts: true,
    clean: true,
    overrides: {
      outDir: path.resolve(rootDirectory, 'dist/components'),
    },
  }),
  defineTsdownForgeComponents({
    rootDir: rootDirectory,
    framework: 'vue',
    componentsModule,
    name: 'MissionPlatformJsxComponents',
    overrides: {
      plugins: [vueJsx() as unknown as TsdownPlugin],
    },
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: rootDirectory,
    frameworks: ['react', 'solid', 'svelte', 'web-components'],
    componentsModule,
    name: 'MissionPlatformJsxComponents',
  }),
  ...defineTsdownForgeStoryblokAll({
    rootDir: rootDirectory,
    packageName: '@mission-platform/components',
    componentsModule,
    name: 'MissionPlatformJsxComponentsStoryblok',
  }),
];
