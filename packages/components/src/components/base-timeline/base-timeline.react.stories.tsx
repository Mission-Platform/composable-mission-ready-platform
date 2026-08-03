import { Timeline } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Timeline` is the **React** build of the write-once `BaseTimeline` in
 * `@mission-platform/components` — a single component driven by an `items` array,
 * with the layout state flowing from props onto each `<li>`. Authored once in
 * the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Data Display/BaseTimeline',
  component: Timeline,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Timeline` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It is driven by an `items` array so the layout state flows from props onto each `<li>`. Styling comes from the co-located `base-timeline.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    align: { control: 'select', options: ['start', 'alternate'] },
  },
  args: {
    orientation: 'vertical',
    align: 'start',
    items: [
      {
        id: 'ordered',
        time: '09:00',
        title: 'Order placed',
        body: 'Your order has been received.',
        variant: 'primary',
      },
      {
        id: 'packed',
        time: '11:30',
        title: 'Packed',
        body: 'Your items are packed and ready.',
        variant: 'information',
      },
      { id: 'shipped', time: '14:15', title: 'Shipped', body: 'On its way to you.', variant: 'success' },
      {
        id: 'delivered',
        time: 'Pending',
        title: 'Delivered',
        body: 'Awaiting delivery.',
        variant: 'default',
        outlined: true,
      },
    ],
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Alternate: Story = { args: { align: 'alternate' } };

export const Horizontal: Story = { args: { orientation: 'horizontal' } };
