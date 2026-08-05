# `@mission-platform/scheduler-core`

Framework-agnostic scheduler core for Mission Platform. Provides RFC 5545 (iCalendar) event models, recurrence expansion
(RRULE/RDATE/EXDATE), view range calculation, event selection, and time-grid collision layout.

---

## Overview

`@mission-platform/scheduler-core` provides pure JavaScript/TypeScript logic for scheduling applications, without UI or
framework dependencies:

- **RFC 5545 Event Model**: Support for `VEvent`, `RRule`, `VAlarm`, `VEventAttendee`, etc.
- **Recurrence Expansion**: `expandRecurrences` handles RRULEs, RDATEs, EXDATEs across date ranges.
- **View Ranges**: `visibleRangeFor` and `stepAnchor` compute ranges for day, week, work-week, month, and year views.
- **Time Grid Layout**: `layoutDay` computes overlapping event positions and column widths for rendering.
- **Event Operations**: `createEvent`, `eventsForRange`, `eventsForDay`, `moveEventPatch`, `resizeEventPatch`,
  `applyEventPatch`.

---

## Installation

```bash
pnpm add @mission-platform/scheduler-core
```

---

## Usage Examples

### Expanding Recurrences and Filtering for a View Range

```ts
import { expandRecurrences, visibleRangeFor, eventsForRange, type VEvent } from '@mission-platform/scheduler-core';

const events: VEvent[] = [
  {
    id: 'evt-1',
    summary: 'Weekly Sync',
    dtstart: '2026-07-01T09:00:00Z',
    dtend: '2026-07-01T10:00:00Z',
    rrule: { freq: 'WEEKLY', count: 10 },
  },
];

// Compute range for a week view anchored at a specific date
const range = visibleRangeFor('week', '2026-07-27', { weekStart: 'mon' });

// Expand RRULEs within range
const expanded = expandRecurrences(events, range);

// Filter occurrences for display
const visibleEvents = eventsForRange(expanded, range);
```

### Time Grid Layout

```ts
import { layoutDay } from '@mission-platform/scheduler-core';

// Compute overlapping columns/widths for day view rendering
const slots = layoutDay(visibleEvents, '2026-07-27');
// slots: Array<{ event, topPct, heightPct, leftPct, widthPct, colIndex, totalCols }>
```

---

## Main Exports

- **Types**: `VEvent`, `RRule`, `DateRange`, `SchedulerView`, `SchedulerEventSlot`, `VAlarm`, `VEventAttendee`.
- **Date Helpers**: `parseDate`, `parseDT`, `startOfDay`, `startOfWeek`, `startOfMonth`, `addDays`, `addMonths`,
  `addYears`, `dayKey`.
- **Recurrence**: `expandRecurrences(events, range)`.
- **Range Math**: `visibleRangeFor(view, anchorDate, options)`, `stepAnchor(view, anchorDate, step)`.
- **Event Math & Layout**: `createEvent`, `eventsForRange`, `eventsForDay`, `layoutDay`, `moveEventPatch`,
  `resizeEventPatch`, `applyEventPatch`, `formatDuration`.
