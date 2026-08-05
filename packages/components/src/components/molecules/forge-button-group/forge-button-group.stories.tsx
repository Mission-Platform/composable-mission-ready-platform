import { h } from '@mission-platform/forge';

import { ForgeButton, ForgeButtonGroup } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeButtonGroup` is the write-once component of `@mission-platform/components`.
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
  title: 'Molecules/Display/ForgeButtonGroup',
  component: ForgeButtonGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeButtonGroup` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It wraps grouped buttons in a flex container; set `attached` to visually join them into a single segmented control. Styling comes from the co-located `forge-button-group.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    attached: { control: 'boolean' },
    gap: { control: 'select', options: ['none', 'xs', 'sm', 'md'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    ariaLabel: { control: 'text' },
  },
  args: {
    orientation: 'horizontal',
    attached: false,
    gap: 'sm',
    ariaLabel: 'Demo actions',
  },
  render: (arguments_) => (
    <ForgeButtonGroup {...arguments_}>
      <ForgeButton variant="secondary">One</ForgeButton>
      <ForgeButton variant="secondary">Two</ForgeButton>
      <ForgeButton variant="secondary">Three</ForgeButton>
    </ForgeButtonGroup>
  ),
} satisfies Meta<typeof ForgeButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = { args: { orientation: 'vertical' } };

export const Attached: Story = { args: { attached: true } };

export const AttachedVertical: Story = { args: { attached: true, orientation: 'vertical' } };

export const WideGap: Story = { args: { gap: 'md' } };
