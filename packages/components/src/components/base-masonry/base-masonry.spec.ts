import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseMasonry from './base-masonry.vue';

describe('BaseMasonry', () => {
  it('renders a div with the masonry class by default', () => {
    const wrapper = mountWithI18n(BaseMasonry);
    const root = wrapper.find('.base-masonry');
    expect(root.exists()).toBe(true);
    expect(root.element.tagName).toBe('DIV');
  });

  it('sets a fixed column-count from the columns prop', () => {
    const wrapper = mountWithI18n(BaseMasonry, { props: { columns: 4 } });
    const style = wrapper.find('.base-masonry').attributes('style') ?? '';
    expect(style).toContain('column-count: 4');
  });

  it('uses column-width (not column-count) when minColumnWidth is set', () => {
    const wrapper = mountWithI18n(BaseMasonry, { props: { columns: 4, minColumnWidth: '16rem' } });
    const style = wrapper.find('.base-masonry').attributes('style') ?? '';
    expect(style).toContain('column-width: 16rem');
    expect(style).not.toContain('column-count');
  });

  it('maps the named gap scale onto a --mp-spacing-* token', () => {
    const wrapper = mountWithI18n(BaseMasonry, { props: { gap: 'lg' } });
    const style = wrapper.find('.base-masonry').attributes('style') ?? '';
    expect(style).toContain('column-gap: var(--mp-spacing-6)');
    expect(style).toContain('--mp-masonry-gap: var(--mp-spacing-6)');
  });

  it('clamps columns to at least 1', () => {
    const wrapper = mountWithI18n(BaseMasonry, { props: { columns: 0 } });
    expect(wrapper.find('.base-masonry').attributes('style')).toContain('column-count: 1');
  });

  it('renders default-slot content', () => {
    const wrapper = mountWithI18n(BaseMasonry, {
      slots: { default: '<div class="card">A</div><div class="card">B</div>' },
    });
    expect(wrapper.findAll('.card')).toHaveLength(2);
  });

  it('renders one break-safe wrapper per item via the scoped item slot', () => {
    const wrapper = mountWithI18n(BaseMasonry, {
      props: { items: ['a', 'b', 'c'] },
      slots: { item: '<span class="cell">{{ params.item }}-{{ params.index }}</span>' },
    });
    const wrappers = wrapper.findAll('.base-masonry__item');
    expect(wrappers).toHaveLength(3);
    expect(wrapper.findAll('.cell').map((c) => c.text())).toEqual(['a-0', 'b-1', 'c-2']);
  });

  it('renders as a custom element when `as` is provided', () => {
    const wrapper = mountWithI18n(BaseMasonry, { props: { as: 'section' } });
    expect(wrapper.find('.base-masonry').element.tagName).toBe('SECTION');
  });
});
