import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BasePagination from './base-pagination.vue';

describe('BasePagination', () => {
  it('renders a <nav> with the aria-label', () => {
    const wrapper = mount(BasePagination, { props: { pageCount: 5 } });
    expect(wrapper.element.tagName).toBe('NAV');
    expect(wrapper.attributes('aria-label')).toBe('Pagination');
  });

  it('renders a button per page when the count is small', () => {
    const wrapper = mount(BasePagination, { props: { pageCount: 5, modelValue: 1, showPrevNext: false } });
    const pageButtons = wrapper.findAll('.base-pagination__btn');
    expect(pageButtons).toHaveLength(5);
  });

  it('marks the current page with aria-current', () => {
    const wrapper = mount(BasePagination, { props: { pageCount: 5, modelValue: 3, showPrevNext: false } });
    const active = wrapper.find('.base-pagination__btn--active');
    expect(active.text()).toBe('3');
    expect(active.attributes('aria-current')).toBe('page');
  });

  it('derives the page count from total and pageSize', () => {
    const wrapper = mount(BasePagination, { props: { total: 95, pageSize: 10, showPrevNext: false } });
    // 95 / 10 => 10 pages; with boundary/sibling defaults this truncates with an ellipsis.
    expect(wrapper.text()).toContain('10');
    expect(wrapper.find('.base-pagination__ellipsis').exists()).toBe(true);
  });

  it('emits update:modelValue and change when a page is clicked', async () => {
    const wrapper = mount(BasePagination, { props: { pageCount: 5, modelValue: 1, showPrevNext: false } });
    const buttons = wrapper.findAll('.base-pagination__btn');
    await buttons[2].trigger('click'); // page 3
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3]);
    expect(wrapper.emitted('change')?.[0]).toEqual([3]);
  });

  it('navigates with the previous/next buttons', async () => {
    const wrapper = mount(BasePagination, { props: { pageCount: 5, modelValue: 2 } });
    await wrapper.find('.base-pagination__btn--next').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3]);
    await wrapper.find('.base-pagination__btn--prev').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([1]);
  });

  it('disables previous on the first page and next on the last page', () => {
    const first = mount(BasePagination, { props: { pageCount: 5, modelValue: 1 } });
    expect((first.find('.base-pagination__btn--prev').element as HTMLButtonElement).disabled).toBe(true);
    const last = mount(BasePagination, { props: { pageCount: 5, modelValue: 5 } });
    expect((last.find('.base-pagination__btn--next').element as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders edge buttons when showEdges is true', () => {
    const wrapper = mount(BasePagination, { props: { pageCount: 5, showEdges: true } });
    expect(wrapper.findAll('.base-pagination__btn--edge')).toHaveLength(2);
  });

  it('does not emit when clicking the active page', async () => {
    const wrapper = mount(BasePagination, { props: { pageCount: 5, modelValue: 2, showPrevNext: false } });
    const buttons = wrapper.findAll('.base-pagination__btn');
    await buttons[1].trigger('click'); // page 2 (active)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
