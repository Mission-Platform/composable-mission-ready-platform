import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseSegmentControl from './base-segment-control.vue';

const OPTIONS = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

describe('BaseSegmentControl', () => {
  it('renders a segment per option as role="radio"', () => {
    const wrapper = mount(BaseSegmentControl, { props: { options: OPTIONS } });
    const segments = wrapper.findAll('[role="radio"]');
    expect(segments).toHaveLength(3);
    expect(wrapper.attributes('role')).toBe('radiogroup');
  });

  it('marks the selected option with aria-checked', () => {
    const wrapper = mount(BaseSegmentControl, { props: { options: OPTIONS, modelValue: 'week' } });
    const segments = wrapper.findAll('[role="radio"]');
    expect(segments[1].attributes('aria-checked')).toBe('true');
    expect(segments[0].attributes('aria-checked')).toBe('false');
  });

  it('emits update:modelValue and change on click', async () => {
    const wrapper = mount(BaseSegmentControl, { props: { options: OPTIONS, modelValue: 'day' } });
    await wrapper.findAll('[role="radio"]')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['month']);
    expect(wrapper.emitted('change')?.[0]).toEqual(['month']);
  });

  it('does not emit when clicking the already-selected option', async () => {
    const wrapper = mount(BaseSegmentControl, { props: { options: OPTIONS, modelValue: 'day' } });
    await wrapper.findAll('[role="radio"]')[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('applies roving tabindex (selected is 0, others -1)', () => {
    const wrapper = mount(BaseSegmentControl, { props: { options: OPTIONS, modelValue: 'week' } });
    const segments = wrapper.findAll('[role="radio"]');
    expect(segments[1].attributes('tabindex')).toBe('0');
    expect(segments[0].attributes('tabindex')).toBe('-1');
  });

  it('moves selection with arrow keys', async () => {
    const wrapper = mount(BaseSegmentControl, { props: { options: OPTIONS, modelValue: 'day' } });
    await wrapper.findAll('[role="radio"]')[0].trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['week']);
  });

  it('wraps to the last option with ArrowLeft from the first', async () => {
    const wrapper = mount(BaseSegmentControl, { props: { options: OPTIONS, modelValue: 'day' } });
    await wrapper.findAll('[role="radio"]')[0].trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['month']);
  });

  it('disables individual segments and the whole control', () => {
    const disabledOption = mount(BaseSegmentControl, {
      props: {
        options: [
          { label: 'A', value: 'a', disabled: true },
          { label: 'B', value: 'b' },
        ],
      },
    });
    expect((disabledOption.findAll('[role="radio"]')[0].element as HTMLButtonElement).disabled).toBe(true);

    const allDisabled = mount(BaseSegmentControl, { props: { options: OPTIONS, disabled: true } });
    expect(allDisabled.classes()).toContain('base-segment-control--disabled');
  });
});
