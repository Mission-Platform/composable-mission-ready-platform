import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseSeparator from './base-separator.vue';

describe('BaseSeparator', () => {
  it('renders an <hr> with separator role by default', () => {
    const wrapper = mount(BaseSeparator);
    expect(wrapper.element.tagName).toBe('HR');
    expect(wrapper.attributes('role')).toBe('separator');
    expect(wrapper.attributes('aria-orientation')).toBe('horizontal');
  });

  it('applies the default classes (horizontal, solid, md spacing)', () => {
    const wrapper = mount(BaseSeparator);
    expect(wrapper.classes()).toContain('base-separator--horizontal');
    expect(wrapper.classes()).toContain('base-separator--solid');
    expect(wrapper.classes()).toContain('base-separator--spacing-md');
  });

  it('supports vertical orientation', () => {
    const wrapper = mount(BaseSeparator, { props: { orientation: 'vertical' } });
    expect(wrapper.classes()).toContain('base-separator--vertical');
    expect(wrapper.attributes('aria-orientation')).toBe('vertical');
  });

  it('applies the variant class', () => {
    for (const variant of ['solid', 'dashed', 'dotted'] as const) {
      const wrapper = mount(BaseSeparator, { props: { variant } });
      expect(wrapper.classes()).toContain(`base-separator--${variant}`);
    }
  });

  it('applies the spacing class', () => {
    for (const spacing of ['none', 'sm', 'md', 'lg', 'xl'] as const) {
      const wrapper = mount(BaseSeparator, { props: { spacing } });
      expect(wrapper.classes()).toContain(`base-separator--spacing-${spacing}`);
    }
  });

  it('marks decorative separators as presentational', () => {
    const wrapper = mount(BaseSeparator, { props: { decorative: true } });
    expect(wrapper.attributes('role')).toBe('none');
    expect(wrapper.attributes('aria-orientation')).toBeUndefined();
  });

  it('renders a labelled separator when the default slot is used (horizontal)', () => {
    const wrapper = mount(BaseSeparator, { slots: { default: 'OR' } });
    expect(wrapper.element.tagName).toBe('DIV');
    expect(wrapper.classes()).toContain('base-separator--labelled');
    expect(wrapper.text()).toBe('OR');
    expect(wrapper.findAll('.base-separator__line')).toHaveLength(2);
  });

  it('ignores the label slot when vertical and renders an <hr>', () => {
    const wrapper = mount(BaseSeparator, { props: { orientation: 'vertical' }, slots: { default: 'OR' } });
    expect(wrapper.element.tagName).toBe('HR');
  });
});
