import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseDeviceMock } from './base-device-mock';

/**
 * Exercises the **neutral** `BaseDeviceMock` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the per-device chrome (browser controls/address bar, mobile notch,
 * tablet camera, desktop stand) and the default-slot screen.
 */
const ReactDeviceMock = toReactComponent(BaseDeviceMock, 'DeviceMock');
const VueDeviceMock = toVueComponent(BaseDeviceMock, 'DeviceMock');

describe('BaseDeviceMock authors the same component for React and Vue', () => {
  it('renders the mobile frame (default) with a notch and screen content on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactDeviceMock, {}, 'Screen content'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDeviceMock, {}, () => 'Screen content') }));

    for (const html of [react, vue]) {
      expect(html).toContain('base-device-mock--mobile');
      expect(html).toContain('base-device-mock--portrait');
      expect(html).toContain('base-device-mock__notch');
      expect(html).toContain('base-device-mock__screen');
      expect(html).toContain('Screen content');
      expect(html).toContain('role="img"');
      expect(html).toContain('Mobile device preview');
    }
  });

  it('renders the browser frame with traffic-light controls and the url address bar on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactDeviceMock, { device: 'browser', url: 'https://example.com' }, 'Page'),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueDeviceMock, { device: 'browser', url: 'https://example.com' }, () => 'Page'),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('base-device-mock--browser');
      expect(html).toContain('base-device-mock__chrome');
      expect(html).toContain('base-device-mock__control');
      expect(html).toContain('https://example.com');
      expect(html).not.toContain('base-device-mock__notch');
    }
  });

  it('renders the desktop stand and honours landscape orientation on the tablet frame', async () => {
    const desktop = renderToStaticMarkup(createElement(ReactDeviceMock, { device: 'desktop' }, 'Desktop'));
    expect(desktop).toContain('base-device-mock--desktop');
    expect(desktop).toContain('base-device-mock__stand');
    expect(desktop).toContain('base-device-mock__base');

    const tablet = await renderToString(
      createSSRApp({
        render: () => vueH(VueDeviceMock, { device: 'tablet', orientation: 'landscape' }, () => 'Tablet'),
      }),
    );
    expect(tablet).toContain('base-device-mock--tablet');
    expect(tablet).toContain('base-device-mock--landscape');
    expect(tablet).toContain('base-device-mock__camera');
  });

  it('applies the requested size token', () => {
    const html = renderToStaticMarkup(createElement(ReactDeviceMock, { size: 'lg' }, 'Big'));
    expect(html).toContain('base-size--lg');
  });
});
