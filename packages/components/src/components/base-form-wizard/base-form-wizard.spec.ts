import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseFormWizard from './base-form-wizard.vue';

import type { WizardStep } from './base-form-wizard.vue';

const steps: WizardStep[] = [
  { id: 'a', title: 'Step One' },
  { id: 'b', title: 'Step Two' },
  { id: 'c', title: 'Step Three' },
];

describe('BaseFormWizard', () => {
  it('renders all steps', () => {
    const wrapper = mountWithI18n(BaseFormWizard, { props: { steps, modelValue: 0 } });
    expect(wrapper.findAll('.base-form-wizard__step')).toHaveLength(3);
  });

  it('marks current step with aria-current', () => {
    const wrapper = mountWithI18n(BaseFormWizard, { props: { steps, modelValue: 1 } });
    const stepItems = wrapper.findAll('.base-form-wizard__step');
    expect(stepItems[1].attributes('aria-current')).toBe('step');
  });

  it('applies complete class to previous steps', () => {
    const wrapper = mountWithI18n(BaseFormWizard, { props: { steps, modelValue: 2 } });
    expect(wrapper.findAll('.base-form-wizard__step')[0].classes()).toContain('base-form-wizard__step--complete');
  });

  it('shows Back button when not on first step', () => {
    const wrapper = mountWithI18n(BaseFormWizard, { props: { steps, modelValue: 1 } });
    expect(wrapper.find('.base-form-wizard__btn--secondary').exists()).toBe(true);
  });

  it('hides Back button on first step', () => {
    const wrapper = mountWithI18n(BaseFormWizard, { props: { steps, modelValue: 0 } });
    expect(wrapper.find('.base-form-wizard__btn--secondary').exists()).toBe(false);
  });

  it('shows Finish on last step', () => {
    const wrapper = mountWithI18n(BaseFormWizard, { props: { steps, modelValue: 2 } });
    expect(wrapper.find('.base-form-wizard__btn--primary').text()).toBe('Finish');
  });

  it('emits next when Next clicked', async () => {
    const wrapper = mountWithI18n(BaseFormWizard, { props: { steps, modelValue: 0 } });
    await wrapper.find('.base-form-wizard__btn--primary').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1]);
  });

  it('emits complete when Finish clicked on last step', async () => {
    const wrapper = mountWithI18n(BaseFormWizard, { props: { steps, modelValue: 2 } });
    await wrapper.find('.base-form-wizard__btn--primary').trigger('click');
    expect(wrapper.emitted('complete')).toBeTruthy();
  });
});
