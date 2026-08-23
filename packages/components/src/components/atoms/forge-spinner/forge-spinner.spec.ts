import { readFileSync } from 'node:fs';
import path from 'node:path';

import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeSpinner } from './forge-spinner';

const spinnerStyles = readFileSync(
  path.resolve(process.cwd(), 'src/components/atoms/forge-spinner/forge-spinner.module.scss'),
  'utf8',
);
const feedbackContract = JSON.parse(
  readFileSync(path.resolve(process.cwd(), '../tokens/tokens/component/atoms/feedback.tokens.json'), 'utf8'),
) as { component: { feedback: Record<string, unknown> } };

/**
 * Exercises the **neutral** `ForgeSpinner` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters.
 * Covers the tone/size modifiers and the accessible label.
 */
const ReactSpinner = toReactComponent(ForgeSpinner, 'Spinner');
const VueSpinner = toVueComponent(ForgeSpinner, 'Spinner');

describe('ForgeSpinner authors the same component for React and Vue', () => {
  it('renders a toned, sized status spinner on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSpinner, { variant: 'success', size: 'lg' }));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueSpinner, { variant: 'success', size: 'lg' }) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-spinner');
      expect(html).toContain('forge-spinner--success');
      expect(html).toContain('forge-spinner--lg');
      expect(html).toContain('role="status"');
      // Defaults the accessible label when none is supplied.
      expect(html).toContain('aria-label="Loading…"');
    }
  });

  it('honours an explicit label on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactSpinner, { label: 'Fetching' }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueSpinner, { label: 'Fetching' }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('aria-label="Fetching"');
    }
  });

  it('keeps all size border widths and motion configurable through tokens', () => {
    const spinner = feedbackContract.component.feedback.spinner as Record<string, unknown>;
    expect(spinner).toHaveProperty('animation-duration');
    expect(spinner).toHaveProperty('animation-easing');
    expect(spinnerStyles).toContain('--mp-feedback-spinner-border-width-xl');
    expect(spinnerStyles).toContain('--mp-feedback-spinner-border-width-2xl');
    expect(spinnerStyles).toContain('--mp-feedback-spinner-animation-duration');
    expect(spinnerStyles).toContain('--mp-feedback-spinner-animation-easing');
  });
});
