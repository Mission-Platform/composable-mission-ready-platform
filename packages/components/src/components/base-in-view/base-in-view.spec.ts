import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseInView } from './base-in-view';

/**
 * Exercises the **neutral** `BaseInView` through the `@mission-platform/jsx`
 * runtime adapters, where the neutral hooks render the component once in its
 * initial (pre-reveal) state — no `IntersectionObserver` runs during SSR. The
 * point is cross-framework parity of that initial markup; the live reveal
 * behaviour (the Vue hook shim / React hooks) is exercised by the Storybook
 * stories in a browser.
 */
const ReactInView = toReactComponent(BaseInView, 'InView');
const VueInView = toVueComponent(BaseInView, 'InView');

describe('BaseInView authors the same component for React and Vue', () => {
  it('renders the wrapper with its pre-reveal style on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactInView, { animation: 'fade' }, 'Reveal me'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueInView, { animation: 'fade' }, () => 'Reveal me') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('in-view');
      // Pre-reveal (state is initial `false` during SSR) → opacity 0.
      expect(html).toContain('opacity');
      expect(html).toContain('Reveal me');
    }
  });
});
