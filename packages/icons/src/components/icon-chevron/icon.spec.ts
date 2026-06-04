import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import IconChevron from './icon.vue';

describe('IconChevron', () => {
  it('renders without errors', () => {
    const wrapper = mount(IconChevron);
    expect(wrapper.exists()).toBe(true);
  });

  it('applies size prop', () => {
    const wrapper = mount(IconChevron, { props: { size: 32 } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('width')).toBe('32px');
    expect(svg.attributes('height')).toBe('32px');
  });

  it('applies rotation for each direction', () => {
    const cases: Array<['up' | 'right' | 'down' | 'left', string]> = [
      ['down', 'rotate(0deg)'],
      ['up', 'rotate(180deg)'],
      ['right', 'rotate(270deg)'],
      ['left', 'rotate(90deg)'],
    ];
    for (const [direction, expectedTransform] of cases) {
      const wrapper = mount(IconChevron, { props: { direction } });
      const svg = wrapper.find('svg');
      expect(svg.attributes('style')).toContain(expectedTransform);
    }
  });

  it('hides from a11y when ariaLabel is undefined', () => {
    const wrapper = mount(IconChevron, { props: { ariaLabel: undefined } });
    const svg = wrapper.find('svg');
    expect(svg.attributes('aria-hidden')).toBeTruthy();
  });
});
