import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseStack from './base-stack.vue';

describe('BaseStack', () => {
  it('renders a flex div with the stack class by default', () => {
    const wrapper = mountWithI18n(BaseStack);
    const root = wrapper.find('.base-stack');
    expect(root.exists()).toBe(true);
    expect(root.element.tagName).toBe('DIV');
    const style = root.attributes('style') ?? '';
    expect(style).toContain('display: flex');
  });

  it('stacks vertically (column) by default', () => {
    const wrapper = mountWithI18n(BaseStack);
    const root = wrapper.find('.base-stack');
    expect(root.classes()).toContain('base-stack--vertical');
    expect(root.attributes('style') ?? '').toContain('flex-direction: column');
  });

  it('stacks horizontally (row) when direction is horizontal', () => {
    const wrapper = mountWithI18n(BaseStack, { props: { direction: 'horizontal' } });
    const root = wrapper.find('.base-stack');
    expect(root.classes()).toContain('base-stack--horizontal');
    expect(root.attributes('style') ?? '').toContain('flex-direction: row');
  });

  it('maps the named gap scale onto a --mp-spacing-* token', () => {
    const wrapper = mountWithI18n(BaseStack, { props: { gap: 'lg' } });
    expect(wrapper.find('.base-stack').attributes('style') ?? '').toContain('gap: var(--mp-spacing-6)');
  });

  it('maps justify onto justify-content and align onto align-items', () => {
    const wrapper = mountWithI18n(BaseStack, { props: { justify: 'between', align: 'center' } });
    const style = wrapper.find('.base-stack').attributes('style') ?? '';
    expect(style).toContain('justify-content: space-between');
    expect(style).toContain('align-items: center');
  });

  it('toggles flex wrapping via the wrap prop', () => {
    const wrapper = mountWithI18n(BaseStack, { props: { wrap: true } });
    expect(wrapper.find('.base-stack').attributes('style') ?? '').toContain('flex-wrap: wrap');
  });

  it('renders as an inline-flex container when inline is set', () => {
    const wrapper = mountWithI18n(BaseStack, { props: { inline: true } });
    expect(wrapper.find('.base-stack').attributes('style') ?? '').toContain('display: inline-flex');
  });

  it('renders default-slot content', () => {
    const wrapper = mountWithI18n(BaseStack, {
      slots: { default: '<span class="item">A</span><span class="item">B</span>' },
    });
    expect(wrapper.findAll('.item')).toHaveLength(2);
  });

  it('renders as a custom element when `as` is provided', () => {
    const wrapper = mountWithI18n(BaseStack, { props: { as: 'section' } });
    expect(wrapper.find('.base-stack').element.tagName).toBe('SECTION');
  });
});
