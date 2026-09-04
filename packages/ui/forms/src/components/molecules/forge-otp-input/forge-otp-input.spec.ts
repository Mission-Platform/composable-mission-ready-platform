import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeOtpInput } from './forge-otp-input';

/**
 * Exercises the **neutral** `ForgeOtpInput` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge-jsx` runtime adapters.
 * Covers the cell count, the per-cell labels, the bound value, and masking.
 */
const ReactOtpInput = toReactComponent(ForgeOtpInput, 'OtpInput');
const VueOtpInput = toVueComponent(ForgeOtpInput, 'OtpInput');

describe('ForgeOtpInput authors the same component for React and Vue', () => {
  it('renders `length` cells split from the value on both frameworks', async () => {
    const properties = { modelValue: '123', length: 4, ariaLabel: 'Verification code' };
    const react = renderToStaticMarkup(createElement(ReactOtpInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueOtpInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Verification code"');
      // Four cells, each with an indexed label.
      expect(html).toContain('aria-label="Digit 1 of 4"');
      expect(html).toContain('aria-label="Digit 4 of 4"');
      expect(html).toContain('value="1"');
      expect(html).toContain('value="2"');
      expect(html).toContain('value="3"');
    }
  });

  it('renders password cells when masked on both frameworks', async () => {
    const properties = { modelValue: '99', length: 2, mask: true };
    const react = renderToStaticMarkup(createElement(ReactOtpInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueOtpInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('type="password"');
    }
  });
});
