import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseTooltip } from './base-tooltip';

/**
 * Exercises the **neutral** `BaseTooltip` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters. The
 * hint is portalled through the neutral `<Teleport>` primitive and gated on the
 * internal hover/focus visibility, so it is closed (and therefore absent from
 * the markup) on the server render; the presentation wrapper and the
 * trigger-anchored default slot must match across React and Vue.
 */
const ReactTooltip = toReactComponent(BaseTooltip, 'Tooltip');
const VueTooltip = toVueComponent(BaseTooltip, 'Tooltip');

describe('BaseTooltip authors the same component for React and Vue', () => {
  it('renders the presentation wrapper and trigger-anchored slot, with the hint closed, on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactTooltip, { content: 'Save changes' }, createElement('button', undefined, 'Trigger')),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueTooltip, { content: 'Save changes' }, () => vueH('button', undefined, 'Trigger')),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('role="presentation"');
      expect(html).toContain('<button>Trigger</button>');
      // The trigger declares the CSS anchor the teleported hint tethers to.
      expect(html).toContain('anchor-name:');
      // The hint is teleported and gated on the internal visibility, so it is
      // closed (and absent from the markup) until hover/focus opens it.
      expect(html).not.toContain('role="tooltip"');
      expect(html).not.toContain('Save changes');
    }
  });
});
