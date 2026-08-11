import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeFormWizard, type WizardStep } from './forge-form-wizard';

/**
 * Exercises the **neutral** `ForgeFormWizard` authored in this package, rendering
 * it on both frameworks through the `@mission-platform/forge` adapters. It renders
 * the step indicator, the active step's content, and the navigation footer.
 */
const ReactFormWizard = toReactComponent(ForgeFormWizard, 'FormWizard');
const VueFormWizard = toVueComponent(ForgeFormWizard, 'FormWizard');

const STEPS: WizardStep[] = [
  { id: 'account', title: 'Account', description: 'Your login', content: 'Account step body' },
  { id: 'profile', title: 'Profile', content: 'Profile step body' },
  { id: 'review', title: 'Review', content: 'Review step body' },
];

describe('ForgeFormWizard authors the same component for React and Vue', () => {
  it('renders the steps, the active step body, and Next on the first step on both frameworks', async () => {
    const properties = { steps: STEPS, modelValue: 0 };
    const react = renderToStaticMarkup(createElement(ReactFormWizard, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFormWizard, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Account');
      expect(html).toContain('Profile');
      expect(html).toContain('Review');
      expect(html).toContain('Account step body');
      expect(html).toContain('Next');
      expect(html).toContain('aria-current="step"');
    }
  });

  it('shows the Finish label on the last step on both frameworks', async () => {
    const properties = { steps: STEPS, modelValue: 2, finishLabel: 'Done' };
    const react = renderToStaticMarkup(createElement(ReactFormWizard, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFormWizard, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Review step body');
      expect(html).toContain('Done');
    }
  });

  it('omits a conditional step (`when: false`) from the sequence on both frameworks', async () => {
    const conditionalSteps: WizardStep[] = [
      { id: 'account', title: 'Account', content: 'Account step body' },
      { id: 'billing', title: 'Billing', when: false, content: 'Billing step body' },
      { id: 'review', title: 'Review', content: 'Review step body' },
    ];
    const properties = { steps: conditionalSteps, modelValue: 0 };
    const react = renderToStaticMarkup(createElement(ReactFormWizard, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFormWizard, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Account');
      expect(html).toContain('Review');
      expect(html).not.toContain('Billing');
    }
  });

  it('disables the primary button while the active step is invalid (per-step validation) on both frameworks', async () => {
    const invalidSteps: WizardStep[] = [
      { id: 'account', title: 'Account', valid: false, content: 'Account step body' },
      { id: 'review', title: 'Review', content: 'Review step body' },
    ];
    const properties = { steps: invalidSteps, modelValue: 0 };
    const react = renderToStaticMarkup(createElement(ReactFormWizard, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFormWizard, properties) }));

    for (const html of [react, vue]) {
      // The primary (Next) button itself carries the disabled attribute.
      expect(html).toMatch(/<button[^>]*\bdisabled\b[^>]*>Next<\/button>/);
    }
  });

  it('disables Finish when the final step is invalid (final-step validation) on both frameworks', async () => {
    const finalInvalidSteps: WizardStep[] = [
      { id: 'account', title: 'Account', content: 'Account step body' },
      { id: 'review', title: 'Review', valid: false, content: 'Review step body' },
    ];
    const properties = { steps: finalInvalidSteps, modelValue: 1, finishLabel: 'Finish' };
    const react = renderToStaticMarkup(createElement(ReactFormWizard, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueFormWizard, properties) }));

    for (const html of [react, vue]) {
      // The final Finish button itself carries the disabled attribute.
      expect(html).toMatch(/<button[^>]*\bdisabled\b[^>]*>Finish<\/button>/);
    }
  });
});
