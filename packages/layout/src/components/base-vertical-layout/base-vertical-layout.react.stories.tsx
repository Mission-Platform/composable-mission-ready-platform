import { VerticalLayout } from '@mission-platform/layouts/react';

import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `VerticalLayout` is the **React** build of the write-once `BaseVerticalLayout`
 * in `@mission-platform/layouts`. It arranges an optional `start` column, the
 * main content (default slot), and an optional `end` column, each backed by an
 * inline `Drawer`: fixed-open grid tracks at/above `breakpoint`, collapsing to
 * overlay drawers below it. The side columns (`start` / `end`) are `MpChild`
 * **props** (not slots). Authored once in the neutral JSX dialect and compiled
 * straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Layouts/BaseVerticalLayout',
  component: VerticalLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cross-framework `VerticalLayout` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/layouts/react`) and Vue 3 (`@mission-platform/layouts/vue`). It arranges an optional `start` column, the main content, and an optional `end` column, each backed by an inline `Drawer`: fixed-open grid tracks at/above `breakpoint`, collapsing to overlay drawers below it.',
      },
    },
  },
  argTypes: {
    breakpoint: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    startSize: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    endSize: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    gap: { control: 'text' },
  },
  args: {
    breakpoint: 'xs',
    startSize: 'xs',
    endSize: 'xs',
    gap: 'var(--mp-spacing-4)',
  },
} satisfies Meta<typeof VerticalLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const panel = (label: string, background: string): ReactNode => (
  <div style={{ padding: 'var(--mp-spacing-4)', background, height: '100%', boxSizing: 'border-box' }}>{label}</div>
);

/** A layout with a fixed-open start sidebar beside the main content. */
export const WithStart: Story = {
  render: (arguments_) => (
    <VerticalLayout
      {...arguments_}
      start={panel('Start sidebar', 'var(--mp-color-bg-surface)')}
      startTitle="Sidebar"
    >
      {panel('Main content', 'var(--mp-color-bg-base)')}
    </VerticalLayout>
  ),
};

/** A layout with both a start and an end column flanking the content. */
export const WithBothColumns: Story = {
  render: (arguments_) => (
    <VerticalLayout
      {...arguments_}
      start={panel('Start', 'var(--mp-color-bg-surface)')}
      end={panel('End', 'var(--mp-color-bg-surface)')}
      startTitle="Start"
      endTitle="End"
    >
      {panel('Main content', 'var(--mp-color-bg-base)')}
    </VerticalLayout>
  ),
};
