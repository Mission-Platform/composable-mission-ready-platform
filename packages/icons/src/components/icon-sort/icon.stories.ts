import IconSort from './icon.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Icons/Navigation / Controls/IconSort',
  component: IconSort,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    direction: { control: 'select', options: ['asc', 'desc', undefined] },
    active: { control: 'boolean' },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', active: false, direction: undefined },

  parameters: {
    docs: {
      description: {
        component: 'Sort indicator. The `direction` prop (`asc` | `desc`) and `active` prop control the visual state. Use in data-table column headers to show current sort order.',
      },
    },
  },
} satisfies Meta<typeof IconSort>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default size (`md` / `24px`) with `currentColor` fill — inherits the surrounding text colour. */
export const Default: Story = {};
/** Sort indicator in active ascending state (`active: true`, `direction: "asc"`). */
export const ActiveAsc: Story = { args: { active: true, direction: 'asc' } };
/** Sort indicator in active descending state (`active: true`, `direction: "desc"`). */
export const ActiveDesc: Story = { args: { active: true, direction: 'desc' } };
/** Sort indicator in the neutral / inactive state (no active sort direction). */
export const Inactive: Story = { args: { active: false, direction: undefined } };
/** Small size variant — useful in compact UI elements such as inline badges or table cells. */
export const Small: Story = { args: { size: 'sm' } };
/** Large size variant — suitable for empty-state illustrations or prominent call-to-action areas. */
export const Large: Story = { args: { size: 'xl' } };
