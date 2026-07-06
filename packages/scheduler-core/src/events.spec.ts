import { describe, expect, it } from 'vitest';

import {
  createEvent,
  eventsForDay,
  eventsForRange,
  formatDuration,
  layoutDay,
  moveEventPatch,
  resizeEventPatch,
} from './events';

import type { VEvent } from './types';

function timed(uid: string, dtstart: string, dtend: string, extra: Partial<VEvent> = {}): VEvent {
  return { uid, dtstamp: '2024-01-01T00:00:00Z', dtstart, dtend, ...extra };
}

describe('eventsForRange', () => {
  const a = timed('a', '2024-03-10T09:00:00', '2024-03-10T10:00:00');
  const b = timed('b', '2024-03-20T09:00:00', '2024-03-20T10:00:00');
  const cancelled = timed('c', '2024-03-12T09:00:00', '2024-03-12T10:00:00', { status: 'CANCELLED' });

  it('returns only events overlapping the range, excluding CANCELLED', () => {
    const result = eventsForRange([a, b, cancelled], new Date('2024-03-09T00:00:00'), new Date('2024-03-15T00:00:00'));
    expect(result.map((event) => event.uid)).toEqual(['a']);
  });

  it('expands a recurring event within the range', () => {
    const recurring = timed('r', '2024-03-11T09:00:00', '2024-03-11T10:00:00', { rrule: { freq: 'DAILY', count: 10 } });
    const result = eventsForRange([recurring], new Date('2024-03-11T00:00:00'), new Date('2024-03-14T00:00:00'));
    expect(result).toHaveLength(3);
  });
});

describe('eventsForDay', () => {
  it('returns events on the given calendar day', () => {
    const a = timed('a', '2024-03-10T09:00:00', '2024-03-10T10:00:00');
    const b = timed('b', '2024-03-11T09:00:00', '2024-03-11T10:00:00');
    expect(eventsForDay([a, b], new Date('2024-03-10T15:00:00')).map((event) => event.uid)).toEqual(['a']);
  });
});

describe('createEvent', () => {
  it('generates a uid + timestamps', () => {
    const event = createEvent({ dtstart: '2024-03-10T09:00:00', dtend: '2024-03-10T10:00:00', summary: 'New' });
    expect(event.uid).toBeTruthy();
    expect(event.dtstamp).toBeTruthy();
    expect(event.created).toBeTruthy();
    expect(event.summary).toBe('New');
  });
});

describe('moveEventPatch', () => {
  it('shifts both endpoints by the delta', () => {
    const event = timed('a', '2024-03-10T09:00:00', '2024-03-10T10:00:00');
    const patch = moveEventPatch(event, 60 * 60 * 1000); // +1h
    expect(patch.dtstart).toContain('T10:00');
    expect(patch.dtend).toContain('T11:00');
  });
});

describe('resizeEventPatch', () => {
  it('extends the end by the delta', () => {
    const event = timed('a', '2024-03-10T09:00:00', '2024-03-10T10:00:00');
    expect(resizeEventPatch(event, 30 * 60 * 1000).dtend).toContain('T10:30');
  });

  it('clamps a timed event to a minimum 15-minute duration', () => {
    const event = timed('a', '2024-03-10T09:00:00', '2024-03-10T10:00:00');
    // Shrink by 2 hours — would invert; clamps to start + 15m.
    expect(resizeEventPatch(event, -2 * 60 * 60 * 1000).dtend).toContain('T09:15');
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(timed('a', '2024-03-10T09:00:00', '2024-03-10T10:30:00'))).toBe('1h 30m');
    expect(formatDuration(timed('a', '2024-03-10T09:00:00', '2024-03-10T09:45:00'))).toBe('45m');
    expect(formatDuration(timed('a', '2024-03-10T09:00:00', '2024-03-10T11:00:00'))).toBe('2h');
    expect(formatDuration(timed('a', '2024-03-10T09:00:00', '2024-03-10T09:00:00'))).toBe('0m');
  });
});

describe('layoutDay', () => {
  it('packs overlapping events into parallel columns', () => {
    const a = timed('a', '2024-03-10T09:00:00', '2024-03-10T10:00:00');
    const b = timed('b', '2024-03-10T09:30:00', '2024-03-10T10:30:00'); // overlaps a
    const c = timed('c', '2024-03-10T11:00:00', '2024-03-10T12:00:00'); // separate
    const slots = layoutDay([a, b, c]);
    const byUid = Object.fromEntries(slots.map((s) => [s.event.uid, s]));
    // a and b overlap → two columns; their totalColumns reflects the overlap.
    expect(byUid.a.column).toBe(0);
    expect(byUid.b.column).toBe(1);
    expect(byUid.a.totalColumns).toBe(2);
    expect(byUid.b.totalColumns).toBe(2);
    // c is alone in its window.
    expect(byUid.c.totalColumns).toBe(1);
  });
});
