import { Button } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Button` is the **React** build of the write-once `BaseButton` in
 * `@mission-platform/components`. It demonstrates event handlers, boolean
 * attributes, conditional children, and composition of another neutral
 * component (`BaseBadge`), all authored once in the neutral JSX dialect and
 * compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Display/BaseButton',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Button` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It composes the neutral `BaseBadge` for its optional trailing count and owns its `@layer mp.components` styling via the co-located `base-button.module.scss`.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'tertiary'] },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
    disabled: { control: 'boolean' },
    badge: { control: 'text' },
  },
  args: {
    variant: 'primary',
    type: 'button',
    disabled: false,
  },
  render: (arguments_) => <Button {...arguments_}>Button</Button>,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Tertiary: Story = { args: { variant: 'tertiary' } };

export const Disabled: Story = { args: { disabled: true } };

export const WithBadge: Story = { args: { variant: 'primary', badge: 3 } };
