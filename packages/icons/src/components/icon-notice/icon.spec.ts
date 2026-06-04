import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconNotice from './icon.vue';

describe('IconNotice', () => {
  it('renders an svg element', () => {
    const wrapper = mount(IconNotice);
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('applies the correct class', () => {
    const wrapper = mount(IconNotice);
    expect(wrapper.find('svg').classes()).toContain('base-icon-notice');
  });

  it('applies named size token', () => {
    const wrapper = mount(IconNotice, { props: { size: 'lg' } });
    expect(wrapper.find('svg').attributes('width')).toContain('mp-size-icon-lg');
  });

  it('applies numeric size as px', () => {
    const wrapper = mount(IconNotice, { props: { size: 32 } });
    expect(wrapper.find('svg').attributes('width')).toBe('32px');
  });
});
