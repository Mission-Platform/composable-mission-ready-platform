import IconFilter from './icon.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Icons/Navigation / Controls/IconFilter',
  component: IconFilter,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    size: 24,
    color: 'currentColor',
    ariaLabel: 'Filter',
  },

  parameters: {
    docs: {
      description: {
        component: 'Filter / funnel. Use on filter panel triggers, active filter badges, or data-table filter controls.',
      },
    },
  },
} satisfies Meta<typeof IconFilter>;

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
