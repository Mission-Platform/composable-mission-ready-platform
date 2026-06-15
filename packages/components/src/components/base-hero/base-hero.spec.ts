import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseHero from './base-hero.vue';

describe('BaseHero', () => {
  it('renders a <section> root by default', () => {
    const wrapper = mount(BaseHero);
    expect(wrapper.element.tagName).toBe('SECTION');
  });

  it('renders the title, subtitle, and eyebrow props', () => {
    const wrapper = mount(BaseHero, {
      props: { eyebrow: 'New', title: 'Welcome', subtitle: 'Get started today' },
    });
    expect(wrapper.find('.base-hero__eyebrow').text()).toBe('New');
    expect(wrapper.find('.base-hero__title').text()).toBe('Welcome');
    expect(wrapper.find('.base-hero__subtitle').text()).toBe('Get started today');
  });

  it('applies default align and size classes', () => {
    const wrapper = mount(BaseHero);
    expect(wrapper.classes()).toContain('base-hero--align-start');
    expect(wrapper.classes()).toContain('base-hero--md');
  });

  it('applies the alignment class', () => {
    for (const align of ['start', 'center', 'end'] as const) {
      const wrapper = mount(BaseHero, { props: { align } });
      expect(wrapper.classes()).toContain(`base-hero--align-${align}`);
    }
  });

  it('applies full-height and renders media + overlay', () => {
    const wrapper = mount(BaseHero, {
      props: { fullHeight: true, overlay: true },
      slots: { media: '<img src="x" alt="" />' },
    });
    expect(wrapper.classes()).toContain('base-hero--full-height');
    expect(wrapper.classes()).toContain('base-hero--has-media');
    expect(wrapper.classes()).toContain('base-hero--overlay');
    expect(wrapper.find('.base-hero__media img').exists()).toBe(true);
  });

  it('does not render the actions container without an actions slot', () => {
    const wrapper = mount(BaseHero, { props: { title: 'Hi' } });
    expect(wrapper.find('.base-hero__actions').exists()).toBe(false);
  });

  it('renders the actions slot', () => {
    const wrapper = mount(BaseHero, {
      props: { title: 'Hi' },
      slots: { actions: '<button>Go</button>' },
    });
    expect(wrapper.find('.base-hero__actions button').exists()).toBe(true);
  });

  it('renders with a custom root element', () => {
    const wrapper = mount(BaseHero, { props: { as: 'header' } });
    expect(wrapper.element.tagName).toBe('HEADER');
  });
});
