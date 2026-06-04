import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconLock from './icon.vue';

describe('IconLock', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconLock);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies size prop', () => {
    const wrapper = mount(IconLock, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('32px');
    expect(svg.attributes('height')).toBe('32px');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconLock, { props: { ariaLabel: 'Test label' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Test label');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconLock, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });

  it('does not apply open modifier class by default', () => {
    const wrapper = mount(IconLock);
    const svg = wrapper.find('svg');
    expect(svg.classes()).not.toContain('base-icon-lock--open');
  });

  it('applies open modifier class when open prop is true', () => {
    const wrapper = mount(IconLock, { props: { open: true } });
    const svg = wrapper.find('svg');
    expect(svg.classes()).toContain('base-icon-lock--open');
  });

  it('renders the shackle path element', () => {
    const wrapper = mount(IconLock);
    expect(wrapper.find('.base-icon-lock__shackle').exists()).toBe(true);
  });
});
