import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseStatusIcon from './base-status-icon.vue';

describe('BaseStatusIcon', () => {
  it('renders a span with role img', () => {
    const wrapper = mountWithI18n(BaseStatusIcon, { props: { status: 'success' } });
    expect(wrapper.find('span').attributes('role')).toBe('img');
  });

  it('applies status class', () => {
    const wrapper = mountWithI18n(BaseStatusIcon, { props: { status: 'warning' } });
    expect(wrapper.find('span').classes()).toContain('base-status-icon--warning');
  });

  it('applies size class', () => {
    const wrapper = mountWithI18n(BaseStatusIcon, { props: { status: 'info', size: 'lg' } });
    expect(wrapper.find('span').classes()).toContain('base-status-icon--lg');
  });

  it('sets aria-label when label provided', () => {
    const wrapper = mountWithI18n(BaseStatusIcon, {
      props: { status: 'error', label: 'Error occurred' },
    });
    expect(wrapper.find('span').attributes('aria-label')).toBe('Error occurred');
  });

  it('renders an SVG icon', () => {
    const wrapper = mountWithI18n(BaseStatusIcon, { props: { status: 'success' } });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it.each(['success', 'warning', 'error', 'info', 'neutral'] as const)('renders %s icon', (status) => {
    const wrapper = mountWithI18n(BaseStatusIcon, { props: { status } });
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.find('span').classes()).toContain(`base-status-icon--${status}`);
  });
});
