import IconCalendar from './icon.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Icons/General UI/IconCalendar',
  component: IconCalendar,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    size: 24,
    color: 'currentColor',
    ariaLabel: 'Calendar',
  },
} satisfies Meta<typeof IconCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 16 } };

export const Large: Story = { args: { size: 32 } };

export const Colored: Story = { args: { color: '#6c2fd4' } };
