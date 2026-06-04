import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseCard from './BaseCard.vue';

describe('BaseCard', () => {
  it('renders default slot content', () => {
    const wrapper = mount(BaseCard, { slots: { default: 'Card body' } });
    expect(wrapper.find('.base-card__body').text()).toBe('Card body');
  });

  it('renders an <article> element', () => {
    const wrapper = mount(BaseCard);
    expect(wrapper.element.tagName).toBe('ARTICLE');
    expect(wrapper.classes()).toContain('base-card');
  });

  it('applies default padding class (md)', () => {
    const wrapper = mount(BaseCard);
    expect(wrapper.classes()).toContain('base-card--padding-md');
  });

  it('applies custom padding class', () => {
    const wrapper = mount(BaseCard, { props: { padding: 'lg' } });
    expect(wrapper.classes()).toContain('base-card--padding-lg');
  });

  it('applies bordered class by default', () => {
    const wrapper = mount(BaseCard);
    expect(wrapper.classes()).toContain('base-card--bordered');
  });

  it('does not apply bordered class when bordered is false', () => {
    const wrapper = mount(BaseCard, { props: { bordered: false } });
    expect(wrapper.classes()).not.toContain('base-card--bordered');
  });

  it('applies shadow class when shadow prop is true', () => {
    const wrapper = mount(BaseCard, { props: { shadow: true } });
    expect(wrapper.classes()).toContain('base-card--shadow');
  });

  it('renders header slot when provided', () => {
    const wrapper = mount(BaseCard, { slots: { header: 'Card Header' } });
    expect(wrapper.find('.base-card__header').exists()).toBe(true);
    expect(wrapper.find('.base-card__header').text()).toBe('Card Header');
  });

  it('does not render header when header slot is not provided', () => {
    const wrapper = mount(BaseCard);
    expect(wrapper.find('.base-card__header').exists()).toBe(false);
  });

  it('renders footer slot when provided', () => {
    const wrapper = mount(BaseCard, { slots: { footer: 'Card Footer' } });
    expect(wrapper.find('.base-card__footer').exists()).toBe(true);
    expect(wrapper.find('.base-card__footer').text()).toBe('Card Footer');
  });

  it('does not render footer when footer slot is not provided', () => {
    const wrapper = mount(BaseCard);
    expect(wrapper.find('.base-card__footer').exists()).toBe(false);
  });
});
