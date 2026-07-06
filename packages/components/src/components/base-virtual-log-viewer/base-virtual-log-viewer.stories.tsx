import { VirtualLogViewer } from '@mission-platform/components/vue';

import type { LogEntry, LogLevel } from './base-virtual-log-viewer';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const LEVELS: LogLevel[] = ['debug', 'info', 'info', 'warn', 'error', 'fatal'];

const entries: LogEntry[] = Array.from({ length: 500 }, (_, index) => ({
  id: index,
  level: LEVELS[index % LEVELS.length],
  message: `[svc] request ${index} completed in ${(index * 7) % 400}ms`,
  timestamp: `12:0${Math.floor(index / 60) % 6}:${String(index % 60).padStart(2, '0')}`,
}));

/**
 * `VirtualLogViewer` is the Vue 3 build of the write-once `BaseVirtualLogViewer`
 * in this package, authored **once** in the framework-neutral JSX dialect and
 * compiled straight to Vue and React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Data/BaseVirtualLogViewer',
  component: VirtualLogViewer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `VirtualLogViewer` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React. It virtual-scrolls a large log, with per-level colouring, an optional timestamp/level column, a substring `filter` (with a matching-count toolbar), follow-tail, and an `onSelect` callback. Row text is rendered through the composed `BaseTypography`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    itemHeight: { control: { type: 'number' } },
    height: { control: { type: 'number' } },
    showLevel: { control: 'boolean' },
    showTimestamp: { control: 'boolean' },
    followTail: { control: 'boolean' },
    filter: { control: 'text' },
  },
  args: {
    entries,
    itemHeight: 24,
    height: 360,
    showLevel: true,
    showTimestamp: true,
    followTail: false,
    filter: '',
  },
  render: (arguments_) => ({
    components: { VirtualLogViewer },
    setup() {
      return { args: arguments_ };
    },
    template: '<VirtualLogViewer v-bind="args" />',
  }),
} satisfies Meta<typeof VirtualLogViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = { args: { filter: '200ms' } };

export const MessageOnly: Story = { args: { showLevel: false, showTimestamp: false } };
