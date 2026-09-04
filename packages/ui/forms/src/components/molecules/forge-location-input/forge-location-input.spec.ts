import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeLocationInput } from './forge-location-input';

/**
 * Exercises the **neutral** `ForgeLocationInput` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` runtime
 * adapters. Covers the legend, the formatted coordinate fields, the format
 * selector, and the error message.
 */
const ReactLocationInput = toReactComponent(ForgeLocationInput, 'LocationInput');
const VueLocationInput = toVueComponent(ForgeLocationInput, 'LocationInput');

describe('ForgeLocationInput authors the same component for React and Vue', () => {
  it('renders the legend, latitude/longitude fields, and the format selector on both frameworks', async () => {
    const properties = {
      label: 'Coordinates',
      modelValue: { lat: 40.712_775_3, lng: -74.005_972_8, format: 'dd' as const },
    };
    const react = renderToStaticMarkup(createElement(ReactLocationInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueLocationInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Coordinates');
      expect(html).toContain('Latitude');
      expect(html).toContain('Longitude');
      // The format selector exposes the three coordinate formats.
      expect(html).toContain('Coordinate format');
      // The decimal-degree coordinates are formatted into the inputs.
      expect(html).toContain('40.7127753');
      expect(html).toContain('-74.0059728');
    }
  });

  it('hides the format selector when allowFormatChange is false on both frameworks', async () => {
    const properties = { allowFormatChange: false };
    const react = renderToStaticMarkup(createElement(ReactLocationInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueLocationInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).not.toContain('Coordinate format');
      expect(html).toContain('Latitude');
    }
  });

  it('renders the error message on both frameworks', async () => {
    const properties = { error: 'Coordinates are required.' };
    const react = renderToStaticMarkup(createElement(ReactLocationInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueLocationInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Coordinates are required.');
      expect(html).toContain('role="alert"');
    }
  });
});
