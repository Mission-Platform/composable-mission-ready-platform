import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconExternalLink from './icon.vue';

describe('IconExternalLink', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconExternalLink);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies size prop', () => {
    const wrapper = mount(IconExternalLink, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('2rem');
    expect(svg.attributes('height')).toBe('2rem');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconExternalLink, { props: { ariaLabel: 'Test label' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Test label');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconExternalLink, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });
});
