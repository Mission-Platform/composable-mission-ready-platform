import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconSend from './icon.vue';

describe('IconSend', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconSend);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies size prop', () => {
    const wrapper = mount(IconSend, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('2rem');
    expect(svg.attributes('height')).toBe('2rem');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconSend, { props: { ariaLabel: 'Test label' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Test label');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconSend, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });
});
