import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconTableColumnRemove from './icon.vue';

describe('IconTableColumnRemove', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconTableColumnRemove);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies numeric size as px', () => {
    const wrapper = mount(IconTableColumnRemove, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('32px');
    expect(svg.attributes('height')).toBe('32px');
  });

  it('applies named size token', () => {
    const wrapper = mount(IconTableColumnRemove, { props: { size: 'lg' } });
    expect(wrapper.find('svg').attributes('width')).toContain('mp-size-icon-lg');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconTableColumnRemove, { props: { ariaLabel: 'Test label' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Test label');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconTableColumnRemove, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });
});
