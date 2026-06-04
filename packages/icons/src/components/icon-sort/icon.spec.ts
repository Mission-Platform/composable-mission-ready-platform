import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconSort from './icon.vue';

describe('IconSort', () => {
  it('renders an svg element', () => {
    const wrapper = mount(IconSort);
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('applies the correct class', () => {
    const wrapper = mount(IconSort);
    expect(wrapper.find('svg').classes()).toContain('base-icon-sort');
  });

  it('applies numeric size as px', () => {
    const wrapper = mount(IconSort, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('32px');
    expect(svg.attributes('height')).toBe('32px');
  });

  it('applies named size token', () => {
    const wrapper = mount(IconSort, { props: { size: 'lg' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toContain('mp-size-icon-lg');
  });

  it('applies ariaLabel when provided', () => {
    const wrapper = mount(IconSort, { props: { ariaLabel: 'Sort column' } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-label')).toBe('Sort column');
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconSort, { props: { ariaLabel: undefined } });
    expect(wrapper.find('svg').attributes('aria-hidden')).toBeTruthy();
  });

  it('fills the up arrow path when active and direction is asc', () => {
    const wrapper = mount(IconSort, { props: { active: true, direction: 'asc', color: '#ff0000' } });
    const paths = wrapper.findAll('path');
    expect(paths[0].attributes('fill')).toBe('#ff0000');
    expect(paths[1].attributes('fill')).toBe('none');
  });

  it('fills the down arrow path when active and direction is desc', () => {
    const wrapper = mount(IconSort, {
      props: { active: true, direction: 'desc', color: '#ff0000' },
    });
    const paths = wrapper.findAll('path');
    expect(paths[0].attributes('fill')).toBe('none');
    expect(paths[1].attributes('fill')).toBe('#ff0000');
  });

  it('fills neither path when inactive', () => {
    const wrapper = mount(IconSort, { props: { active: false, direction: 'asc' } });
    const paths = wrapper.findAll('path');
    expect(paths[0].attributes('fill')).toBe('none');
    expect(paths[1].attributes('fill')).toBe('none');
  });

  it('fills neither path when active but direction is null', () => {
    const wrapper = mount(IconSort, { props: { active: true, direction: undefined } });
    const paths = wrapper.findAll('path');
    expect(paths[0].attributes('fill')).toBe('none');
    expect(paths[1].attributes('fill')).toBe('none');
  });
});
