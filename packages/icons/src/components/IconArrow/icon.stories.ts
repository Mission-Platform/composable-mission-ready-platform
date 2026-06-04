import IconArrow from './Icon.vue';

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
} satisfies Meta<typeof IconArrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Up: Story = { args: { direction: 'up' } };
export const Right: Story = { args: { direction: 'right' } };
export const Down: Story = { args: { direction: 'down' } };
export const Left: Story = { args: { direction: 'left' } };
export const Large: Story = { args: { size: 'xl' } };
