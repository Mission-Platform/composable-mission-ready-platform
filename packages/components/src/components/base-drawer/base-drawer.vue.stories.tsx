import { h, ref } from 'vue';

import { Drawer } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Drawer` is the Vue 3 build of the write-once `BaseDrawer` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 *
 * Per the cross-framework convention the drawer reports closing through the
 * `onOpenChange` / `onClose` **callback props** (not Vue emits / `v-model`), so
 * the interactive story drives `open` from a local `ref`.
 */
const meta = {
  title: 'Components/Layout/BaseDrawer',
  component: Drawer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Drawer` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). An `overlay` drawer is a fixed panel gated by `open` with a click-to-close scrim and the same fade/slide enter/leave as the Vue original (via the neutral `<Transition>` primitive); an `inline` drawer is fixed-open at/above `inlineBreakpoint`. Set `draggable` to resize the panel by dragging its inner edge (reported through `onResize`). Styling comes from the co-located `base-drawer.module.scss`.',
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
  render: (arguments_) => ({
    setup() {
      const open = ref(false);
      return () =>
        h('div', { style: 'padding: var(--mp-spacing-4);' }, [
          h('button', { type: 'button', onClick: () => (open.value = true) }, 'Open drawer'),
          h(
            Drawer,
            {
              ...arguments_,
              open: open.value,
              onOpenChange: (next: boolean) => (open.value = next),
            },
            'The drawer body content scrolls independently.',
          ),
        ]);
    },
  }),
};

/** An always-open overlay drawer (useful for visual inspection). */
export const Open: Story = {
  render: (arguments_) => ({
    setup() {
      return () =>
        h(
          Drawer,
          { ...arguments_, open: true },
          'A drawer rendered open, with a header, scrollable body, and a footer.',
        );
    },
  }),
};

/** A resizable overlay drawer — drag the inner edge to resize it. */
export const Draggable: Story = {
  args: { draggable: true, title: 'Resizable drawer' },
  render: (arguments_) => ({
    setup() {
      const open = ref(true);
      return () =>
        h(
          Drawer,
          {
            ...arguments_,
            open: open.value,
            onOpenChange: (next: boolean) => (open.value = next),
          },
          'Drag the strip on the inner edge to resize this drawer.',
        );
    },
  }),
};

/** A responsive `inline` drawer that is fixed-open at/above its breakpoint. */
export const Inline: Story = {
  args: { variant: 'inline', inlineBreakpoint: 'xs', title: 'Inline panel' },
  render: (arguments_) => ({
    setup() {
      return () =>
        h('div', { style: 'height: 18rem; display: flex; border: 1px solid var(--mp-color-border-default);' }, [
          h(Drawer, { ...arguments_, style: 'width: 16rem;' }, 'Fixed-open inline panel content.'),
          h('div', { style: 'flex: 1; padding: var(--mp-spacing-4);' }, 'Main content area beside the inline drawer.'),
        ]);
    },
  }),
};
