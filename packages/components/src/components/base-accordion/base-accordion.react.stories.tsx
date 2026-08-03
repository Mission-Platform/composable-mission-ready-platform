import { Accordion } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Accordion` is the **React** build of the write-once `BaseAccordion` in
 * `@mission-platform/components`. It is driven by an `items` array with internal
 * open state; set `exclusive` to `false` to allow several items open at once.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Display/BaseAccordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Accordion` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It is driven by an `items` array with internal `useState` open state; set `exclusive` to `false` to allow several items open at once. Styling comes from the co-located `base-accordion.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    exclusive: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
  },
  args: {
    exclusive: true,
    items: [
      { id: 'shipping', title: 'Shipping', content: 'We ship worldwide within 3–5 business days.' },
      { id: 'returns', title: 'Returns', content: 'Returns are accepted within 30 days of delivery.' },
      { id: 'warranty', title: 'Warranty', content: 'All products carry a 2-year limited warranty.' },
    ],
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FirstOpen: Story = { args: { defaultOpen: ['shipping'] } };

export const Primary: Story = { args: { variant: 'primary', defaultOpen: ['shipping'] } };

export const Success: Story = { args: { variant: 'success', defaultOpen: ['shipping'] } };

export const Multiple: Story = { args: { exclusive: false, defaultOpen: ['shipping', 'warranty'] } };

export const WithDisabledItem: Story = {
  args: {
    items: [
      { id: 'shipping', title: 'Shipping', content: 'We ship worldwide within 3–5 business days.' },
      { id: 'returns', title: 'Returns', content: 'Returns are accepted within 30 days of delivery.' },
      { id: 'legacy', title: 'Legacy policy (unavailable)', content: 'No longer applicable.', disabled: true },
    ],
  },
};
