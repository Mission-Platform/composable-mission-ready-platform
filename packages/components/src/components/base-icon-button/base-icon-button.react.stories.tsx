import { IconButton } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `IconButton` is the **React** build of the write-once `BaseIconButton` in
 * `@mission-platform/components` — a square, icon-only button. Place the icon in
 * the default slot; an accessible name is required via `label`. Authored once in
 * the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Display/BaseIconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `IconButton` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). Place the icon in the default slot; an accessible name is required via `label`. The demo uses a simple inline glyph in place of an `@mission-platform/icons` icon.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: 'select',
      options: [
        'ghost',
        'neutral',
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'info',
        'error',
        'critical',
      ],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
  },
  args: {
    label: 'Close',
    variant: 'ghost',
    size: 'md',
    disabled: false,
    type: 'button',
  },
  render: (arguments_) => (
    <IconButton {...arguments_}>
      <span aria-hidden="true">✕</span>
    </IconButton>
  ),
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Info: Story = { args: { variant: 'info' } };

export const Error: Story = { args: { variant: 'error' } };

export const Critical: Story = { args: { variant: 'critical' } };

export const Disabled: Story = { args: { disabled: true } };
