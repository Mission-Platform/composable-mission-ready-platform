import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { HideAt } from './hide-at';

/**
 * Exercises the **neutral** `HideAt` through the `@mission-platform/jsx` runtime
 * adapters at the SSR baseline viewport width `0` (the `2xs` band). Asserts
 * cross-framework parity of the initial markup; the live resize behaviour is
 * covered by the Storybook stories.
 */
const ReactHideAt = toReactComponent(HideAt, 'HideAt');
const VueHideAt = toVueComponent(HideAt, 'HideAt');

const MARKER = 'slot-marker';

async function renderBoth(properties: { min?: string; max?: string }): Promise<[string, string]> {
  const react = renderToStaticMarkup(createElement(ReactHideAt, properties, MARKER));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VueHideAt, properties, () => MARKER) }));
  return [react, vue];
}

describe('HideAt authors the same component for React and Vue', () => {
  it('hides slot content when no bounds are provided on both frameworks', async () => {
    for (const html of await renderBoth({})) {
      expect(html).not.toContain(MARKER);
    }
  });

  it('shows slot content below the min breakpoint on both frameworks', async () => {
    for (const html of await renderBoth({ min: 'lg' })) {
      expect(html).toContain(MARKER);
    }
  });

  it('hides slot content below the max breakpoint on both frameworks', async () => {
    for (const html of await renderBoth({ max: 'lg' })) {
      expect(html).not.toContain(MARKER);
    }
  });
});
