import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeScheduler } from '@mission-platform/components';

import type { VEvent } from './forge-scheduler';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeScheduler` is the write-once `ForgeScheduler` component of `@mission-platform/components`. A toolbar sits above a time grid (day / 3-day /
 * week), a month grid, or a year grid. Events are RFC 5545 `VEvent`s and all the
 * heavy logic — recurrence expansion, view ranges, collision layout — comes from
 * the shared `@mission-platform/scheduler-core`.
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
          'Cross-framework `ForgeScheduler` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A toolbar sits above a time grid (day / 3-day / week), a month grid, or a year grid; events are RFC 5545 `VEvent`s and the heavy logic comes from the shared `@mission-platform/scheduler-core`. Styling comes from the co-located `forge-scheduler.module.scss`.',
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

function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
}

function event(uid: string, summary: string, dtstart: string, dtend: string, extra: Partial<VEvent> = {}): VEvent {
  return { uid, dtstamp: new Date().toISOString(), summary, dtstart, dtend, ...extra };
}

const SAMPLE_EVENTS: VEvent[] = [
  event('standup', 'Daily standup', at(0, 9), at(0, 9, 30), { color: '#2563eb' }),
  event('review', 'Design review', at(0, 11), at(0, 12, 30), { location: 'Room 4' }),
  event('lunch', 'Lunch', at(1, 12), at(1, 13)),
  event('1on1', '1:1 with Alex', at(2, 15), at(2, 15, 30), { status: 'TENTATIVE' }),
  event('demo', 'Sprint demo', at(4, 14), at(4, 15, 30), { color: '#16a34a' }),
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
      event('a', 'Event A', at(0, 9), at(0, 11)),
      event('b', 'Event B', at(0, 9, 30), at(0, 10, 30)),
      event('c', 'Event C', at(0, 10), at(0, 12)),
      event('d', 'Event D', at(0, 10, 30), at(0, 11, 30)),
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
      event('ok', 'Confirmed sync', at(0, 9), at(0, 10), { status: 'CONFIRMED' }),
      event('maybe', 'Tentative chat', at(1, 11), at(1, 12), { status: 'TENTATIVE' }),
      // CANCELLED events are filtered out of every view by scheduler-core.
      event('gone', 'Cancelled call', at(2, 14), at(2, 15), { status: 'CANCELLED' }),
    ],
  },
};

export const WithRecurringEvents: Story = {
  args: {
    defaultView: 'week',
    modelValue: [
      event('weekday-standup', 'Weekday standup', at(0, 9), at(0, 9, 15), {
        rrule: { freq: 'WEEKLY', byday: ['MO', 'TU', 'WE', 'TH', 'FR'], count: 20 },
      }),
      event('biweekly', 'Bi-weekly planning', at(0, 13), at(0, 14), {
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
