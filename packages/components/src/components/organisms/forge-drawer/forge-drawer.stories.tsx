import { useArgs } from 'storybook/preview-api';

import { ForgeDrawer } from '@mission-platform/components';

import type { DrawerProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeDrawer` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Organisms/Layout/ForgeDrawer',
  component: ForgeDrawer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeDrawer` — authored once in the neutral JSX dialect and shipped to all supported frameworks. An `overlay` drawer is a fixed panel gated by `open` with a click-to-close scrim; an `inline` drawer is fixed-open at/above `inlineBreakpoint`. Set `draggable` to resize the panel. Styling comes from the co-located `forge-drawer.module.scss`.',
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
    title: 'ForgeDrawer title',
    closeOnBackdrop: true,
    open: false,
  },
} satisfies Meta<typeof ForgeDrawer>;

export default meta;
type Story = StoryObj<DrawerProperties>;

/** An interactive overlay drawer toggled by a trigger button. */
export const Overlay: Story = {
  render: (arguments_) => {
    const [{ open }, updateArguments] = useArgs();
    return (
      <div style={{ padding: 'var(--mp-spacing-4)' }}>
        <button
          type="button"
          onClick={() => updateArguments({ open: true })}
        >
          Open drawer
        </button>
        <ForgeDrawer
          {...(arguments_ as DrawerProperties)}
          open={Boolean(open)}
          onOpenChange={(value) => updateArguments({ open: value })}
        >
          The drawer body content scrolls independently.
        </ForgeDrawer>
      </div>
    );
  },
};

/** An always-open overlay drawer (useful for visual inspection). */
export const Open: Story = {
  args: { open: true },
  render: (arguments_) => (
    <ForgeDrawer
      {...(arguments_ as DrawerProperties)}
      open
    >
      A drawer rendered open, with a header, scrollable body, and a footer.
    </ForgeDrawer>
  ),
};

/** A resizable overlay drawer — drag the inner edge to resize it. */
export const Draggable: Story = {
  args: { draggable: true, title: 'Resizable drawer', open: true },
  render: (arguments_) => {
    const [{ open }, updateArguments] = useArgs();
    return (
      <ForgeDrawer
        {...(arguments_ as DrawerProperties)}
        open={open ?? true}
        onOpenChange={(value) => updateArguments({ open: value })}
      >
        Drag the strip on the inner edge to resize this drawer.
      </ForgeDrawer>
    );
  },
};

/** A responsive `inline` drawer that is fixed-open at/above its breakpoint. */
export const Inline: Story = {
  args: { variant: 'inline', inlineBreakpoint: 'xs', title: 'Inline panel' },
  render: (arguments_) => (
    <div
      style={{
        height: '18rem',
        display: 'flex',
        border: '1px solid var(--mp-color-border-default)',
      }}
    >
      <ForgeDrawer {...(arguments_ as DrawerProperties)}>Fixed-open inline panel content.</ForgeDrawer>
      <div style={{ flex: 1, padding: 'var(--mp-spacing-4)' }}>Main content area beside the inline drawer.</div>
    </div>
  ),
};
