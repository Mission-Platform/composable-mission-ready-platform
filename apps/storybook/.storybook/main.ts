import { ignoreVueI18nBlocksPlugin } from '@mission-platform/vite-config';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { mergeConfig } from 'vite';

import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/breakpoints/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/components/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/forms/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/icons/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/layout/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
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
  core: {
    disableTelemetry: true,
    enableCrashReports: false,
  },
  viteFinal: (config) =>
    mergeConfig(config, {
      plugins: [vueJsx(), ignoreVueI18nBlocksPlugin()],
      optimizeDeps: {
        exclude: ['i18next-vue'],
      },
      build: {
        // Disable CSS code splitting so highlight.js and other component styles
        // are inlined into their JS chunks rather than emitted as separate CSS
        // files. Without this, Chromatic's headless browser fails to preload
        // lazily-loaded CSS chunks (e.g. base-code-block-*.css) and aborts
        // story extraction with "Unable to preload CSS" errors.
        cssCodeSplit: false,
      },
    }),
};
export default config;
