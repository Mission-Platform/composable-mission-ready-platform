import { describe, expect, it } from 'vitest';

import { expectNoA11yViolations, mountForA11y } from '../../test-utils/axe';
import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseLocationInput from './base-location-input.vue';

describe('BaseLocationInput', () => {
  it('renders a <fieldset> with a <legend> label', () => {
    const wrapper = mountWithI18n(BaseLocationInput, { props: { label: 'Location' } });
    expect(wrapper.element.tagName).toBe('FIELDSET');
    expect(wrapper.find('legend').text()).toContain('Location');
  });

  it('renders latitude and longitude inputs', () => {
    const wrapper = mountWithI18n(BaseLocationInput, { props: { label: 'Location' } });
    expect(wrapper.findAll('input').length).toBeGreaterThanOrEqual(2);
  });

  it('applies the disabled modifier class when disabled', () => {
    const wrapper = mountWithI18n(BaseLocationInput, { props: { label: 'Location', disabled: true } });
    expect(wrapper.classes()).toContain('base-location-input--disabled');
  });

  // Regression guard: the disabled state must not dim the legend with `opacity`
  // (which dropped the label below the WCAG contrast threshold); it keeps the
  // legend's full-contrast primary text colour instead.
  it('keeps the legend label at full-contrast primary colour when disabled', () => {
    const wrapper = mountWithI18n(BaseLocationInput, { props: { label: 'Location', disabled: true } });
    const legendText = wrapper.find('legend .base-typography');
    expect(legendText.classes()).toContain('base-typography--color-primary');
  });
});

describe('BaseLocationInput accessibility (WCAG AAA)', () => {
  it('has no violations when labelled', async () => {
    const wrapper = mountForA11y(BaseLocationInput, { props: { label: 'Location' } });
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });

  it('has no violations when disabled', async () => {
    const wrapper = mountForA11y(BaseLocationInput, { props: { label: 'Location', disabled: true } });
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });

  it('has no violations with a hidden label, hint, and required marker', async () => {
    const wrapper = mountForA11y(BaseLocationInput, {
      props: { label: 'Drop point', labelHidden: true, hint: 'Enter decimal degrees', required: true },
    });
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });
});
