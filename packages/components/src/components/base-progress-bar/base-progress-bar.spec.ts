import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseProgressBar from './base-progress-bar.vue';

describe('BaseProgressBar', () => {
  it('renders a progressbar role element', () => {
    const wrapper = mountWithI18n(BaseProgressBar, { props: { value: 50 } });
    expect(wrapper.find('progress').exists()).toBe(true);
  });

  it('sets value attribute on progress element', () => {
    const wrapper = mountWithI18n(BaseProgressBar, { props: { value: 75 } });
    expect(wrapper.find('progress').attributes('value')).toBe('75');
  });

  it('fill width matches percentage via value attribute', () => {
    const wrapper = mountWithI18n(BaseProgressBar, { props: { value: 50, max: 100 } });
    expect(wrapper.find('progress').attributes('value')).toBe('50');
    expect(wrapper.find('progress').attributes('max')).toBe('100');
  });

  it('shows label when provided', () => {
    const wrapper = mountWithI18n(BaseProgressBar, { props: { value: 30, label: 'Loading' } });
    expect(wrapper.find('.base-progress-bar__label').text()).toBe('Loading');
  });

  it('shows percentage when showLabel is true', () => {
    const wrapper = mountWithI18n(BaseProgressBar, { props: { value: 40, showLabel: true } });
    expect(wrapper.find('.base-progress-bar__value').text()).toBe('40%');
  });

  it('applies indeterminate class', () => {
    const wrapper = mountWithI18n(BaseProgressBar, { props: { indeterminate: true } });
    expect(wrapper.find('progress').classes()).toContain('base-progress-bar__track--indeterminate');
  });

  it('clamps value above 100', () => {
    const wrapper = mountWithI18n(BaseProgressBar, { props: { value: 150, showLabel: true } });
    expect(wrapper.find('.base-progress-bar__value').text()).toBe('100%');
  });

  it('applies variant class', () => {
    const wrapper = mountWithI18n(BaseProgressBar, { props: { value: 50, variant: 'success' } });
    expect(wrapper.find('progress').classes()).toContain('base-progress-bar__track--success');
  });
});
