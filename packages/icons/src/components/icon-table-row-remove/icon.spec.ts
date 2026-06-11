import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconTableRowRemove from './icon.vue';

describe('IconTableRowRemove', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconTableRowRemove);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies numeric size as rem', () => {
    const wrapper = mount(IconTableRowRemove, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('2rem');
    expect(svg.attributes('height')).toBe('2rem');
  });

  it('applies named size token', () => {
    const wrapper = mount(IconTableRowRemove, { props: { size: 'lg' } });
    expect(wrapper.find('svg').attributes('width')).toContain('mp-size-icon-lg');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconTableRowRemove, { props: { ariaLabel: 'Test label' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Test label');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconTableRowRemove, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });
});
