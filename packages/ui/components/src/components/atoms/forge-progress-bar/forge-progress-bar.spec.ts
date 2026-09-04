import { readFileSync } from 'node:fs';
import path from 'node:path';

import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeProgressBar } from './forge-progress-bar';

const progressStyles = readFileSync(
  path.resolve(process.cwd(), 'src/components/atoms/forge-progress-bar/forge-progress-bar.module.scss'),
  'utf8',
);
const feedbackContract = JSON.parse(
  readFileSync(path.resolve(process.cwd(), '../tokens/tokens/component/atoms/feedback.tokens.json'), 'utf8'),
) as { component: { feedback: Record<string, unknown> } };

/**
 * Exercises the **neutral** `ForgeProgressBar` authored in this package,
 * rendering it on both frameworks through the `@mission-platform/forge-jsx` runtime
 * adapters. Covers the determinate label row (via the composed
 * `ForgeTypography`) and the indeterminate mode.
 */
const ReactProgressBar = toReactComponent(ForgeProgressBar, 'ProgressBar');
const VueProgressBar = toVueComponent(ForgeProgressBar, 'ProgressBar');

describe('ForgeProgressBar authors the same component for React and Vue', () => {
  it('renders a labelled, determinate track with a percentage on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactProgressBar, { value: 30, variant: 'success', size: 'lg', label: 'Upload', showLabel: true }),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(VueProgressBar, { value: 30, variant: 'success', size: 'lg', label: 'Upload', showLabel: true }),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('forge-progress-bar');
      expect(html).toContain('forge-progress-bar--lg');
      expect(html).toContain('forge-progress-bar__track--success');
      // The composed neutral ForgeTypography renders the label + percentage.
      expect(html).toContain('forge-typography');
      expect(html).toContain('Upload');
      expect(html).toContain('30%');
      expect(html).toContain('aria-label="Upload"');
    }
  });

  it('renders an indeterminate track without a value on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactProgressBar, { indeterminate: true }));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueProgressBar, { indeterminate: true }) }));

    for (const html of [react, vue]) {
      expect(html).toContain('forge-progress-bar__track--indeterminate');
    }
  });

  it('exposes token hooks for every track size and indeterminate motion', () => {
    const progress = feedbackContract.component.feedback.progress as Record<string, unknown>;
    expect(progress).toHaveProperty('size');
    expect(progress).toHaveProperty('indeterminate-duration');
    expect(progress).toHaveProperty('indeterminate-easing');
    expect(progressStyles).toContain('--mp-feedback-progress-size-#{$size}');
    expect(progressStyles).toContain('--mp-feedback-progress-indeterminate-duration');
    expect(progressStyles).toContain('--mp-feedback-progress-indeterminate-easing');
  });
});
