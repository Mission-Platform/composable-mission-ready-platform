import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconNumberedList from './icon.vue';

describe('IconNumberedList', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconNumberedList);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies numeric size as px', () => {
    const wrapper = mount(IconNumberedList, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('32px');
    expect(svg.attributes('height')).toBe('32px');
  });

  it('applies named size token', () => {
    const wrapper = mount(IconNumberedList, { props: { size: 'lg' } });
    expect(wrapper.find('svg').attributes('width')).toContain('mp-size-icon-lg');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconNumberedList, { props: { ariaLabel: 'Test label' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Test label');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconNumberedList, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });
});
