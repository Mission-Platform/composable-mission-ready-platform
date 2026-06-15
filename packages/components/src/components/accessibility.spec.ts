// ─── Cross-component WCAG AAA accessibility suite ─────────────────────────────
//
// Mounts a representative, diverse cross-section of the component library and
// asserts — via axe-core, scoped to the WCAG A/AA/AAA rule set — that each one
// renders with no structural accessibility violations. See `test-utils/axe.ts`
// for the runner and its jsdom colour-contrast caveat.

import { afterEach, describe, it } from 'vitest';

import { expectNoA11yViolations, mountForA11y } from '../test-utils/axe';

import BaseAlertBanner from './base-alert-banner/base-alert-banner.vue';
import BaseBadge from './base-badge/base-badge.vue';
import BaseBreadcrumb from './base-breadcrumb/base-breadcrumb.vue';
import BaseButton from './base-button/base-button.vue';
import BaseCheckbox from './base-checkbox/base-checkbox.vue';
import BaseFieldSet from './base-field-set/base-field-set.vue';
import BaseInput from './base-input/base-input.vue';
import BaseLocationInput from './base-location-input/base-location-input.vue';
import BaseRadioGroup from './base-radio-group/base-radio-group.vue';
import BaseRating from './base-rating/base-rating.vue';
import BaseTypography from './base-typography/base-typography.vue';

import type { VueWrapper } from '@vue/test-utils';

let wrapper: VueWrapper | undefined;

/** Mounts (attached to the document), runs the AAA audit, and tears down. */
async function audit(mount: () => VueWrapper): Promise<void> {
  wrapper = mount();
  await expectNoA11yViolations(wrapper.element);
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

describe('WCAG AAA accessibility', () => {
  it('BaseButton has no violations', async () => {
    await audit(() => mountForA11y(BaseButton, { slots: { default: 'Save changes' } }));
  });

  it('BaseBadge has no violations', async () => {
    await audit(() => mountForA11y(BaseBadge, { slots: { default: 'New' } }));
  });

  it('BaseTypography has no violations', async () => {
    await audit(() =>
      mountForA11y(BaseTypography, { props: { variant: 'h2' }, slots: { default: 'Section heading' } }),
    );
  });

  it('BaseInput (labelled) has no violations', async () => {
    await audit(() => mountForA11y(BaseInput, { props: { label: 'Email address', type: 'email', modelValue: '' } }));
  });

  it('BaseInput (with error/hint) has no violations', async () => {
    await audit(() =>
      mountForA11y(BaseInput, {
        props: { label: 'Username', error: 'This field is required', required: true, modelValue: '' },
      }),
    );
  });

  it('BaseCheckbox (labelled) has no violations', async () => {
    await audit(() => mountForA11y(BaseCheckbox, { props: { label: 'I accept the terms', modelValue: false } }));
  });

  it('BaseRadioGroup has no violations', async () => {
    await audit(() =>
      mountForA11y(BaseRadioGroup, {
        props: {
          legend: 'Notification frequency',
          modelValue: 'daily',
          options: [
            { label: 'Daily', value: 'daily' },
            { label: 'Weekly', value: 'weekly' },
            { label: 'Never', value: 'never' },
          ],
        },
      }),
    );
  });

  it('BaseFieldSet has no violations', async () => {
    await audit(() =>
      mountForA11y(BaseFieldSet, {
        props: { legend: 'Contact details', description: 'How we can reach you' },
        slots: { default: 'Grouped content' },
      }),
    );
  });

  it('BaseRating (interactive slider) has no violations', async () => {
    await audit(() => mountForA11y(BaseRating, { props: { modelValue: 3, max: 5, ariaLabel: 'Overall rating' } }));
  });

  it('BaseRating (read-only) has no violations', async () => {
    await audit(() => mountForA11y(BaseRating, { props: { modelValue: 4, max: 5, readonly: true } }));
  });

  it('BaseLocationInput (labelled) has no violations', async () => {
    await audit(() => mountForA11y(BaseLocationInput, { props: { label: 'Location' } }));
  });

  it('BaseAlertBanner (dismissible) has no violations', async () => {
    await audit(() =>
      mountForA11y(BaseAlertBanner, {
        props: { variant: 'success', title: 'Saved', dismissible: true },
        slots: { default: 'Your changes have been saved.' },
      }),
    );
  });

  it('BaseBreadcrumb has no violations', async () => {
    await audit(() =>
      mountForA11y(BaseBreadcrumb, {
        props: {
          items: [{ label: 'Home', href: '/' }, { label: 'Library', href: '/library' }, { label: 'Data' }],
        },
      }),
    );
  });
});
