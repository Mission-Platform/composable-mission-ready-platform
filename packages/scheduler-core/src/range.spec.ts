import { describe, expect, it } from 'vitest';

import { startOfDay } from './dates';
import { stepAnchor, visibleRangeFor } from './range';

/** Days between two dates (rounded). */
function spanDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

describe('visibleRangeFor', () => {
  const anchor = new Date('2024-03-13T12:00:00'); // a Wednesday

  it('spans one day for the day view', () => {
    const { start, end } = visibleRangeFor('day', anchor);
    expect(start).toEqual(startOfDay(anchor));
    expect(spanDays(start, end)).toBe(1);
  });

  it('spans three days for the three-day view', () => {
    const { start, end } = visibleRangeFor('three-day', anchor);
    expect(spanDays(start, end)).toBe(3);
  });

  it('spans seven days for the week view, honouring weekStartsOn', () => {
    const sunday = visibleRangeFor('week', anchor, 0);
    expect(spanDays(sunday.start, sunday.end)).toBe(7);
    expect(sunday.start.getDay()).toBe(0); // Sunday
    const monday = visibleRangeFor('week', anchor, 1);
    expect(monday.start.getDay()).toBe(1); // Monday
  });

  it('spans the calendar month for the month view', () => {
    const { start, end } = visibleRangeFor('month', anchor);
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(2); // March
    expect(end.getMonth()).toBe(3); // April
  });

  it('spans the calendar year for the year view', () => {
    const { start, end } = visibleRangeFor('year', anchor);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2025);
  });
});

describe('stepAnchor', () => {
  const anchor = new Date('2024-03-15T00:00:00');

  it('steps the day view by one day', () => {
    expect(stepAnchor('day', anchor, 1).getDate()).toBe(16);
    expect(stepAnchor('day', anchor, -1).getDate()).toBe(14);
  });

  it('steps the three-day view by three days', () => {
    expect(stepAnchor('three-day', anchor, 1).getDate()).toBe(18);
  });

  it('steps the week view by seven days', () => {
    expect(stepAnchor('week', anchor, 1).getDate()).toBe(22);
  });

  it('steps the month view by one month', () => {
    expect(stepAnchor('month', anchor, 1).getMonth()).toBe(3); // April
  });

  it('steps the year view by one year', () => {
    expect(stepAnchor('year', anchor, 1).getFullYear()).toBe(2025);
  });
});
