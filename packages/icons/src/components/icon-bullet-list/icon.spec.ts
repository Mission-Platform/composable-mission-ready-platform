import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconBulletList from './icon.vue';

describe('IconBulletList', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconBulletList);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies numeric size as rem', () => {
    const wrapper = mount(IconBulletList, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('2rem');
    expect(svg.attributes('height')).toBe('2rem');
  });

  it('applies named size token', () => {
    const wrapper = mount(IconBulletList, { props: { size: 'lg' } });
    expect(wrapper.find('svg').attributes('width')).toContain('mp-size-icon-lg');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconBulletList, { props: { ariaLabel: 'Test label' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Test label');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconBulletList, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });
});
