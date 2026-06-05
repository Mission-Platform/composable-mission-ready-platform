import IconUser from './icon.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Icons/General UI/IconUser',
  component: IconUser,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    size: 24,
    color: 'currentColor',
    ariaLabel: 'User',
  },

  parameters: {
    docs: {
      description: {
        component: 'User / person avatar placeholder. Use in user profile menus, author attributions, or account settings.',
      },
    },
  },
} satisfies Meta<typeof IconUser>;

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
