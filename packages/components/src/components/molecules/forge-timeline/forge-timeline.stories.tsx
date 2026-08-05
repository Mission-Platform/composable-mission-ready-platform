import { ForgeTimeline } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeTimeline` is the write-once `ForgeTimeline` component of `@mission-platform/components` — a single component driven by an `items` array,
 * with the layout state flowing from props onto each `<li>`.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Data Display/ForgeTimeline',
  component: ForgeTimeline,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeTimeline` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It is driven by an `items` array so the layout state flows from props onto each `<li>`. Styling comes from the co-located `forge-timeline.module.scss`.',
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
} satisfies Meta<typeof ForgeTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Alternate: Story = { args: { align: 'alternate' } };

export const Horizontal: Story = { args: { orientation: 'horizontal' } };
