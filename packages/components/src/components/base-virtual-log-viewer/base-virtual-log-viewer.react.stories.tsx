import { VirtualLogViewer } from '@mission-platform/components/react';

import type { LogEntry, LogLevel } from './base-virtual-log-viewer';
import type { Meta, StoryObj } from '@storybook/react-vite';

const LEVELS: LogLevel[] = ['debug', 'info', 'info', 'warn', 'error', 'fatal'];

const entries: LogEntry[] = Array.from({ length: 500 }, (_unused, index) => ({
  id: index,
  level: LEVELS[index % LEVELS.length],
  message: `[svc] request ${index} completed in ${(index * 7) % 400}ms`,
  timestamp: `12:0${Math.floor(index / 60) % 6}:${String(index % 60).padStart(2, '0')}`,
}));

/**
 * `VirtualLogViewer` is the **React** build of the write-once
 * `BaseVirtualLogViewer` in `@mission-platform/components`, authored **once** in
 * the framework-neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Data/BaseVirtualLogViewer',
  component: VirtualLogViewer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `VirtualLogViewer` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It virtual-scrolls a large log, with per-level colouring, an optional timestamp/level column, a substring `filter`, follow-tail, and an `onSelect` callback.',
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
  render: (arguments_) => <VirtualLogViewer {...arguments_} />,
} satisfies Meta<typeof VirtualLogViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = { args: { filter: '200ms' } };

export const MessageOnly: Story = { args: { showLevel: false, showTimestamp: false } };
