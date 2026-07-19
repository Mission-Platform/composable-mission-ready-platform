import { mergeConfig } from 'vite';

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/breakpoints/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/components/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/d3/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/rxjs/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/forms/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/icons/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/layout/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/map/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/qr-code/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/matrix-code/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/barcode/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../packages/code-scanner/src/**/*.react.stories.@(js|jsx|mjs|ts|tsx)',
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
  framework: '@storybook/react-vite',
  core: {
    disableTelemetry: true,
    enableCrashReports: false,
  },
  viteFinal: (config) =>
    mergeConfig(config, {
      build: {
        // Disable CSS code splitting so component module styles are inlined into
        // their JS chunks rather than emitted as separate CSS files. Without
        // this, Chromatic's headless browser fails to preload lazily-loaded CSS
        // chunks and aborts story extraction with "Unable to preload CSS" errors.
        cssCodeSplit: false,
      },
    }),
};
export default config;
