import { h } from '@mission-platform/forge';

import { ForgeVirtualLogViewer } from '@mission-platform/components';

import type { LogEntry, LogLevel } from './forge-virtual-log-viewer';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const LEVELS: LogLevel[] = ['debug', 'info', 'info', 'warn', 'error', 'fatal'];

const entries: LogEntry[] = Array.from({ length: 500 }, (_unused, index) => ({
  id: index,
  level: LEVELS[index % LEVELS.length],
  message: `[svc] request ${index} completed in ${(index * 7) % 400}ms`,
  timestamp: `12:0${Math.floor(index / 60) % 6}:${String(index % 60).padStart(2, '0')}`,
}));

/**
 * `ForgeVirtualLogViewer` is the write-once `ForgeVirtualLogViewer` component of
 * `@mission-platform/components`. This single neutral story renders on the
 * framework selected by `STORYBOOK_FRAMEWORK`.
 */

const meta = {
  title: 'Organisms/Data/ForgeVirtualLogViewer',
  component: ForgeVirtualLogViewer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeVirtualLogViewer` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It virtual-scrolls a large log, with per-level colouring, an optional timestamp/level column, a substring `filter`, follow-tail, and an `onSelect` callback.',
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
  render: (arguments_) => <ForgeVirtualLogViewer {...arguments_} />,
} satisfies Meta<typeof ForgeVirtualLogViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = { args: { filter: '200ms' } };

export const MessageOnly: Story = { args: { showLevel: false, showTimestamp: false } };
