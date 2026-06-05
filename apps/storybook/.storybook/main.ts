import vueJsx from '@vitejs/plugin-vue-jsx';
import { mergeConfig } from 'vite';

import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/breakpoints/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/components/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/icons/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/map/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-docs',
  ],
  features: {
    developmentModeForBuild: false,
    sidebarOnboardingChecklist: false,
  },
  framework: '@storybook/vue3-vite',
  viteFinal: (config) =>
    mergeConfig(config, {
      plugins: [vueJsx()],
      optimizeDeps: {
        exclude: ['vue-i18n'],
      },
      build: {
        // Disable the modulePreload polyfill so Vite does not dynamically inject
        // <link rel="stylesheet"> elements for CSS chunks at runtime. Without this,
        // Chromatic's headless browser fails to preload lazily-loaded CSS chunks
        // (e.g. base-code-block-*.css from highlight.js imports) and aborts story
        // extraction with "Unable to preload CSS" errors.
        modulePreload: false,
      },
    }),
};
export default config;
