import IconArrow from './icon.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Icons/Navigation / Controls/IconArrow',
  component: IconArrow,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    direction: { control: 'select', options: ['up', 'right', 'down', 'left'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', direction: 'up' },

  parameters: {
    docs: {
      description: {
        component: 'Directional arrow. Supports `up`, `right`, `down`, and `left` directions. Use for navigation, sorting indicators, or directional actions.',
      },
    },
  },
} satisfies Meta<typeof IconArrow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default size (`md` / `24px`) with `currentColor` fill — inherits the surrounding text colour. */
export const Default: Story = {};
/** Arrow / chevron pointing up. */
export const Up: Story = { args: { direction: 'up' } };
/** Arrow / chevron pointing right. */
export const Right: Story = { args: { direction: 'right' } };
/** Arrow / chevron pointing down. */
export const Down: Story = { args: { direction: 'down' } };
/** Arrow / chevron pointing left. */
export const Left: Story = { args: { direction: 'left' } };
/** Large size variant — suitable for empty-state illustrations or prominent call-to-action areas. */
export const Large: Story = { args: { size: 'xl' } };
