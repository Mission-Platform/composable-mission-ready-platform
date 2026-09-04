import { ForgeIconSort } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeIconSort` is a cross-framework icon
 * `ForgeIconSort` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/forge-jsx`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-forge`. This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'icons/data/tables/forge-icon-sort',
  component: ForgeIconSort,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    active: { control: 'boolean' },
    direction: { control: 'inline-radio', options: ['asc', 'desc'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', active: true, direction: 'asc' },
} satisfies Meta<typeof ForgeIconSort>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'xl' } };

export const Descending: Story = { args: { direction: 'desc' } };
export const Inactive: Story = { args: { active: false } };
