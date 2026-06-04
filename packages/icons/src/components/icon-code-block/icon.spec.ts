import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconCodeBlock from './icon.vue';

describe('IconCodeBlock', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconCodeBlock);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies numeric size as px', () => {
    const wrapper = mount(IconCodeBlock, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('32px');
    expect(svg.attributes('height')).toBe('32px');
  });

  it('applies named size token', () => {
    const wrapper = mount(IconCodeBlock, { props: { size: 'lg' } });
    expect(wrapper.find('svg').attributes('width')).toContain('mp-size-icon-lg');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconCodeBlock, { props: { ariaLabel: 'Test label' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Test label');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconCodeBlock, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });
});
