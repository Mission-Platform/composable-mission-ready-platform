import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeShowAt } from './forge-show-at';

/**
 * Exercises the **neutral** `ForgeShowAt` through the `@mission-platform/forge` runtime
 * adapters, where the neutral hooks render the component once in its initial
 * state (SSR baseline viewport width `0`, i.e. the `2xs` band) — no `resize`
 * listener runs. The point is cross-framework parity of that initial markup; the
 * live resize behaviour (the Vue hook shim / React hooks) is exercised by the
 * Storybook stories in a browser.
 */
const ReactShowAt = toReactComponent(ForgeShowAt, 'ForgeShowAt');
const VueShowAt = toVueComponent(ForgeShowAt, 'ForgeShowAt');

const MARKER = 'slot-marker';

async function renderBoth(properties: { min?: string; max?: string }): Promise<[string, string]> {
  const react = renderToStaticMarkup(createElement(ReactShowAt, properties, MARKER));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VueShowAt, properties, () => MARKER) }));
  return [react, vue];
}

describe('ForgeShowAt authors the same component for React and Vue', () => {
  it('renders slot content when no bounds are provided on both frameworks', async () => {
    for (const html of await renderBoth({})) {
      expect(html).toContain(MARKER);
    }
  });

  it('hides slot content below the min breakpoint on both frameworks', async () => {
    for (const html of await renderBoth({ min: 'lg' })) {
      expect(html).not.toContain(MARKER);
    }
  });

  it('renders slot content below the max breakpoint on both frameworks', async () => {
    for (const html of await renderBoth({ max: 'lg' })) {
      expect(html).toContain(MARKER);
    }
  });
});
