import { Button, ButtonGroup } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ButtonGroup` is the **React** build of the write-once `BaseButtonGroup` in
 * `@mission-platform/components` — a flex container for grouped buttons that can
 * be visually joined into a single segmented control via `attached`. Authored
 * once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Display/BaseButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ButtonGroup` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It wraps grouped buttons in a flex container; set `attached` to visually join them into a single segmented control. Styling comes from the co-located `base-button-group.module.scss`.',
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
    <ButtonGroup {...arguments_}>
      <Button variant="secondary">One</Button>
      <Button variant="secondary">Two</Button>
      <Button variant="secondary">Three</Button>
    </ButtonGroup>
  ),
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = { args: { orientation: 'vertical' } };

export const Attached: Story = { args: { attached: true } };

export const AttachedVertical: Story = { args: { attached: true, orientation: 'vertical' } };

export const WideGap: Story = { args: { gap: 'md' } };
