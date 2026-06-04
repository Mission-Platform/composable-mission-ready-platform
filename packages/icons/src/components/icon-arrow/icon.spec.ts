import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconArrow from './icon.vue';

describe('IconArrow', () => {
  it('renders an svg element', () => {
    const wrapper = mount(IconArrow);
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('applies the correct class', () => {
    const wrapper = mount(IconArrow);
    expect(wrapper.find('svg').classes()).toContain('base-icon-arrow');
  });

  it('applies named size token', () => {
    const wrapper = mount(IconArrow, { props: { size: 'lg' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toContain('mp-size-icon-lg');
  });

  it('applies numeric size as px', () => {
    const wrapper = mount(IconArrow, { props: { size: 32 } });
    expect(wrapper.find('svg').attributes('width')).toBe('32px');
  });

  it('rotates for each direction', () => {
    const directions = ['up', 'right', 'down', 'left'] as const;
    for (const direction of directions) {
      const wrapper = mount(IconArrow, { props: { direction } });
      expect(wrapper.find('svg').attributes('style')).toContain('rotate');
    }
  });
});
