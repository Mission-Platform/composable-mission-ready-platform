import IconLock from './icon.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Icons/General UI/IconLock',
  component: IconLock,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    size: { control: 'number' },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    open: false,
    size: 24,
    color: 'currentColor',
    ariaLabel: 'Lock',
  },
} satisfies Meta<typeof IconLock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = { args: { open: true, ariaLabel: 'Unlocked' } };

export const Small: Story = { args: { size: 16 } };

export const Large: Story = { args: { size: 32 } };

export const Colored: Story = { args: { color: '#6c2fd4' } };
