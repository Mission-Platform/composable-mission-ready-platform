import { IconChevrons } from '@mission-platform/icons/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `IconChevrons` is the Vue 3 build of the cross-framework icon
 * `IconChevrons` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-jsx`. The very same source also ships via the
 * package's `./react` subpath.
 */
const meta = {
  title: 'Icons/General UI/IconChevrons',
  component: IconChevrons,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    direction: { control: 'inline-radio', options: ['up', 'right', 'down', 'left'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', direction: 'right' },
} satisfies Meta<typeof IconChevrons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Left: Story = { args: { direction: 'left' } };
export const Large: Story = { args: { size: 'xl' } };
