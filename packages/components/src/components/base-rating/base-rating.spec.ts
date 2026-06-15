import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { expectNoA11yViolations, mountForA11y, runAxe } from '../../test-utils/axe';

import BaseRating from './base-rating.vue';

describe('BaseRating', () => {
  it('renders max stars', () => {
    const wrapper = mount(BaseRating, { props: { max: 5 } });
    expect(wrapper.findAll('.base-rating__star')).toHaveLength(5);
  });

  it('exposes role="slider" with aria values when interactive', () => {
    const wrapper = mount(BaseRating, { props: { modelValue: 3, max: 5 } });
    expect(wrapper.attributes('role')).toBe('slider');
    expect(wrapper.attributes('aria-valuenow')).toBe('3');
    expect(wrapper.attributes('aria-valuemax')).toBe('5');
    expect(wrapper.attributes('tabindex')).toBe('0');
  });

  it('exposes role="img" and a descriptive label when read-only', () => {
    const wrapper = mount(BaseRating, { props: { modelValue: 4, readonly: true } });
    expect(wrapper.attributes('role')).toBe('img');
    expect(wrapper.attributes('aria-label')).toContain('4 out of 5');
    expect(wrapper.attributes('tabindex')).toBeUndefined();
  });

  it('fills stars according to the value', () => {
    const wrapper = mount(BaseRating, { props: { modelValue: 2, max: 5 } });
    const fills = wrapper.findAll('.base-rating__fill');
    expect((fills[0].element as HTMLElement).style.width).toBe('100%');
    expect((fills[1].element as HTMLElement).style.width).toBe('100%');
    expect((fills[2].element as HTMLElement).style.width).toBe('0%');
  });

  it('emits the clicked value', async () => {
    const wrapper = mount(BaseRating, { props: { modelValue: 0, max: 5 } });
    const hits = wrapper.findAll('.base-rating__hit--full');
    await hits[2].trigger('click'); // 3rd star
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3]);
    expect(wrapper.emitted('change')?.[0]).toEqual([3]);
  });

  it('supports half-star precision', async () => {
    const wrapper = mount(BaseRating, { props: { modelValue: 0, max: 5, allowHalf: true } });
    const halfHits = wrapper.findAll('.base-rating__hit--half');
    await halfHits[1].trigger('click'); // half of 2nd star => 1.5
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1.5]);
  });

  it('clears the value when clearable and the same value is clicked', async () => {
    const wrapper = mount(BaseRating, { props: { modelValue: 3, max: 5, clearable: true } });
    const hits = wrapper.findAll('.base-rating__hit--full');
    await hits[2].trigger('click'); // click current value (3) => 0
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0]);
  });

  it('does not emit when readonly', async () => {
    const wrapper = mount(BaseRating, { props: { modelValue: 2, readonly: true } });
    expect(wrapper.findAll('.base-rating__hit')).toHaveLength(0);
  });

  it('increments and decrements with arrow keys', async () => {
    const wrapper = mount(BaseRating, { props: { modelValue: 2, max: 5 } });
    await wrapper.trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3]);
    await wrapper.trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([1]);
    await wrapper.trigger('keydown', { key: 'Home' });
    expect(wrapper.emitted('update:modelValue')?.[2]).toEqual([0]);
    await wrapper.trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('update:modelValue')?.[3]).toEqual([5]);
  });
});

describe('BaseRating accessibility (WCAG AAA)', () => {
  it('has no violations in interactive mode', async () => {
    const wrapper = mountForA11y(BaseRating, { props: { modelValue: 3, max: 5, ariaLabel: 'Overall rating' } });
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });

  it('has no violations with half-star precision', async () => {
    const wrapper = mountForA11y(BaseRating, { props: { modelValue: 2.5, max: 5, allowHalf: true } });
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });

  it('has no violations in read-only mode', async () => {
    const wrapper = mountForA11y(BaseRating, { props: { modelValue: 4, max: 5, readonly: true } });
    await expectNoA11yViolations(wrapper.element);
    wrapper.unmount();
  });

  // Regression guard: the mouse hit-targets must stay out of the accessibility
  // tree (plain aria-hidden <span>s) so the role="slider" exposes no nested
  // interactive controls to assistive technology.
  it('exposes no nested interactive controls', async () => {
    const wrapper = mountForA11y(BaseRating, { props: { modelValue: 3, max: 5, allowHalf: true } });
    expect(wrapper.find('.base-rating__hit').element.tagName).toBe('SPAN');
    expect(wrapper.find('.base-rating__hit').attributes('aria-hidden')).toBe('true');
    expect(wrapper.findAll('button')).toHaveLength(0);

    const { violations } = await runAxe(wrapper.element);
    expect(violations.map((v) => v.id)).not.toContain('nested-interactive');
    wrapper.unmount();
  });
});
