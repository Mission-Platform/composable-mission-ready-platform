/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveStorybookFramework } from '@mission-platform/storybook-framework';
import { defineFrameworkAppConfig } from '@mission-platform/vite-config';
import { tokenOverridesPlugin } from '@mission-platform/vite-plugin-token-overrides';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { playwright } from '@vitest/browser-playwright';
import svgLoader from 'vite-svg-loader';

const dirname = typeof __dirname === 'undefined' ? path.dirname(fileURLToPath(import.meta.url)) : __dirname;
const framework = resolveStorybookFramework();

export default defineFrameworkAppConfig({
  // Resolve the same framework as the Storybook renderer so plain Vite/Vitest
  // runs of the shell use the matching `mp:<framework>` package condition too.
  framework,
  overrides: {
    optimizeDeps: {
      include: ['storybook/test'],
    },
    plugins: [
      tokenOverridesPlugin({ source: 'design-tokens/overrides.tokens.json' }),
      ...(framework === 'vue' ? [vueJsx()] : []),
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
