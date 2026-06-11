import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseBadge from './base-badge.vue';

describe('BaseBadge', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseBadge, { slots: { default: 'New' } });
    expect(wrapper.text()).toBe('New');
  });

  it('renders a <span> element', () => {
    const wrapper = mount(BaseBadge);
    expect(wrapper.element.tagName).toBe('SPAN');
  });

  it('applies default classes (default, md)', () => {
    const wrapper = mount(BaseBadge);
    expect(wrapper.classes()).toContain('base-badge--default');
    expect(wrapper.classes()).toContain('base-badge--md');
  });

  it('applies variant class', () => {
    for (const variant of [
      'primary',
      'secondary',
      'tertiary',
      'default',
      'success',
      'warning',
      'information',
      'error',
      'critical',
    ] as const) {
      const wrapper = mount(BaseBadge, { props: { variant } });
      expect(wrapper.classes()).toContain(`base-badge--${variant}`);
    }
  });

  it('applies size class sm', () => {
    const wrapper = mount(BaseBadge, { props: { size: 'sm' } });
    expect(wrapper.classes()).toContain('base-badge--sm');
  });

  it('adds pill class when pill prop is true', () => {
    const wrapper = mount(BaseBadge, { props: { pill: true } });
    expect(wrapper.classes()).toContain('base-badge--pill');
  });

  it('does not add pill class by default', () => {
    const wrapper = mount(BaseBadge);
    expect(wrapper.classes()).not.toContain('base-badge--pill');
  });
});
