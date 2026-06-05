import IconChevron from './icon.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Icons/Navigation / Controls/IconChevron',
  component: IconChevron,
  tags: ['autodocs'],
  argTypes: {
    direction: { control: 'select', options: ['up', 'right', 'down', 'left'] },
    size: { control: 'number' },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    direction: 'down',
    size: 24,
    color: 'currentColor',
  },

  parameters: {
    docs: {
      description: {
        component: 'Chevron directional indicator. Supports `up`, `right`, `down`, and `left` directions. Use for dropdowns, accordion toggles, or breadcrumb separators.',
      },
    },
  },
} satisfies Meta<typeof IconChevron>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default size (`md` / `24px`) with `currentColor` fill — inherits the surrounding text colour. */
export const Default: Story = {};

/** Arrow / chevron pointing up. */
export const Up: Story = { args: { direction: 'up' } };

/** Arrow / chevron pointing right. */
export const Right: Story = { args: { direction: 'right' } };

/** Arrow / chevron pointing left. */
export const Left: Story = { args: { direction: 'left' } };

/** Small size variant — useful in compact UI elements such as inline badges or table cells. */
export const Small: Story = { args: { size: 16 } };

/** Large size variant — suitable for empty-state illustrations or prominent call-to-action areas. */
export const Large: Story = { args: { size: 32 } };

/** Custom colour applied via the `color` prop — demonstrates that any CSS colour value is accepted. */
export const Colored: Story = { args: { color: '#6c2fd4' } };
