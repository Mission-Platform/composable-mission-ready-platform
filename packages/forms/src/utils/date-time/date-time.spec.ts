import { describe, expect, it } from 'vitest';

import {
  browserTimezoneLabel,
  clamp,
  displayTime,
  formatDateRange,
  formatDateTime,
  formatTime,
  formatTimeRange,
  HOURS,
  MINUTES,
  pad,
  parseDate,
  parseDateTime,
  parseTime,
  range,
  SECONDS,
} from './date-time';

describe('date-time helpers', () => {
  it('pads numbers to two digits', () => {
    expect(pad(0)).toBe('00');
    expect(pad(9)).toBe('09');
    expect(pad(12)).toBe('12');
  });

  it('clamps values into an inclusive range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it('builds integer ranges and hour/minute/second lists', () => {
    expect(range(3)).toEqual([0, 1, 2]);
    expect(HOURS).toHaveLength(24);
    expect(MINUTES).toHaveLength(60);
    expect(SECONDS).toHaveLength(60);
    expect(HOURS[0]).toBe(0);
    expect(HOURS[23]).toBe(23);
  });

  it('parses and formats times with and without seconds', () => {
    expect(parseTime('')).toEqual({ h: 0, m: 0, s: 0 });
    expect(parseTime('09:05')).toEqual({ h: 9, m: 5, s: 0 });
    expect(parseTime('09:05:07')).toEqual({ h: 9, m: 5, s: 7 });
    expect(formatTime({ h: 9, m: 5, s: 7 }, false)).toBe('09:05');
    expect(formatTime({ h: 9, m: 5, s: 7 }, true)).toBe('09:05:07');
    expect(displayTime('', true)).toBe('');
    expect(displayTime('9:5:7', true)).toBe('09:05:07');
  });

  it('parses ISO dates and date-time strings', () => {
    expect(parseDate('')).toBeUndefined();
    expect(parseDate('not-a-date')).toBeUndefined();
    const date = parseDate('2024-01-15');
    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(0);
    expect(date?.getDate()).toBe(15);

    expect(parseDateTime('')).toEqual({ date: '', h: 0, m: 0, s: 0 });
    expect(parseDateTime('2024-01-15 09:30')).toEqual({ date: '2024-01-15', h: 9, m: 30, s: 0 });
    expect(parseDateTime('2024-01-15T09:30:45Z')).toEqual({ date: '2024-01-15', h: 9, m: 30, s: 45 });
  });

  it('formats date-times and ranges', () => {
    expect(formatDateTime('', { h: 1, m: 2, s: 3 }, true)).toBe('');
    expect(formatDateTime('2024-01-15', { h: 1, m: 2, s: 3 }, true)).toBe('2024-01-15 01:02:03');
    expect(formatDateTime('2024-01-15', { h: 1, m: 2, s: 3 }, false)).toBe('2024-01-15 01:02');

    expect(formatDateRange({ start: '', end: '' })).toBe('');
    expect(formatDateRange({ start: '2024-01-01', end: '' })).toBe('2024-01-01 → …');
    expect(formatDateRange({ start: '2024-01-01', end: '2024-01-31' })).toBe('2024-01-01 → 2024-01-31');

    expect(formatTimeRange({ start: '', end: '' }, false)).toBe('');
    expect(formatTimeRange({ start: '09:00', end: '17:30' }, false)).toBe('09:00 → 17:30');
    expect(formatTimeRange({ start: '', end: '17:30:05' }, true)).toBe('… → 17:30:05');
  });

  it('reports a browser timezone label', () => {
    const label = browserTimezoneLabel();
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });
});
