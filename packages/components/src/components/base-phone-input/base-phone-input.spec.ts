import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BasePhoneInput } from './base-phone-input';

import type { PhoneCountry } from './phone';

/**
 * Exercises the **neutral** `BasePhoneInput` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/jsx` runtime adapters.
 * Covers the `@mission-platform/phone-number`-derived national value, dial code, E.164
 * hidden input, and validity indicator.
 *
 * A small explicit `countries` list keeps the SSR markup compact and the
 * assertions independent of the host runtime's `Intl.DisplayNames` data.
 */
const ReactPhoneInput = toReactComponent(BasePhoneInput, 'PhoneInput');
const VuePhoneInput = toVueComponent(BasePhoneInput, 'PhoneInput');

const countries: PhoneCountry[] = [
  { region: 'US', name: 'United States', dialCode: '1', flag: '🇺🇸' },
  { region: 'GB', name: 'United Kingdom', dialCode: '44', flag: '🇬🇧' },
];

async function renderBoth(properties: Record<string, unknown>): Promise<string[]> {
  const react = renderToStaticMarkup(createElement(ReactPhoneInput, properties));
  const vue = await renderToString(createSSRApp({ render: () => vueH(VuePhoneInput, properties) }));
  return [react, vue];
}

describe('BasePhoneInput authors the same component for React and Vue', () => {
  it('renders the tel field, the country picker and the dial code on both frameworks', async () => {
    for (const html of await renderBoth({ label: 'Phone', country: 'US', countries, id: 'ph-1' })) {
      expect(html).toContain('Phone');
      expect(html).toContain('type="tel"');
      expect(html).toContain('United States');
      expect(html).toContain('+1');
    }
  });

  it('formats a valid number, exposes its E.164 form and flags it valid on both frameworks', async () => {
    const properties = { country: 'US', modelValue: '(415) 555-2671', countries, name: 'phone', id: 'ph-2' };
    for (const html of await renderBoth(properties)) {
      expect(html).toContain('value="(415) 555-2671"');
      // Hidden input submits the canonical E.164 value parsed by @mission-platform/phone-number.
      expect(html).toContain('type="hidden"');
      expect(html).toContain('value="+14155552671"');
      expect(html).toContain('aria-label="Valid number"');
    }
  });

  it('flags an unparseable number as invalid on both frameworks', async () => {
    for (const html of await renderBoth({ country: 'US', modelValue: '123', countries, id: 'ph-3' })) {
      expect(html).toContain('aria-label="Invalid number"');
      expect(html).not.toContain('aria-label="Valid number"');
    }
  });

  it('shows no validity indicator when empty on both frameworks', async () => {
    for (const html of await renderBoth({ country: 'US', modelValue: '', countries, id: 'ph-4' })) {
      expect(html).toContain('type="tel"');
      expect(html).not.toContain('Valid number');
      expect(html).not.toContain('Invalid number');
    }
  });
});
