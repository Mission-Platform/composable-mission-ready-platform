import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseButtonGroup from './base-button-group.vue';

describe('BaseButtonGroup', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseButtonGroup, {
      slots: { default: '<button>A</button><button>B</button>' },
    });
    expect(wrapper.findAll('button')).toHaveLength(2);
  });

  it('exposes role="group"', () => {
    const wrapper = mount(BaseButtonGroup);
    expect(wrapper.attributes('role')).toBe('group');
  });

  it('applies the aria-label', () => {
    const wrapper = mount(BaseButtonGroup, { props: { ariaLabel: 'Text formatting' } });
    expect(wrapper.attributes('aria-label')).toBe('Text formatting');
  });

  it('applies default orientation and gap classes', () => {
    const wrapper = mount(BaseButtonGroup);
    expect(wrapper.classes()).toContain('base-button-group--horizontal');
    expect(wrapper.classes()).toContain('base-button-group--gap-sm');
    expect(wrapper.classes()).not.toContain('base-button-group--attached');
  });

  it('supports vertical orientation', () => {
    const wrapper = mount(BaseButtonGroup, { props: { orientation: 'vertical' } });
    expect(wrapper.classes()).toContain('base-button-group--vertical');
  });

  it('adds the attached class', () => {
    const wrapper = mount(BaseButtonGroup, { props: { attached: true } });
    expect(wrapper.classes()).toContain('base-button-group--attached');
  });

  it('applies gap class', () => {
    for (const gap of ['none', 'xs', 'sm', 'md'] as const) {
      const wrapper = mount(BaseButtonGroup, { props: { gap } });
      expect(wrapper.classes()).toContain(`base-button-group--gap-${gap}`);
    }
  });
});
