import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponentsAll, defineTsdownForgeStoryblokAll } from '@mission-platform/vite-plugin-forge';
import * as sass from 'sass-embedded';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');
const packageRequire = createRequire(path.join(rootDirectory, 'package.json'));

/**
 * Compile the package-level a11y SCSS entry to `dist/styles/a11y.css` so the
 * `./styles` export path keeps working under tsdown. Resolves workspace package
 * imports (e.g. `@mission-platform/tokens/scss/a11y`) via Node package exports.
 */
function emitA11yStyles(): void {
  const source = path.resolve(rootDirectory, 'src/styles/a11y.scss');
  const outFile = path.resolve(rootDirectory, 'dist/styles/a11y.css');
  const result = sass.compile(source, {
    style: 'expanded',
    importers: [
      {
        findFileUrl(url: string) {
          try {
            return pathToFileURL(packageRequire.resolve(url));
          } catch {
            return;
          }
        },
      },
    ],
  });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, result.css, 'utf8');
}

/**
 * Neutral component tree (`dist/components/**`) plus the five forge framework
 * builds, Storyblok wrappers (`dist/storyblok/{react,vue}/` + `components.json`),
 * and the compiled `./styles` CSS entry. Framework builds use synthesised entry
 * dts (`declarationModule: '../components'`), matching the prior Vite wiring.
 */
export default [
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: 'src/components/index.ts',
    clean: true,
    overrides: {
      outDir: path.resolve(rootDirectory, 'dist/components'),
      hooks: {
        'build:done': () => {
          emitA11yStyles();
        },
      },
    },
  }),
  ...defineTsdownForgeComponentsAll({
    rootDir: rootDirectory,
    frameworks: ['vue', 'react', 'solid', 'svelte', 'web-components'],
    componentsModule,
    name: 'MissionPlatformJsxLayouts',
    declarationModule: '../components',
  }),
  ...defineTsdownForgeStoryblokAll({
    rootDir: rootDirectory,
    packageName: '@mission-platform/layouts',
    componentsModule,
    name: 'MissionPlatformJsxLayoutsStoryblok',
  }),
];
