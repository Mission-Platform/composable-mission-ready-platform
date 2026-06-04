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
} satisfies Meta<typeof IconChevron>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Up: Story = { args: { direction: 'up' } };

export const Right: Story = { args: { direction: 'right' } };

export const Left: Story = { args: { direction: 'left' } };

export const Small: Story = { args: { size: 16 } };

export const Large: Story = { args: { size: 32 } };

export const Colored: Story = { args: { color: '#6c2fd4' } };
