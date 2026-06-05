import { DateTime } from 'luxon';
import { ref } from 'vue';

import BaseScheduler from './base-scheduler.vue';

import type { VEvent } from './types';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

// ─── Luxon-based date helpers ─────────────────────────────────────────────────

const TODAY = DateTime.now().startOf('day');
const dateString = TODAY.toFormat('yyyy-MM-dd');
const dtstamp = TODAY.toISO() ?? TODAY.toJSDate().toISOString();

/** ISO datetime string for today at the given hour and optional minute. */
function timeOnToday(hh: number, mm = 0): string {
  return TODAY.set({ hour: hh, minute: mm, second: 0, millisecond: 0 }).toISO() ?? '';
}

/** ISO datetime string for a day offset from today at the given hour and optional minute. */
function timeOnOffset(days: number, hh: number, mm = 0): string {
  return TODAY.plus({ days }).set({ hour: hh, minute: mm, second: 0, millisecond: 0 }).toISO() ?? '';
}

/** ISO datetime string 8 weeks from today (used as UNTIL for recurring events). */
const eightWeeksFromToday = TODAY.plus({ weeks: 8 }).toISO() ?? '';

const SAMPLE_EVENTS: VEvent[] = [
  {
    uid: 'evt-standup',
    summary: 'Daily Standup',
    dtstart: timeOnToday(9),
    dtend: timeOnToday(9, 30),
    dtstamp,
    color: '#6c2fd4',
    status: 'CONFIRMED',
    transp: 'OPAQUE',
    location: 'Zoom',
    description: 'Daily team standup meeting.',
    rrule: { freq: 'DAILY', byday: ['MO', 'TU', 'WE', 'TH', 'FR'] },
  },
  {
    uid: 'evt-design',
    summary: 'Design Review',
    dtstart: timeOnToday(10),
    dtend: timeOnToday(11),
    dtstamp,
    color: '#14b8af',
    status: 'CONFIRMED',
    transp: 'OPAQUE',
    attendees: [
      { calAddress: 'mailto:alice@example.com', cn: 'Alice', role: 'CHAIR' },
      { calAddress: 'mailto:bob@example.com', cn: 'Bob', role: 'REQ-PARTICIPANT' },
    ],
  },
  {
    uid: 'evt-lunch',
    summary: 'Team Lunch',
    dtstart: timeOnToday(12),
    dtend: timeOnToday(13),
    dtstamp,
    color: '#1aa354',
    status: 'TENTATIVE',
    location: 'The Noodle Bar',
  },
  {
    uid: 'evt-planning',
    summary: 'Sprint Planning',
    dtstart: timeOnToday(14),
    dtend: timeOnToday(16),
    dtstamp,
    color: '#f59e0b',
    status: 'CONFIRMED',
    transp: 'OPAQUE',
    priority: 1,
  },
  {
    uid: 'evt-allday',
    summary: 'Company Holiday',
    dtstart: dateString,
    dtend: dateString,
    dtstamp,
    color: '#ef4444',
    status: 'CONFIRMED',
    classification: 'PUBLIC',
    transp: 'TRANSPARENT',
  },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Components/Scheduler/BaseScheduler',
  component: BaseScheduler,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**BaseScheduler** is a full-featured calendar scheduler backed by RFC 5545 (iCalendar) event data.

### Features
- **Day, 3-Day, Week, Month, Year** view modes
- **Toolbar** with Today button, prev/next navigation, and view switcher
- **Create events** by clicking an empty time slot or pressing "+ New Event"
- **Edit events** by clicking an event chip
- **Move events** by dragging (Day / 3-Day / Week time grids)
- **Resize events** via the bottom drag handle
- **RFC 5545 fields** managed in the event dialog: SUMMARY, DTSTART/DTEND, STATUS, CLASS, TRANSP, ORGANIZER, URL, DESCRIPTION, LOCATION, RRULE (frequency, count, interval), COLOR
- **Duration display** shown on each event chip
        `.trim(),
      },
    },
  },
  argTypes: {
    defaultView: {
      control: 'select',
      options: ['day', 'three-day', 'week', 'month', 'year'],
    },
  },
  args: {
    defaultView: 'week',
    modelValue: SAMPLE_EVENTS,
  },
  render: (arguments_) => ({
    components: { BaseScheduler },
    setup() {
      const events = ref<VEvent[]>(arguments_.modelValue ?? []);
      return { args: arguments_, events };
    },
    template: `
      <div style="height: 100vh; padding: 0;">
        <BaseScheduler
          v-bind="args"
          v-model="events"
          :default-view="args.defaultView"
        />
      </div>
    `,
  }),
} satisfies Meta<typeof BaseScheduler>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const WeekView: Story = {
  args: { defaultView: 'week' },
};

export const DayView: Story = {
  args: { defaultView: 'day' },
};

export const ThreeDayView: Story = {
  args: { defaultView: 'three-day' },
};

export const MonthView: Story = {
  args: { defaultView: 'month' },
};

export const YearView: Story = {
  args: { defaultView: 'year' },
};

export const EmptyCalendar: Story = {
  args: { defaultView: 'week', modelValue: [] },
};

export const ManyOverlappingEvents: Story = {
  args: {
    defaultView: 'day',
    modelValue: [
      {
        uid: 'ov-1',
        summary: 'Meeting A',
        dtstart: timeOnToday(10),
        dtend: timeOnToday(12),
        dtstamp,
        color: '#6c2fd4',
        status: 'CONFIRMED',
      },
      {
        uid: 'ov-2',
        summary: 'Meeting B',
        dtstart: timeOnToday(10, 30),
        dtend: timeOnToday(11, 30),
        dtstamp,
        color: '#14b8af',
        status: 'CONFIRMED',
      },
      {
        uid: 'ov-3',
        summary: 'Meeting C',
        dtstart: timeOnToday(11),
        dtend: timeOnToday(13),
        dtstamp,
        color: '#f59e0b',
        status: 'CONFIRMED',
      },
    ] satisfies VEvent[],
  },
};

export const WithCancelledAndTentative: Story = {
  args: {
    defaultView: 'week',
    modelValue: [
      ...SAMPLE_EVENTS,
      {
        uid: 'cancelled-evt',
        summary: 'Cancelled Call',
        dtstart: timeOnToday(15),
        dtend: timeOnToday(15, 30),
        dtstamp,
        color: '#ef4444',
        status: 'CANCELLED',
      },
    ] satisfies VEvent[],
  },
};

export const WithRecurringEvents: Story = {
  args: {
    defaultView: 'week',
    modelValue: [
      {
        uid: 'recur-daily-standup',
        summary: 'Daily Standup',
        dtstart: timeOnToday(9),
        dtend: timeOnToday(9, 30),
        dtstamp,
        color: '#6c2fd4',
        status: 'CONFIRMED',
        transp: 'OPAQUE',
        location: 'Zoom',
        description: 'Daily team standup — repeats every weekday for 8 weeks.',
        // RRULE: every Mon–Fri until 8 weeks from today
        rrule: { freq: 'DAILY', byday: ['MO', 'TU', 'WE', 'TH', 'FR'], until: eightWeeksFromToday },
      },
      {
        uid: 'recur-weekly-sync',
        summary: 'Weekly Sync',
        // Start on the nearest upcoming Monday (or today if today is Monday)
        dtstart: timeOnOffset(TODAY.weekday === 1 ? 0 : 8 - TODAY.weekday, 9),
        dtend: timeOnOffset(TODAY.weekday === 1 ? 0 : 8 - TODAY.weekday, 9, 45),
        dtstamp,
        color: '#14b8af',
        status: 'CONFIRMED',
        transp: 'OPAQUE',
        description: 'Weekly team sync — repeats every Mon, Wed & Fri for 8 weeks.',
        // RRULE: Mon / Wed / Fri until 8 weeks from today
        rrule: { freq: 'WEEKLY', byday: ['MO', 'WE', 'FR'], until: eightWeeksFromToday },
      },
      {
        uid: 'recur-sprint-planning',
        summary: 'Sprint Planning',
        // Every other Monday starting from the nearest upcoming Monday
        dtstart: timeOnOffset(TODAY.weekday === 1 ? 0 : 8 - TODAY.weekday, 14),
        dtend: timeOnOffset(TODAY.weekday === 1 ? 0 : 8 - TODAY.weekday, 16),
        dtstamp,
        color: '#f59e0b',
        status: 'CONFIRMED',
        transp: 'OPAQUE',
        priority: 1,
        description: 'Bi-weekly sprint planning — every other Monday for 8 weeks.',
        // RRULE: every 2 weeks on Monday until 8 weeks from today
        rrule: { freq: 'WEEKLY', interval: 2, byday: ['MO'], until: eightWeeksFromToday },
      },
    ] satisfies VEvent[],
  },
};

export const WeekStartMonday: Story = {
  name: 'Week Starts on Monday (Week View)',
  args: {
    defaultView: 'week',
    weekStartsOn: 1,
    modelValue: SAMPLE_EVENTS,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The `weekStartsOn` prop set to `1` (Monday) — the week columns run **Mon → Sun**. The month and year mini-calendars also start on Monday.',
      },
    },
  },
};

export const MonthStartMonday: Story = {
  name: 'Month Starts on Monday (Month View)',
  args: {
    defaultView: 'month',
    weekStartsOn: 1,
    modelValue: SAMPLE_EVENTS,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Same `weekStartsOn: 1` prop, but with `defaultView: "month"` — the month grid header row reads **Mon Tue Wed Thu Fri Sat Sun** and the first column of every week starts on Monday.',
      },
    },
  },
};

export const Showcase: Story = {
  render: () => ({
    components: { BaseScheduler },
    setup() {
      const events = ref<VEvent[]>(SAMPLE_EVENTS);
      const lastEvent = ref<VEvent | undefined>(undefined);

      function onEventClick(event: VEvent) {
        lastEvent.value = event;
      }

      return { events, lastEvent, onEventClick };
    },
    template: `
      <div style="height: 100vh; display: flex; flex-direction: column;">
        <BaseScheduler
          v-model="events"
          default-view="week"
          style="flex: 1; min-height: 0;"
          @event-click="onEventClick"
        />
        <div v-if="lastEvent" style="padding: 8px 16px; background: #f5f5f5; font-family: monospace; font-size: 12px; border-top: 1px solid #ddd;">
          <strong>Last clicked event UID:</strong> {{ lastEvent.uid }} —
          <strong>Status:</strong> {{ lastEvent.status }} —
          <strong>Summary:</strong> {{ lastEvent.summary }}
        </div>
      </div>
    `,
  }),
};
