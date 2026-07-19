import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import 'maplibre-gl/dist/maplibre-gl.css';
import './preview.scss';

import { withThemeByDataAttribute } from '@storybook/addon-themes';

import type { Preview, ReactRenderer } from '@storybook/react-vite';
import type { ViewportMap } from 'storybook/viewport';

// Mission Platform responsive breakpoints (min-width thresholds, in px).
// Mirrors `@mission-platform/breakpoints` — inlined here so this React app does
// not pull in the Vue-only breakpoints package.
const breakpointKeys = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
const breakpoints: Record<(typeof breakpointKeys)[number], number> = {
  '2xs': 0,
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1280,
  xl: 1920,
  '2xl': 3840,
};

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

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute<ReactRenderer>({
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
