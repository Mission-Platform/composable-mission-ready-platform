import { breakpointKeys, breakpoints } from '@mission-platform/breakpoints/core';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

import type { Renderer } from 'storybook/internal/types';
import type { ViewportMap } from 'storybook/viewport';

function getViewportType(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Storybook viewports built from Mission Platform breakpoints.
 */
export const mpViewports: ViewportMap = Object.fromEntries(
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

/**
 * Shared Storybook parameters for all frameworks.
 */
export const sharedPreviewParameters = {
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
    test: 'error' as const,
  },
};

/**
 * Shared Storybook decorators for all frameworks.
 */
export function sharedPreviewDecorators<TRenderer extends Renderer>() {
  return [
    withThemeByDataAttribute<TRenderer>({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ];
}
