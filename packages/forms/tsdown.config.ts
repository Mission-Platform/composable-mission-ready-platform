import fs from 'node:fs';
import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import {
  defineTsdownForgeComponents,
  defineTsdownForgeComponentsAll,
  defineTsdownForgeStoryblokAll,
} from '@mission-platform/vite-plugin-forge';
import vueJsx from '@vitejs/plugin-vue-jsx';

import type { TsdownPlugin, UserConfig } from 'tsdown';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');
const webComponentsCacheDirectory = path.join(rootDirectory, 'node_modules/.cache/forms-web-components');

/**
 * Collapse duplicate keys inside a `static properties = { … }` object literal.
 * Last write wins (JS runtime behaviour).
 */
function dedupeStaticPropertiesBlock(source: string): string {
  return source.replaceAll(/static properties = \{([\s\S]*?)\n {2}\};/g, (_match, body: string) => {
    const entries = new Map<string, string>();
    for (const entry of body.matchAll(/([A-Za-z_]\w*)\s*:\s*(\{[^}]*\})\s*,?/g)) {
      entries.set(entry[1], `${entry[1]}: ${entry[2]}`);
    }
    const rendered = [...entries.values()].map((line) => `    ${line},`).join('\n');
    return `static properties = {\n${rendered}\n  };`;
  });
}

/**
 * Dedupe Lit class field declarations emitted when a prop name collides with a
 * `useState` binding (e.g. `title: any;` then later `title: any = …;`).
 * Prefers the initialised form when both exist. Handles multi-line initialisers
 * such as eslint-disabled `undefined` assignments.
 */
function dedupeClassFieldsInLitElement(source: string): string {
  const classPattern = /(export class \w+ extends LitElement \{\n)([\s\S]*?)(\n {2}render\s*\()/;
  const match = classPattern.exec(source);
  if (!match) {
    return source;
  }

  const [, classHeader, classBody, renderHeader] = match;
  const staticMatch = /static properties = \{[\s\S]*?\n {2}\};\n?/.exec(classBody);
  if (!staticMatch || staticMatch.index === undefined) {
    return source;
  }

  const beforeStatic = classBody.slice(0, staticMatch.index);
  const staticBlock = dedupeStaticPropertiesBlock(staticMatch[0]);
  const afterStatic = classBody.slice(staticMatch.index + staticMatch[0].length);

  const lines = afterStatic.split(/(?<=\n)/);
  const fields = new Map<string, { text: string; hasInitializer: boolean; order: number }>();
  const remainder: string[] = [];
  let order = 0;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    // Lines keep their trailing `\n` from the split, so `$` needs the `m` flag
    // (end-of-line) rather than end-of-string.
    const fieldStart = /^(?<indent>[ \t]*)(?<name>[A-Za-z_]\w*)\s*:\s*any(?<rest>.*)$/m.exec(line);
    if (!fieldStart) {
      remainder.push(line);
      index += 1;
      continue;
    }

    let chunk = line;
    let cursor = index;
    while (!chunk.includes(';') && cursor + 1 < lines.length) {
      cursor += 1;
      chunk += lines[cursor];
    }
    if (!chunk.endsWith('\n')) {
      chunk += '\n';
    }

    const name = fieldStart.groups?.name ?? fieldStart[2];
    const hasInitializer = /:\s*any\s*=/.test(chunk);
    const existing = fields.get(name);
    if (!existing) {
      fields.set(name, { text: chunk, hasInitializer, order });
      order += 1;
    } else if (hasInitializer && !existing.hasInitializer) {
      fields.set(name, { text: chunk, hasInitializer, order: existing.order });
    }

    index = cursor + 1;
  }

  const dedupedFields = [...fields.values()]
    .toSorted((left, right) => left.order - right.order)
    .map((entry) => entry.text)
    .join('');

  const nextBody = `${beforeStatic}${staticBlock}${staticBlock.endsWith('\n') ? '' : '\n'}${dedupedFields}${remainder.join('')}`;
  return `${source.slice(0, match.index)}${classHeader}${nextBody}${renderHeader}${source.slice(match.index + match[0].length)}`;
}

/**
 * Rewrite forge-generated Lit sources in the web-components cache so Rolldown
 * can parse them. Must run after `defineTsdownForgeComponents` (which regenerates
 * the cache at config-load time) and before the bundler reads the files.
 *
 * Forge emits duplicate class fields when a prop name collides with `useState`
 * (e.g. `title`/`description` on FormBuilder). Vite/esbuild accepted that;
 * Rolldown rejects it as a parse error. Fix lives here — not in vite-plugins/forge.
 */
function patchWebComponentsCache(cacheDirectory: string): void {
  if (!fs.existsSync(cacheDirectory)) {
    return;
  }

  for (const entry of fs.readdirSync(cacheDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) {
      continue;
    }
    const filePath = path.join(cacheDirectory, entry.name);
    const source = fs.readFileSync(filePath, 'utf8');
    if (!source.includes('extends LitElement')) {
      continue;
    }
    const next = dedupeClassFieldsInLitElement(source);
    if (next !== source) {
      fs.writeFileSync(filePath, next, 'utf8');
    }
  }
}

/**
 * Neutral component declarations (`dist/components/**`) plus the five forge
 * framework builds and Storyblok wrappers. Framework builds use synthesised
 * entry dts (`declarationModule: '../components'`), matching the prior Vite
 * wiring. `./styles` keeps pointing at `src/styles/a11y.scss`.
 *
 * Vue needs `@vitejs/plugin-vue-jsx` because forge emits `<script setup lang="tsx">`
 * SFCs for components whose body cannot become a native `<template>` — without it
 * Rolldown leaves `react/jsx-runtime` imports in the Vue build.
 *
 * `web-components` is built here via tsdown. The forge generator can emit
 * duplicate Lit class fields when a prop name collides with `useState`; those
 * cache sources are patched in-config (see {@link patchWebComponentsCache}) and
 * the transform target is lowered so Rolldown accepts them without changing the
 * forge plugin.
 *
 * Neutral `.d.ts` files are emitted by tsdown (`dts: true` → `{ build: true }`
 * against `tsconfig.build.json`).
 */
const webComponentsConfig: UserConfig = defineTsdownForgeComponents({
  rootDir: rootDirectory,
  framework: 'web-components',
  componentsModule,
  name: 'MissionPlatformJsxForms',
  declarationModule: '../components',
  overrides: {
    inputOptions: {
      transform: {
        // Down-level class-field syntax toward ES2021 semantics
        // (`useDefineForClassFields: false`-like emit).
        target: 'es2021',
      },
    },
  },
});

// `defineTsdownForgeComponents` regenerates the cache synchronously while
// building the config above — patch duplicates before tsdown starts bundling.
patchWebComponentsCache(webComponentsCacheDirectory);

export default [
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: 'src/components/index.ts',
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
    name: 'MissionPlatformJsxForms',
    declarationModule: '../components',
    overrides: {
      plugins: [vueJsx() as unknown as TsdownPlugin],
    },
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: rootDirectory,
    frameworks: ['react', 'solid', 'svelte'],
    componentsModule,
    name: 'MissionPlatformJsxForms',
    declarationModule: '../components',
  }),
  webComponentsConfig,
  ...defineTsdownForgeStoryblokAll({
    rootDir: rootDirectory,
    packageName: '@mission-platform/forms',
    componentsModule,
    name: 'MissionPlatformJsxFormsStoryblok',
  }),
];
