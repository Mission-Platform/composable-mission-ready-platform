import { describe, expect, it } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseGrid from './base-grid.vue';

describe('BaseGrid', () => {
  it('renders a div with the grid class by default', () => {
    const wrapper = mountWithI18n(BaseGrid);
    const root = wrapper.find('.base-grid');
    expect(root.exists()).toBe(true);
    expect(root.element.tagName).toBe('DIV');
  });

  it('sets grid templates from rows (m) and cols (n)', () => {
    const wrapper = mountWithI18n(BaseGrid, { props: { rows: 2, cols: 3 } });
    const style = wrapper.find('.base-grid').attributes('style') ?? '';
    expect(style).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(style).toContain('grid-template-rows: repeat(2, minmax(0, auto))');
  });

  it('renders rows * cols cells via the scoped cell slot', () => {
    const wrapper = mountWithI18n(BaseGrid, {
      props: { rows: 2, cols: 3 },
      slots: {
        cell: '<div class="cell" />',
      },
    });
    expect(wrapper.findAll('.cell')).toHaveLength(6);
  });

  it('exposes zero-based row, column, and index to the cell slot', () => {
    const wrapper = mountWithI18n(BaseGrid, {
      props: { rows: 2, cols: 2 },
      slots: {
        cell: '<div class="cell">{{ params.row }}-{{ params.column }}-{{ params.index }}</div>',
      },
    });
    const cells = wrapper.findAll('.cell').map((cell) => cell.text());
    expect(cells).toEqual(['0-0-0', '0-1-1', '1-0-2', '1-1-3']);
  });

  it('renders default-slot content when no cell slot is provided', () => {
    const wrapper = mountWithI18n(BaseGrid, {
      props: { rows: 1, cols: 2 },
      slots: {
        default: '<span class="item">A</span><span class="item">B</span>',
      },
    });
    expect(wrapper.findAll('.item')).toHaveLength(2);
  });

  it('maps the named gap scale onto --mp-spacing-* tokens on both axes', () => {
    const wrapper = mountWithI18n(BaseGrid, { props: { rows: 2, cols: 2, gap: 'lg' } });
    const style = wrapper.find('.base-grid').attributes('style') ?? '';
    expect(style).toContain('row-gap: var(--mp-spacing-6)');
    expect(style).toContain('column-gap: var(--mp-spacing-6)');
  });

  it('lets rowGap / columnGap override gap with their own named steps', () => {
    const wrapper = mountWithI18n(BaseGrid, {
      props: { rows: 2, cols: 2, gap: 'md', rowGap: '2xs', columnGap: '2xl' },
    });
    const style = wrapper.find('.base-grid').attributes('style') ?? '';
    expect(style).toContain('row-gap: var(--mp-spacing-1)');
    expect(style).toContain('column-gap: var(--mp-spacing-12)');
  });

  it('defaults justify-items and align-items to stretch', () => {
    const wrapper = mountWithI18n(BaseGrid, { props: { rows: 2, cols: 2 } });
    const style = wrapper.find('.base-grid').attributes('style') ?? '';
    expect(style).toContain('justify-items: stretch');
    expect(style).toContain('align-items: stretch');
  });

  it('maps justify onto justify-items and align onto align-items', () => {
    const wrapper = mountWithI18n(BaseGrid, {
      props: { rows: 2, cols: 2, justify: 'center', align: 'end' },
    });
    const style = wrapper.find('.base-grid').attributes('style') ?? '';
    expect(style).toContain('justify-items: center');
    expect(style).toContain('align-items: end');
  });

  it('clamps rows and cols to at least 1', () => {
    const wrapper = mountWithI18n(BaseGrid, { props: { rows: 0, cols: -2 } });
    const style = wrapper.find('.base-grid').attributes('style') ?? '';
    expect(style).toContain('grid-template-columns: repeat(1, minmax(0, 1fr))');
    expect(style).toContain('grid-template-rows: repeat(1, minmax(0, auto))');
  });

  it('renders as a custom element when `as` is provided', () => {
    const wrapper = mountWithI18n(BaseGrid, { props: { as: 'section' } });
    expect(wrapper.find('.base-grid').element.tagName).toBe('SECTION');
  });
});
