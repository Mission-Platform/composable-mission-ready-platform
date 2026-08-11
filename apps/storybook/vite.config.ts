/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineFrameworkAppConfig } from '@mission-platform/vite-config';
import { tokenOverridesPlugin } from '@mission-platform/vite-plugin-token-overrides';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { playwright } from '@vitest/browser-playwright';
import svgLoader from 'vite-svg-loader';

const dirname = typeof __dirname === 'undefined' ? path.dirname(fileURLToPath(import.meta.url)) : __dirname;

export default defineFrameworkAppConfig({
  // The app shell (`src/app.vue`) and the co-located `*.vue.stories.tsx` are Vue,
  // so bare `@mission-platform/*` imports must resolve through the `mp:vue`
  // export condition to each package's Vue build. The Storybook builder applies
  // the condition for the framework selected by `STORYBOOK_FRAMEWORK` itself
  // (see `@mission-platform/storybook-framework`); this config governs the plain
  // `vite build`/`vitest` runs of the shell.
  framework: 'vue',
  overrides: {
    optimizeDeps: {
      include: ['storybook/test'],
    },
    plugins: [
      tokenOverridesPlugin({ source: 'design-tokens/overrides.tokens.json' }),
      vueJsx(),
      svgLoader({
        svgo: true,
        defaultImport: 'component',
        svgoConfig: { multipass: true, datauri: 'unenc' },
      }),
    ],
    test: {
      projects: [
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, '.storybook'),
            }),
          ],
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({ persistentContext: false }),
              instances: [{ browser: 'chromium' } /*{ browser: 'firefox' }, { browser: 'webkit' }*/],
            },
          },
        },
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/*.test.ts'],
          },
        },
      ],
    },
  },
});
