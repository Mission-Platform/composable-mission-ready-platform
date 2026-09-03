import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeOnboardingTour } from './forge-onboarding-tour';

import type { OnboardingStep } from './forge-onboarding-tour';

const ReactOnboardingTour = toReactComponent(ForgeOnboardingTour, 'OnboardingTour');
const VueOnboardingTour = toVueComponent(ForgeOnboardingTour, 'OnboardingTour');

const steps: OnboardingStep[] = [
  { title: 'Welcome', content: 'Start here', target: '#welcome-button' },
  { title: 'Finish', content: 'You are ready.', target: '#finish-button' },
];

describe('ForgeOnboardingTour authors the same component for React and Vue', () => {
  it('renders an accessible dialog, progress, and navigation on both frameworks', async () => {
    const properties = { steps, open: true, title: 'Product tour' };
    const react = renderToStaticMarkup(createElement(ReactOnboardingTour, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueOnboardingTour, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-label="Product tour"');
      expect(html).toContain('Welcome');
      expect(html).toContain('Start here');
      expect(html).toContain('Step 1 of 2');
      expect(html).toContain('Next');
      expect(html).toContain('Skip tour');
      expect(html).toContain('aria-labelledby=');
    }
  });

  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(createElement(ReactOnboardingTour, { steps, open: false }));
    expect(html).not.toContain('role="dialog"');
  });

  it('forwards the backdrop surface override to the neutral style map', () => {
    const html = renderToStaticMarkup(
      createElement(ReactOnboardingTour, {
        steps,
        open: true,
        properties: { 'overlay-modal-backdrop-surface': 'rgb(10 20 30 / 40%)' },
      }),
    );

    expect(html).toContain('--forge-onboarding-tour-overlay-modal-backdrop-surface:rgb(10 20 30 / 40%)');
  });

  it('dismisses when the modal backdrop is clicked', async () => {
    const onSkip = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({ render: () => vueH(VueOnboardingTour, { steps, open: true, onSkip }) });
    app.mount(host);

    const backdrop = host.querySelector('.forge-onboarding-tour__backdrop');
    expect(backdrop).not.toBeNull();
    backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(onSkip).toHaveBeenCalledOnce();

    app.unmount();
    host.remove();
  });

  it('supports controlled model state, current step, and overlay visibility', async () => {
    const onUpdate = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueOnboardingTour, {
          currentStep: 1,
          modelValue: true,
          onSkip: vi.fn(),
          onUpdate,
          overlay: false,
          steps,
        }),
    });
    app.mount(host);

    expect(host.textContent).toContain('Finish');
    expect(host.querySelector('.forge-onboarding-tour__backdrop')).toBeNull();
    host.querySelector('button')?.click();
    await nextTick();
    expect(onUpdate).toHaveBeenCalledWith(false);

    app.unmount();
    host.remove();
  });
});

afterEach(() => {
  document.body.replaceChildren();
});
