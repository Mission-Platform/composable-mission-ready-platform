import { onUnmounted, ref } from 'vue';

import BaseVirtualLogViewer from './BaseVirtualLogViewer.vue';

import type { LogEntry, LogLevel } from './BaseVirtualLogViewer.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

// ─── Data helpers ─────────────────────────────────────────────────────────────

const LEVELS: LogLevel[] = ['debug', 'info', 'info', 'info', 'warn', 'error', 'fatal'];

const MESSAGES = [
  'Initialising mission systems…',
  'Connected to telemetry uplink',
  'Waypoint Alpha reached — bearing 045°',
  'Sensor calibration complete',
  'Low fuel warning: 18% remaining',
  'Navigation subsystem unresponsive',
  'Engine temperature exceeding safe threshold',
  'Entering restricted airspace',
  'Comms link degraded — switching to backup',
  'Target acquired at grid ref 42.3N 71.1W',
  'Payload bay doors opened',
  'Mission clock T+00:42:31',
  'Altitude: 3,200 m AGL',
  'IFF transponder active',
  'Receiving updated mission parameters',
];

function pad(n: number, w = 2) {
  return String(n).padStart(w, '0');
}

function makeTimestamp(offsetSeconds: number): string {
  const d = new Date(Date.now() - (1000 - offsetSeconds) * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function makeLogs(count: number): LogEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    level: LEVELS[index % LEVELS.length],
    message: `[${index + 1}] ${MESSAGES[index % MESSAGES.length]}`,
    timestamp: makeTimestamp(index),
  }));
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Components/Data/VirtualLogViewer',
  component: BaseVirtualLogViewer,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    itemHeight: { control: { type: 'number', min: 18, max: 48, step: 2 } },
    overscan: { control: { type: 'number', min: 0, max: 10 } },
    height: { control: { type: 'number', min: 200, max: 800, step: 50 } },
    showLevel: { control: 'boolean' },
    showTimestamp: { control: 'boolean' },
    followTail: { control: 'boolean' },
    filter: { control: 'text' },
  },
  args: {
    entries: [],
  },
} satisfies Meta<typeof BaseVirtualLogViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => ({
    components: { BaseVirtualLogViewer },
    setup() {
      const entries = makeLogs(10_000);
      return { entries };
    },
    template: `
      <div>
        <p style="margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          10,000 log entries — only visible rows are in the DOM.
        </p>
        <BaseVirtualLogViewer :entries="entries" :height="420" />
      </div>
    `,
  }),
};

export const WithFilter: Story = {
  render: () => ({
    components: { BaseVirtualLogViewer },
    setup() {
      const entries = makeLogs(10_000);
      const filter = ref('');
      return { entries, filter };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-3);">
        <input
          v-model="filter"
          type="search"
          placeholder="Filter log messages…"
          :style="{
            padding: 'var(--mp-spacing-2) var(--mp-spacing-3)',
            border: '1px solid var(--mp-color-border-default)',
            borderRadius: 'var(--mp-radius-md)',
            fontSize: 'var(--mp-font-size-sm)',
            background: 'var(--mp-color-bg-surface)',
            color: 'var(--mp-color-text-primary)',
            fontFamily: 'inherit',
          }"
        />
        <BaseVirtualLogViewer :entries="entries" :height="400" :filter="filter" />
      </div>
    `,
  }),
};

export const LiveStream: Story = {
  render: () => ({
    components: { BaseVirtualLogViewer },
    setup() {
      const entries = ref<LogEntry[]>(makeLogs(50));
      let nextId = entries.value.length + 1;

      const interval = setInterval(() => {
        const batch = Math.floor(Math.random() * 3) + 1;
        for (let index = 0; index < batch; index++) {
          const level = LEVELS[Math.floor(Math.random() * LEVELS.length)];
          const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
          entries.value = [
            ...entries.value,
            {
              id: nextId++,
              level,
              message: `[${nextId}] ${message}`,
              timestamp: new Date().toISOString().slice(11, 23),
            },
          ];
        }
      }, 800);

      onUnmounted(() => clearInterval(interval));

      return { entries };
    },
    template: `
      <div>
        <p style="margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          Live log stream — new entries arrive every 800 ms. Follow-tail keeps the view pinned to the bottom.
        </p>
        <BaseVirtualLogViewer :entries="entries" :height="420" :follow-tail="true" />
      </div>
    `,
  }),
};

export const NoTimestamp: Story = {
  render: () => ({
    components: { BaseVirtualLogViewer },
    setup() {
      return { entries: makeLogs(500) };
    },
    template: `
      <BaseVirtualLogViewer :entries="entries" :height="360" :show-timestamp="false" />
    `,
  }),
};

export const Compact: Story = {
  render: () => ({
    components: { BaseVirtualLogViewer },
    setup() {
      return { entries: makeLogs(20_000) };
    },
    template: `
      <div>
        <p style="margin: 0 0 var(--mp-spacing-3); font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          20,000 entries at 18 px row height.
        </p>
        <BaseVirtualLogViewer :entries="entries" :height="420" :item-height="18" :show-timestamp="false" />
      </div>
    `,
  }),
};
