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

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

/**
 * Neutral component tree (`dist/components/**`, including `./forge-drawer`) plus
 * the five forge framework builds (real per-framework dts via
 * `jsxComponentsDtsPlugin`) and the Storyblok CMS projection
 * (`dist/cms/storyblok/{react,vue}/` + `dist/cms/storyblok/components.json`).
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
      index: 'src/index.ts',
    },
    // Emit the same neutral `.d.ts` tree previously produced by
    // `tsc --emitDeclarationOnly` (via tsconfig.build.json declarationDir).
    dts: true,
    clean: true,
    overrides: {
      outDir: path.resolve(rootDirectory, 'dist/components'),
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
    name: 'MissionPlatformJsxComponents',
    external: ['i18next'],
    declarationModule: '..',
  }),
  ...defineTsdownForgeCmsAll({
    rootDir: rootDirectory,
    targets: forgeStoryblokCmsTargets({
      packageName: '@mission-platform/components',
      frameworks: [
        forgeReactFramework(),
        forgeVueFramework(),
        forgeSvelteFramework(),
        forgeSolidFramework(),
        forgeWebComponentsFramework(),
      ],
    }),
    componentsModule,
  }),
];
