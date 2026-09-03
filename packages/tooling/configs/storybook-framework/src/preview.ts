// import { breakpointKeys, breakpoints } from '@mission-platform/breakpoints/core';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

import type { Renderer } from 'storybook/internal/types';
// import type { ViewportMap } from 'storybook/viewport';
//
// function getViewportType(width: number): 'mobile' | 'tablet' | 'desktop' {
//   if (width < 768) return 'mobile';
//   if (width < 1024) return 'tablet';
//   return 'desktop';
// }

/** Framework ids accepted by {@link sharedPreviewParametersFor}. */
type PreviewFramework = 'vue' | 'react' | 'solid' | 'svelte' | 'web-component';

/**
 * Storybook viewports built from Mission Platform breakpoints.
 */
// export const mpViewports: ViewportMap = Object.fromEntries(
//   breakpointKeys.map((key) => {
//     const width = breakpoints[key] === 0 ? 320 : breakpoints[key];
//     return [
//       key,
//       {
//         name: `${key} (≥ ${breakpoints[key]}px)`,
//         styles: { width: `${width}px`, height: '100%' },
//         type: getViewportType(width),
//       },
//     ];
//   }),
// );

/**
 * Shared Storybook parameters for all frameworks.
 */
export const sharedPreviewParameters = {
  // viewport: {
  //   options: mpViewports,
  // },
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
 * Framework-aware Storybook parameters.
 *
 * For Svelte, force static docs source. `@storybook/svelte`'s docs
 * `sourceDecorator` re-invokes `context.originalStoryFn` inside a `useEffect`
 * to generate dynamic source. That second call is outside the hooks context, so
 * CSF `render` functions that call `useArgs()` throw:
 * "Storybook preview hooks can only be called inside decorators and story functions".
 *
 * Setting `docs.source.type = 'code'` makes `skipSourceRender` return true and
 * avoids the out-of-context re-invoke. CSF still exposes `originalSource` for the
 * source panel.
 */
export function sharedPreviewParametersFor(framework?: PreviewFramework) {
  if (framework !== 'svelte') {
    return sharedPreviewParameters;
  }

  return {
    ...sharedPreviewParameters,
    docs: {
      source: {
        type: 'code' as const,
      },
    },
  };
}

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
