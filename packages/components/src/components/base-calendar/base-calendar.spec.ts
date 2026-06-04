import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mountWithI18n } from '../../test-utils/mount-with-i18n';

import BaseCalendar from './base-calendar.vue';

// Pin "today" to a known date so tests are deterministic.
// 2025-06-01 is a Sunday → first day of month aligns with grid column 0 (no leading blanks).
const FIXED_TODAY = '2025-06-01';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('BaseCalendar', () => {
  it('renders a calendar wrapper', () => {
    const wrapper = mountWithI18n(BaseCalendar);
    expect(wrapper.find('.base-calendar').exists()).toBe(true);
  });

  it('renders 7 weekday headers', () => {
    const wrapper = mountWithI18n(BaseCalendar);
    expect(wrapper.findAll('.base-calendar__weekday')).toHaveLength(7);
  });

  it('renders the correct number of day cells for June 2025 (30 days, starts Sunday = no blanks)', () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-06-01' } });
    const days = wrapper.findAll('.base-calendar__day');
    expect(days).toHaveLength(30);
  });

  it('shows the month and year in the header', () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-06-15' } });
    expect(wrapper.find('.base-calendar__header').text()).toContain('June');
    expect(wrapper.find('.base-calendar__header').text()).toContain('2025');
  });

  it('marks the selected date with --selected modifier', () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-06-15' } });
    const selected = wrapper.findAll('.base-calendar__day--selected');
    expect(selected).toHaveLength(1);
    expect(selected[0].attributes('aria-label')).toBe('2025-06-15');
  });

  it('marks today with --today modifier and not --selected when no selection', () => {
    const wrapper = mountWithI18n(BaseCalendar);
    const today = wrapper.findAll('.base-calendar__day--today');
    expect(today).toHaveLength(1);
    expect(today[0].attributes('aria-label')).toBe(FIXED_TODAY);
  });

  it('today is NOT marked --today when it is also selected', () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: FIXED_TODAY } });
    expect(wrapper.findAll('.base-calendar__day--today')).toHaveLength(0);
    expect(wrapper.findAll('.base-calendar__day--selected')).toHaveLength(1);
  });

  it('emits update:modelValue when a day is clicked', async () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-06-01' } });
    const day15 = wrapper.findAll('.base-calendar__day').find((b) => b.attributes('aria-label') === '2025-06-15');
    await day15!.trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['2025-06-15']);
  });

  it('emits change when a day is clicked', async () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-06-01' } });
    const day10 = wrapper.findAll('.base-calendar__day').find((b) => b.attributes('aria-label') === '2025-06-10');
    await day10!.trigger('click');
    expect(wrapper.emitted('change')?.[0]).toEqual(['2025-06-10']);
  });

  it('navigates to the previous month via prev button', async () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-06-01' } });
    await wrapper.find('[aria-label="Previous month"]').trigger('click');
    expect(wrapper.find('.base-calendar__header').text()).toContain('May');
    expect(wrapper.find('.base-calendar__header').text()).toContain('2025');
  });

  it('navigates to the next month via next button', async () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-06-01' } });
    await wrapper.find('[aria-label="Next month"]').trigger('click');
    expect(wrapper.find('.base-calendar__header').text()).toContain('July');
    expect(wrapper.find('.base-calendar__header').text()).toContain('2025');
  });

  it('wraps year correctly when navigating past December', async () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-12-01' } });
    await wrapper.find('[aria-label="Next month"]').trigger('click');
    expect(wrapper.find('.base-calendar__header').text()).toContain('January');
    expect(wrapper.find('.base-calendar__header').text()).toContain('2026');
  });

  it('wraps year correctly when navigating before January', async () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-01-01' } });
    await wrapper.find('[aria-label="Previous month"]').trigger('click');
    expect(wrapper.find('.base-calendar__header').text()).toContain('December');
    expect(wrapper.find('.base-calendar__header').text()).toContain('2024');
  });

  it('disables dates before min', () => {
    const wrapper = mountWithI18n(BaseCalendar, {
      props: { modelValue: '2025-06-15', min: '2025-06-10' },
    });
    const day9 = wrapper.findAll('.base-calendar__day').find((b) => b.attributes('aria-label') === '2025-06-09');
    expect(day9?.classes()).toContain('base-calendar__day--disabled');
    expect(day9?.attributes('disabled')).toBeDefined();
  });

  it('does not disable dates on or after min', () => {
    const wrapper = mountWithI18n(BaseCalendar, {
      props: { modelValue: '2025-06-15', min: '2025-06-10' },
    });
    const day10 = wrapper.findAll('.base-calendar__day').find((b) => b.attributes('aria-label') === '2025-06-10');
    expect(day10?.classes()).not.toContain('base-calendar__day--disabled');
  });

  it('disables dates after max', () => {
    const wrapper = mountWithI18n(BaseCalendar, {
      props: { modelValue: '2025-06-15', max: '2025-06-20' },
    });
    const day21 = wrapper.findAll('.base-calendar__day').find((b) => b.attributes('aria-label') === '2025-06-21');
    expect(day21?.classes()).toContain('base-calendar__day--disabled');
  });

  it('disables explicitly listed dates', () => {
    const wrapper = mountWithI18n(BaseCalendar, {
      props: { modelValue: '2025-06-01', disabledDates: ['2025-06-05', '2025-06-12'] },
    });
    const day5 = wrapper.findAll('.base-calendar__day').find((b) => b.attributes('aria-label') === '2025-06-05');
    const day12 = wrapper.findAll('.base-calendar__day').find((b) => b.attributes('aria-label') === '2025-06-12');
    expect(day5?.classes()).toContain('base-calendar__day--disabled');
    expect(day12?.classes()).toContain('base-calendar__day--disabled');
  });

  it('does not emit when a disabled date is clicked', async () => {
    const wrapper = mountWithI18n(BaseCalendar, {
      props: { modelValue: '2025-06-15', min: '2025-06-10' },
    });
    // day 5 is before min, so disabled
    const day5 = wrapper.findAll('.base-calendar__day').find((b) => b.attributes('aria-label') === '2025-06-05');
    await day5!.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('renders leading empty cells for months not starting on Sunday', () => {
    // July 2025 starts on a Tuesday → offset = 2
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-07-01' } });
    const emptyCells = wrapper.findAll('.base-calendar__day--empty');
    expect(emptyCells.length).toBe(2);
  });

  it('applies --sm size class', () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { size: 'sm' } });
    expect(wrapper.find('.base-calendar').classes()).toContain('base-calendar--sm');
  });

  it('applies --lg size class', () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { size: 'lg' } });
    expect(wrapper.find('.base-calendar').classes()).toContain('base-calendar--lg');
  });

  it('uses Luxon to compute correct month boundaries', () => {
    // February 2024 is a leap year — 29 days, starts on Thursday (offset 4)
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2024-02-01' } });
    const allDays = wrapper.findAll('.base-calendar__day');
    // 4 empty + 29 real = 33 total cells
    expect(allDays).toHaveLength(33);
    const emptyCells = wrapper.findAll('.base-calendar__day--empty');
    expect(emptyCells).toHaveLength(4);
    // Last day should be 29
    const lastDay = allDays.at(-1)!;
    expect(lastDay.attributes('aria-label')).toBe('2024-02-29');
  });

  it('keeps today correct using Luxon in the specified timezone', () => {
    // When timezone is UTC, today should still be 2025-06-01 (our mocked time is noon UTC)
    const wrapper = mountWithI18n(BaseCalendar, {
      props: { modelValue: '2025-06-01', timezone: 'UTC' },
    });
    const today = wrapper.find('.base-calendar__day--selected');
    expect(today.attributes('aria-label')).toBe('2025-06-01');
  });

  it('correctly uses Luxon DateTime.fromISO with timezone for min comparison', () => {
    // Verifies that min works with a timezone-aware ISO date
    const wrapper = mountWithI18n(BaseCalendar, {
      props: {
        modelValue: '2025-06-15',
        min: '2025-06-10',
        timezone: 'America/New_York',
      },
    });
    const day9 = wrapper.findAll('.base-calendar__day').find((b) => b.attributes('aria-label') === '2025-06-09');
    expect(day9?.classes()).toContain('base-calendar__day--disabled');
  });

  it('syncs view month when modelValue changes externally', async () => {
    const wrapper = mountWithI18n(BaseCalendar, { props: { modelValue: '2025-06-01' } });
    expect(wrapper.find('.base-calendar__header').text()).toContain('June');
    await wrapper.setProps({ modelValue: '2025-09-01' });
    expect(wrapper.find('.base-calendar__header').text()).toContain('September');
  });
});
