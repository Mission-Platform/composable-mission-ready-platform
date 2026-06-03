import '@mission-platform/tokens/scss/tokens'
import '@mission-platform/tokens/scss/themes/light'
import '@mission-platform/tokens/scss/themes/dark'
import '@mission-platform/components/styles'
import 'maplibre-gl/dist/maplibre-gl.css'
import './preview.scss'

import { breakpointKeys, breakpoints } from '@mission-platform/breakpoints'
import { locales as uiLocales } from '@mission-platform/components/locales'
import { createMpI18n } from '@mission-platform/i18n'
import { withThemeByDataAttribute } from '@storybook/addon-themes'
import { setup } from '@storybook/vue3-vite'
import { createRouter, createMemoryHistory } from 'vue-router'

import type { Preview, VueRenderer } from '@storybook/vue3-vite'
import type { ViewportMap } from 'storybook/viewport'

// Build Storybook viewports from Mission Platform breakpoints.
// Each breakpoint becomes a named viewport at its min-width threshold.
// '2xs' (0 px) is treated as a 320 px mobile baseline for preview purposes.
const mpViewports: ViewportMap = Object.fromEntries(
  breakpointKeys.map((key) => {
    const width = breakpoints[key] === 0 ? 320 : breakpoints[key]
    return [
      key,
      {
        name: `${key} (≥ ${breakpoints[key]}px)`,
        styles: { width: `${width}px`, height: '100%' },
        type: width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop',
      },
    ]
  }),
)

// Install vue-i18n and vue-router globally for all stories.
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

setup((app) => {
  app.use(createMpI18n({ modules: [uiLocales] }))
  app.use(router)
})

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute<VueRenderer>({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],

  initialGlobals: {
    theme: 'light',
  },

  parameters: {
    viewport: {
      options: mpViewports,
      defaultViewport: 'md',
    },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' – surface violations in the test panel without failing CI
      // 'error' – fail CI on violations
      // 'off'   – disable entirely
      test: 'error',
    },
  },
}

export default preview
