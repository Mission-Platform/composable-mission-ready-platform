import path from 'node:path';
import { fileURLToPath } from 'node:url';

import i18nPlugin from '@mission-platform/vite-plugin-i18n';
import { mergeConfig } from 'vite';

import type { StorybookConfig } from '@storybook/react-vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

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
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      compilerOptions: {
        allowSyntheticDefaultImports: false,
        esModuleInterop: false,
      },
      propFilter: (property) => (property.parent ? !/node_modules/.test(property.parent.fileName) : true),
    },
  },
  framework: '@storybook/react-vite',
  core: {
    disableTelemetry: true,
    enableCrashReports: false,
  },
  viteFinal: (config) =>
    mergeConfig(config, {
      cacheDir: 'node_modules/.vite-storybook-react',
      plugins: [i18nPlugin({ defaultLocale: 'en' })],
      resolve: {
        alias: [
          {
            find: '@mission-platform/components/react',
            replacement: path.join(dirname, '../../../packages/components/dist/react/index.js'),
          },
          {
            find: '@mission-platform/code-scanner/react',
            replacement: path.join(dirname, '../../../packages/code-scanner/dist/react/index.js'),
          },
          {
            find: '@mission-platform/breakpoints/react',
            replacement: path.join(dirname, '../../../packages/breakpoints/dist/react/index.js'),
          },
          {
            find: '@mission-platform/breakpoints',
            replacement: path.join(dirname, '../../../packages/breakpoints/dist/react/index.js'),
          },
          {
            find: /^react(\/.*)?$/,
            replacement: `${path.join(dirname, '../node_modules/react')}$1`,
          },
        ],
      },
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
