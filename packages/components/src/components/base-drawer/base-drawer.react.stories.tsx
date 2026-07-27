import { useState } from 'react';

import { Drawer } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Drawer` is the **React** build of the write-once `BaseDrawer` in
 * `@mission-platform/components`. An `overlay` drawer is a fixed panel gated by
 * `open` with a click-to-close scrim; an `inline` drawer is fixed-open at/above
 * `inlineBreakpoint`. It reports closing through the `onOpenChange`/`onClose`
 * callback props, so the interactive stories drive `open` from local `useState`.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Layout/BaseDrawer',
  component: Drawer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Drawer` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). An `overlay` drawer is a fixed panel gated by `open` with a click-to-close scrim; an `inline` drawer is fixed-open at/above `inlineBreakpoint`. Set `draggable` to resize the panel. Styling comes from the co-located `base-drawer.module.scss`.',
      },
    },
  },
  argTypes: {
    placement: { control: 'inline-radio', options: ['start', 'end', 'top', 'bottom'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    title: { control: 'text' },
    closeOnBackdrop: { control: 'boolean' },
    draggable: { control: 'boolean' },
  },
  args: {
    placement: 'start',
    size: 'md',
    title: 'Drawer title',
    closeOnBackdrop: true,
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An interactive overlay drawer toggled by a trigger button. */
export const Overlay: Story = {
  render: (arguments_) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 'var(--mp-spacing-4)' }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
        >
          Open drawer
        </button>
        <Drawer
          {...arguments_}
          open={open}
          onOpenChange={setOpen}
        >
          The drawer body content scrolls independently.
        </Drawer>
      </div>
    );
  },
};

/** An always-open overlay drawer (useful for visual inspection). */
export const Open: Story = {
  render: (arguments_) => (
    <Drawer
      {...arguments_}
      open
    >
      A drawer rendered open, with a header, scrollable body, and a footer.
    </Drawer>
  ),
};

/** A resizable overlay drawer — drag the inner edge to resize it. */
export const Draggable: Story = {
  args: { draggable: true, title: 'Resizable drawer' },
  render: (arguments_) => {
    const [open, setOpen] = useState(true);
    return (
      <Drawer
        {...arguments_}
        open={open}
        onOpenChange={setOpen}
      >
        Drag the strip on the inner edge to resize this drawer.
      </Drawer>
    );
  },
};

/** A responsive `inline` drawer that is fixed-open at/above its breakpoint. */
export const Inline: Story = {
  args: { variant: 'inline', inlineBreakpoint: 'xs', title: 'Inline panel' },
  render: (arguments_) => (
    <div style={{ height: '18rem', display: 'flex', border: '1px solid var(--mp-color-border-default)' }}>
      <Drawer
        {...arguments_}
        style={{ width: '16rem' }}
      >
        Fixed-open inline panel content.
      </Drawer>
      <div style={{ flex: 1, padding: 'var(--mp-spacing-4)' }}>Main content area beside the inline drawer.</div>
    </div>
  ),
};
