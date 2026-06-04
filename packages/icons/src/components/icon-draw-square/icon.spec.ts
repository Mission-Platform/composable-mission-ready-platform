import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconDrawSquare from './icon.vue';

describe('IconDrawSquare', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconDrawSquare);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies size prop', () => {
    const wrapper = mount(IconDrawSquare, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('32px');
    expect(svg.attributes('height')).toBe('32px');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconDrawSquare, { props: { ariaLabel: 'Test label' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Test label');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconDrawSquare, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });
});
