import IconMapPin from './icon.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Icons/General UI/IconMapPin',
  component: IconMapPin,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    size: 24,
    color: 'currentColor',
    ariaLabel: 'Map Pin',
  },

  parameters: {
    docs: {
      description: {
        component: 'Map pin / location marker. Use for places, addresses, and maps.',
      },
    },
  },
} satisfies Meta<typeof IconMapPin>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default size (`md` / `24px`) with `currentColor` fill — inherits the surrounding text colour. */
export const Default: Story = {};

/** Small size variant — useful in compact UI elements such as inline badges or table cells. */
export const Small: Story = { args: { size: 16 } };

/** Large size variant — suitable for empty-state illustrations or prominent call-to-action areas. */
export const Large: Story = { args: { size: 32 } };

/** Custom colour applied via the `color` prop — demonstrates that any CSS colour value is accepted. */
export const Colored: Story = { args: { color: '#6c2fd4' } };
