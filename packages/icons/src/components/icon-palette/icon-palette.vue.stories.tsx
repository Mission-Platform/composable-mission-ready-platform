import { IconPalette } from '@mission-platform/icons/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `IconPalette` is the Vue 3 build of the cross-framework icon
 * `IconPalette` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-jsx`. The very same source also ships via the
 * package's `./react` subpath.
 */
const meta = {
  title: 'Icons/General UI/IconPalette',
  component: IconPalette,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor' },
} satisfies Meta<typeof IconPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'xl' } };
