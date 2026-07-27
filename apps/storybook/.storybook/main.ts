import { ignoreVueI18nBlocksPlugin } from '@mission-platform/vite-config';
import i18nPlugin from '@mission-platform/vite-plugin-i18n';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { mergeConfig } from 'vite';

import type { StorybookConfig } from '@storybook/vue3-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/breakpoints/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/components/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/d3/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/rxjs/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/forms/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/icons/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/layout/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/map/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/qr-code/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/matrix-code/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/barcode/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/code-scanner/src/**/*.vue.stories.@(js|jsx|mjs|ts|tsx)',
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
      plugins: [i18nPlugin({ defaultLocale: 'en' }), vueJsx(), ignoreVueI18nBlocksPlugin()],
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
