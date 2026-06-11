import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconDebug from './icon.vue';

describe('IconDebug', () => {
  it('renders an svg element', () => {
    const wrapper = mount(IconDebug);
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('applies the correct class', () => {
    const wrapper = mount(IconDebug);
    expect(wrapper.find('svg').classes()).toContain('base-icon-debug');
  });

  it('applies named size token', () => {
    const wrapper = mount(IconDebug, { props: { size: 'lg' } });
    expect(wrapper.find('svg').attributes('width')).toContain('mp-size-icon-lg');
  });

  it('applies numeric size as rem', () => {
    const wrapper = mount(IconDebug, { props: { size: 32 } });
    expect(wrapper.find('svg').attributes('width')).toBe('2rem');
  });
});
