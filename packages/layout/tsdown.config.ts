import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { defineTsdownForgeComponents } from '@mission-platform/vite-plugin-forge';
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
 * builds, the Storyblok CMS projection (`dist/cms/storyblok/{react,vue}/` + `components.json`),
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
    external: ['i18next'],
    declarationModule: '..',
  }),
];
