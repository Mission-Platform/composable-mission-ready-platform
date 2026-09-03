import { describe, expect, it } from 'vitest';

import { calendarEvents, parseICalendar, writeICalendar } from './icalendar';

describe('RFC 5545 iCalendar support', () => {
  it('reads folded lines, parameters, nested components, and escaped text', () => {
    const source = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mission Platform//Calendar//EN',
      'BEGIN:VEVENT',
      'UID:event-1@example.com',
      'DTSTART;TZID=Europe/London:20260810T090000',
      String.raw`SUMMARY:Planning meeting\, phase one`,
      'DESCRIPTION:This is a long description that is folded across lines and remains readable',
      ' continued after folding.',
      'RRULE:FREQ=WEEKLY;COUNT=4',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const calendar = parseICalendar(source);
    const event = calendarEvents(calendar)[0];

    expect(event).toMatchObject({
      uid: 'event-1@example.com',
      summary: 'Planning meeting, phase one',
      start: '20260810T090000',
      recurrenceRule: 'FREQ=WEEKLY;COUNT=4',
    });
    expect(
      calendar.components[0]?.components[0]?.properties.find((property) => property.name === 'DTSTART')?.parameters,
    ).toEqual([{ name: 'TZID', value: 'Europe/London' }]);
  });

  it('writes CRLF output with safe folding and round-trips events', () => {
    const calendar = parseICalendar(
      'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:one\nDTSTART:20260810T090000Z\nSUMMARY:One\nEND:VEVENT\nEND:VCALENDAR',
    );
    const output = writeICalendar(calendar);

    expect(output).toContain('\r\nBEGIN:VEVENT\r\n');
    expect(calendarEvents(parseICalendar(output))).toEqual([
      {
        uid: 'one',
        summary: 'One',
        start: '20260810T090000Z',
        end: undefined,
        description: undefined,
        location: undefined,
        status: undefined,
        recurrenceRule: undefined,
      },
    ]);
  });
});
