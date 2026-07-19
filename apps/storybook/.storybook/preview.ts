import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';
import 'maplibre-gl/dist/maplibre-gl.css';
import './preview.scss';

import { breakpointKeys, breakpoints } from '@mission-platform/breakpoints';
import { createMpI18n, localeNamespaces, mpNamespace } from '@mission-platform/i18n';
import { createMpI18nVue } from '@mission-platform/i18n/vue';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { setup } from '@storybook/vue3-vite';
import yaml from 'js-yaml';
import { createMemoryHistory, createRouter } from 'vue-router';

import enLocaleSource from '../src/locales/en.yaml?raw';

import type { MpMessageObject } from '@mission-platform/i18n';
import type { Preview, VueRenderer } from '@storybook/vue3-vite';
import type { ViewportMap } from 'storybook/viewport';

// English source strings extracted from every component's <i18n> block, grouped
// by `mp.<workspace>` namespace and loaded once so all stories resolve
// translations against a single i18next instance. Storybook owns the
// `mp.storybook` namespace; package strings (e.g. `mp.breakpoints`) come from
// the dependency packages whose components are catalogued here.
const enBundles = (yaml.load(enLocaleSource) ?? {}) as Record<string, MpMessageObject>;

function getViewportType(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Build Storybook viewports from Mission Platform breakpoints.
// Each breakpoint becomes a named viewport at its min-width threshold.
// '2xs' (0 px) is treated as a 320 px mobile baseline for preview purposes.
const mpViewports: ViewportMap = Object.fromEntries(
  breakpointKeys.map((key) => {
    const width = breakpoints[key] === 0 ? 320 : breakpoints[key];
    return [
      key,
      {
        name: `${key} (≥ ${breakpoints[key]}px)`,
        styles: { width: `${width}px`, height: '100%' },
        type: getViewportType(width),
      },
    ];
  }),
);

// Install i18next (via i18next-vue) and vue-router globally for all stories.
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
});

setup((app) => {
  app.use(
    createMpI18nVue(
      createMpI18n({
        namespace: mpNamespace('storybook'),
        namespaces: localeNamespaces('en', enBundles),
      }),
    ),
  );
  app.use(router);
});

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
    viewport: { value: 'md', isRotated: false },
  },

  parameters: {
    viewport: {
      options: mpViewports,
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
};

export default preview;
