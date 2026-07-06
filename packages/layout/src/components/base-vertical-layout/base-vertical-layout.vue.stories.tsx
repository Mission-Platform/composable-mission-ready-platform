import { h } from 'vue';

import { VerticalLayout } from '@mission-platform/layouts/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `VerticalLayout` is the Vue 3 build of the write-once `BaseVerticalLayout` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 *
 * The side columns (`start` / `end`) are `MpChild` **props** (not slots), so the
 * stories pass them as Vue `VNode`s through a render function.
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
          'Cross-framework `VerticalLayout` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/layouts/vue`) and React (`@mission-platform/layouts/react`). It arranges an optional `start` column, the main content (default slot), and an optional `end` column, each backed by an inline `Drawer`: fixed-open grid tracks at/above `breakpoint`, collapsing to overlay drawers below it. The neutral dialect drops the original SFC scoped default slot and drawer drag-resize.',
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

const panel = (label: string, background: string) =>
  h(
    'div',
    { style: `padding: var(--mp-spacing-4); background: ${background}; height: 100%; box-sizing: border-box;` },
    label,
  );

/** A layout with a fixed-open start sidebar beside the main content. */
export const WithStart: Story = {
  render: (arguments_) => ({
    setup() {
      return () =>
        h(
          VerticalLayout,
          { ...arguments_, start: panel('Start sidebar', 'var(--mp-color-bg-surface)'), startTitle: 'Sidebar' },
          panel('Main content', 'var(--mp-color-bg-base)'),
        );
    },
  }),
};

/** A layout with both a start and an end column flanking the content. */
export const WithBothColumns: Story = {
  render: (arguments_) => ({
    setup() {
      return () =>
        h(
          VerticalLayout,
          {
            ...arguments_,
            start: panel('Start', 'var(--mp-color-bg-surface)'),
            end: panel('End', 'var(--mp-color-bg-surface)'),
            startTitle: 'Start',
            endTitle: 'End',
          },
          panel('Main content', 'var(--mp-color-bg-base)'),
        );
    },
  }),
};
