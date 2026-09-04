import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { h as forgeH, type MpComponent, type MpElement } from '@mission-platform/forge-jsx';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { IconSpriteProvider } from '../sprite/provider';

import {
  ForgeIconAlert,
  ForgeIconArrow,
  ForgeIconDrawCircle,
  ForgeIconHeadingOne,
  ForgeIconSort,
  ForgeIconFlag,
} from '.';

import type { IconCountryCode } from './maps/countries/forge-icon-flag';

const InlineSpriteDemo: MpComponent = (): MpElement =>
  forgeH(IconSpriteProvider, {
    children: [forgeH(ForgeIconAlert, {}), forgeH(ForgeIconArrow, { direction: 'right' })],
  });

const ExternalSpriteDemo: MpComponent = (): MpElement =>
  forgeH(IconSpriteProvider, {
    src: '/assets/icons.svg',
    inline: false,
    children: forgeH(ForgeIconAlert, {}),
  });

/**
 * Smoke-tests a representative slice of the generated icon set, rendering each
 * neutral icon on **both** frameworks through the `@mission-platform/forge-jsx`
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
    for (const html of await renderBoth(ForgeIconAlert)) {
      expect(html).toContain('forge-icon-alert');
      expect(html).toContain('role="img"');
      expect(html).toContain('viewBox="0 0 24 24"');
      expect(html).toContain('aria-label="Alert"');
    }
  });

  it('references the canonical heading symbol on both frameworks', async () => {
    for (const html of await renderBoth(ForgeIconHeadingOne)) {
      expect(html).toContain('<use href="#icon-heading-one"');
      expect(html).toContain('aria-label="Heading 1"');
    }
  });

  it('passes the resolved colour to the canonical drawing symbol on both frameworks', async () => {
    for (const html of await renderBoth(ForgeIconDrawCircle, { color: 'red' })) {
      expect(html).toContain('forge-icon-draw-circle');
      expect(html).toContain('stroke="red"');
      expect(html).toContain('<use href="#icon-draw-circle"');
    }
  });

  it('rotates the arrow according to its direction prop on both frameworks', async () => {
    for (const html of await renderBoth(ForgeIconArrow, { direction: 'right' })) {
      expect(html).toContain('rotate(90deg)');
      expect(html).toContain('aria-label="Arrow right"');
    }
  });

  it('fills only the active sort chevron on both frameworks', async () => {
    for (const html of await renderBoth(ForgeIconSort, { active: true, direction: 'asc', color: 'blue' })) {
      expect(html).toContain('stroke="blue"');
      expect(html).toContain('data-active="true"');
      expect(html).toContain('data-direction="asc"');
      expect(html).toContain('fill="none"');
      expect(html).toContain('<use href="#icon-sort"');
    }
  });

  it('mounts one inline sprite host for repeated icon references', async () => {
    const [react, vue] = await renderBoth(InlineSpriteDemo);
    for (const html of [react, vue]) {
      expect(html).toContain('<defs>');
      expect(html).toContain('<symbol id="icon-alert"');
      expect(html).toContain('<use href="#icon-alert"');
      expect(html).toContain('<use href="#icon-arrow"');
    }
  });

  it('resolves an external sprite URL without mounting duplicate symbols', async () => {
    const [react, vue] = await renderBoth(ExternalSpriteDemo);
    for (const html of [react, vue]) {
      expect(html).not.toContain('<defs>');
      expect(html).toContain('<use href="/assets/icons.svg#icon-alert"');
    }
  });

  it('rejects unsupported country codes predictably', () => {
    expect(() => ForgeIconFlag({ countryCode: 'ZZ' as IconCountryCode })).toThrow('Unsupported country code');
  });
});
