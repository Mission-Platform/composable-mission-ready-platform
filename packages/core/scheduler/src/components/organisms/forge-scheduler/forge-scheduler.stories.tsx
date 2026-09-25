import { useArgs } from 'storybook/preview-api';

import { ForgeScheduler } from '@mission-platform/scheduler';

import type { VEvent } from './forge-scheduler';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeScheduler` is the write-once `ForgeScheduler` component of `@mission-platform/components`. A toolbar sits above a time grid (day / 3-day /
 * week), a month grid, or a year grid. Events are RFC 5545 `VEvent`s and all the
 * heavy logic — recurrence expansion, view ranges, collision layout — comes from
 * the scheduler package core.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Forms/ForgeScheduler',
  component: ForgeScheduler,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeScheduler` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A toolbar sits above a time grid (day / 3-day / week), a month grid, or a year grid; events are RFC 5545 `VEvent`s and the heavy logic comes from the scheduler package core. Styling comes from the co-located `forge-scheduler.module.scss`.',
      },
    },
  },
  render: (arguments_) => {
    const [{ modelValue: events = [] }, updateArguments] = useArgs();

    return (
      <ForgeScheduler
        {...arguments_}
        modelValue={events}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        onEventClick={(event_) => console.log('event-click', event_)}
      />
    );
  },
} satisfies Meta<typeof ForgeScheduler>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Sample events anchored to the current week ───────────────────────────────

/** Formats an ISO datetime string anchored to the current week with day and hour offsets. */
function formatOffsetTime(dayOffset: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

/** Constructs a sample VEvent for scheduler component stories. */
function createEvent(
  uid: string,
  summary: string,
  dtstart: string,
  dtend: string,
  extra: Partial<VEvent> = {},
): VEvent {
  return { uid, dtstamp: new Date().toISOString(), summary, dtstart, dtend, ...extra };
}

const SAMPLE_EVENTS: VEvent[] = [
  createEvent('standup', 'Daily standup', formatOffsetTime(0, 9), formatOffsetTime(0, 9, 30), { color: '#2563eb' }),
  createEvent('review', 'Design review', formatOffsetTime(0, 11), formatOffsetTime(0, 12, 30), { location: 'Room 4' }),
  createEvent('lunch', 'Lunch', formatOffsetTime(1, 12), formatOffsetTime(1, 13)),
  createEvent('1on1', '1:1 with Alex', formatOffsetTime(2, 15), formatOffsetTime(2, 15, 30), { status: 'TENTATIVE' }),
  createEvent('demo', 'Sprint demo', formatOffsetTime(4, 14), formatOffsetTime(4, 15, 30), { color: '#16a34a' }),
];

// ─── Stories ──────────────────────────────────────────────────────────────────

export const WeekView: Story = { args: { defaultView: 'week', modelValue: SAMPLE_EVENTS } };

export const DayView: Story = { args: { defaultView: 'day', modelValue: SAMPLE_EVENTS } };

export const ThreeDayView: Story = { args: { defaultView: 'three-day', modelValue: SAMPLE_EVENTS } };

export const MonthView: Story = { args: { defaultView: 'month', modelValue: SAMPLE_EVENTS } };

export const YearView: Story = { args: { defaultView: 'year', modelValue: SAMPLE_EVENTS } };

export const EmptyCalendar: Story = { args: { defaultView: 'week', modelValue: [] } };

export const ManyOverlappingEvents: Story = {
  args: {
    defaultView: 'day',
    modelValue: [
      createEvent('a', 'Event A', formatOffsetTime(0, 9), formatOffsetTime(0, 11)),
      createEvent('b', 'Event B', formatOffsetTime(0, 9, 30), formatOffsetTime(0, 10, 30)),
      createEvent('c', 'Event C', formatOffsetTime(0, 10), formatOffsetTime(0, 12)),
      createEvent('d', 'Event D', formatOffsetTime(0, 10, 30), formatOffsetTime(0, 11, 30)),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Overlapping events are packed into parallel columns by the shared `layoutDay` collision algorithm.',
      },
    },
  },
};

export const WithCancelledAndTentative: Story = {
  args: {
    defaultView: 'week',
    modelValue: [
      createEvent('ok', 'Confirmed sync', formatOffsetTime(0, 9), formatOffsetTime(0, 10), { status: 'CONFIRMED' }),
      createEvent('maybe', 'Tentative chat', formatOffsetTime(1, 11), formatOffsetTime(1, 12), { status: 'TENTATIVE' }),
      // CANCELLED events are filtered out of every view by the scheduler core.
      createEvent('gone', 'Cancelled call', formatOffsetTime(2, 14), formatOffsetTime(2, 15), { status: 'CANCELLED' }),
    ],
  },
};

export const WithRecurringEvents: Story = {
  args: {
    defaultView: 'week',
    modelValue: [
      createEvent('weekday-standup', 'Weekday standup', formatOffsetTime(0, 9), formatOffsetTime(0, 9, 15), {
        rrule: { freq: 'WEEKLY', byday: ['MO', 'TU', 'WE', 'TH', 'FR'], count: 20 },
      }),
      createEvent('biweekly', 'Bi-weekly planning', formatOffsetTime(0, 13), formatOffsetTime(0, 14), {
        rrule: { freq: 'WEEKLY', interval: 2, byday: ['MO'], count: 8 },
      }),
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Recurring events expand through the shared RFC 5545 `expandRecurrences`: a weekday standup and a bi-weekly Monday planning meeting.',
      },
    },
  },
};

export const WeekStartMonday: Story = {
  name: 'Week Starts on Monday (Week View)',
  args: { defaultView: 'week', weekStartsOn: 1, modelValue: SAMPLE_EVENTS },
};

export const MonthStartMonday: Story = {
  name: 'Month Starts on Monday (Month View)',
  args: { defaultView: 'month', weekStartsOn: 1, modelValue: SAMPLE_EVENTS },
};

export const Showcase: Story = {
  args: { defaultView: 'week', modelValue: SAMPLE_EVENTS },
  parameters: {
    docs: {
      description: {
        story:
          'A representative week. Click a slot to create an event, click an event to edit/delete it, and drag an event vertically to re-time it or its bottom edge to resize.',
      },
    },
  },
};
