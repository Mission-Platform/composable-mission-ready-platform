import { IconSort } from '@mission-platform/icons/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `IconSort` is the Vue 3 build of the cross-framework icon
 * `IconSort` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-forge`. The very same source also ships via the
 * package's `./react` subpath.
 */
const meta = {
  title: 'Icons/Navigation / Controls/IconSort',
  component: IconSort,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    active: { control: 'boolean' },
    direction: { control: 'inline-radio', options: ['asc', 'desc'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', active: true, direction: 'asc' },
} satisfies Meta<typeof IconSort>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'xl' } };

export const Descending: Story = { args: { direction: 'desc' } };
export const Inactive: Story = { args: { active: false } };
