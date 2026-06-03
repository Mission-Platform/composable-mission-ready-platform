import { mergeConfig } from 'vite'
import vueJsx from '@vitejs/plugin-vue-jsx'

import type { StorybookConfig } from '@storybook/vue3-vite'

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
    developmentModeForBuild: true,
  },
  framework: '@storybook/vue3-vite',
  viteFinal: (config) =>
    mergeConfig(config, {
      plugins: [vueJsx()],
      optimizeDeps: {
        exclude: ['vue-i18n'],
      },
    }),
}
export default config
