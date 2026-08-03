import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { IconAlert, IconArrow, IconDrawCircle, IconHeadingOne, IconSort } from '.';

import type { MpComponent } from '@mission-platform/forge';

/**
 * Smoke-tests a representative slice of the generated icon set, rendering each
 * neutral icon on **both** frameworks through the `@mission-platform/forge`
 * runtime adapters. Covers a plain stroke icon, an embedded `<text>` glyph, a
 * `fill={color}` child, the rotating `direction` prop, and the conditional
 * per-path fills — i.e. every distinct shape the generator emits.
 */
async function renderBoth(component: MpComponent, properties: Record<string, unknown> = {}): Promise<string[]> {
  const react = renderToStaticMarkup(createElement(toReactComponent(component, 'Icon'), properties));
  const vue = await renderToString(createSSRApp({ render: () => vueH(toVueComponent(component, 'Icon'), properties) }));
  return [react, vue];
}

describe('generated icons author the same component for React and Vue', () => {
  it('renders a plain stroke icon with its BEM wrapper and a 24×24 viewBox', async () => {
    for (const html of await renderBoth(IconAlert)) {
      expect(html).toContain('base-icon-alert');
      expect(html).toContain('role="img"');
      expect(html).toContain('viewBox="0 0 24 24"');
      expect(html).toContain('aria-label="Alert"');
    }
  });

  it('embeds the heading glyph as an SVG <text> node on both frameworks', async () => {
    for (const html of await renderBoth(IconHeadingOne)) {
      expect(html).toContain('<text');
      expect(html).toContain('>1</text>');
      expect(html).toContain('aria-label="Heading 1"');
    }
  });

  it('paints the filled marker child with the resolved colour on both frameworks', async () => {
    for (const html of await renderBoth(IconDrawCircle, { color: 'red' })) {
      expect(html).toContain('base-icon-draw-circle');
      expect(html).toContain('fill="red"');
    }
  });

  it('rotates the arrow according to its direction prop on both frameworks', async () => {
    for (const html of await renderBoth(IconArrow, { direction: 'right' })) {
      expect(html).toContain('rotate(90deg)');
      expect(html).toContain('aria-label="Arrow right"');
    }
  });

  it('fills only the active sort chevron on both frameworks', async () => {
    for (const html of await renderBoth(IconSort, { active: true, direction: 'asc', color: 'blue' })) {
      // The ascending chevron is filled; the descending one stays hollow.
      expect(html).toContain('fill="blue"');
      expect(html).toContain('fill="none"');
    }
  });
});
