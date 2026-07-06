import { IconArrow } from '@mission-platform/icons/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `IconArrow` is the Vue 3 build of the cross-framework icon
 * `IconArrow` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-jsx`. The very same source also ships via the
 * package's `./react` subpath.
 */
const meta = {
  title: 'Icons/Navigation / Controls/IconArrow',
  component: IconArrow,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    direction: { control: 'inline-radio', options: ['up', 'right', 'down', 'left'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', direction: 'up' },
} satisfies Meta<typeof IconArrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'xl' } };

export const PointingRight: Story = { args: { direction: 'right' } };
export const PointingDown: Story = { args: { direction: 'down' } };
export const PointingLeft: Story = { args: { direction: 'left' } };
