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

  parameters: {
    docs: {
      description: {
        component: 'Padlock. Use to represent a locked or restricted state. The `open` prop toggles between locked and unlocked appearances.',
      },
    },
  },
} satisfies Meta<typeof IconLock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default size (`md` / `24px`) with `currentColor` fill — inherits the surrounding text colour. */
export const Default: Story = {};

/** Lock shown in the open (unlocked) state via `open: true`. */
export const Open: Story = { args: { open: true, ariaLabel: 'Unlocked' } };

/** Small size variant — useful in compact UI elements such as inline badges or table cells. */
export const Small: Story = { args: { size: 16 } };

/** Large size variant — suitable for empty-state illustrations or prominent call-to-action areas. */
export const Large: Story = { args: { size: 32 } };

/** Custom colour applied via the `color` prop — demonstrates that any CSS colour value is accepted. */
export const Colored: Story = { args: { color: '#6c2fd4' } };
