import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseSpinner from './base-spinner.vue';

describe('BaseSpinner', () => {
  it('renders a span with role status', () => {
    const wrapper = mountWithI18n(BaseSpinner);
    expect(wrapper.find('span').attributes('role')).toBe('status');
  });

  it('has an aria-label', () => {
    const wrapper = mountWithI18n(BaseSpinner);
    expect(wrapper.find('span').attributes('aria-label')).toBeTruthy();
  });

  it('uses custom label when provided', () => {
    const wrapper = mountWithI18n(BaseSpinner, { props: { label: 'Uploading…' } });
    expect(wrapper.find('span').attributes('aria-label')).toBe('Uploading…');
  });

  it('applies size class', () => {
    const wrapper = mountWithI18n(BaseSpinner, { props: { size: 'lg' } });
    expect(wrapper.find('span').classes()).toContain('base-spinner--lg');
  });

  it('applies variant class', () => {
    const wrapper = mountWithI18n(BaseSpinner, { props: { variant: 'success' } });
    expect(wrapper.find('span').classes()).toContain('base-spinner--success');
  });
});
