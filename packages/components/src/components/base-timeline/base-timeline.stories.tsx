import { Timeline } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Timeline` is the Vue 3 build of the write-once `BaseTimeline` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Data Display/BaseTimeline',
  component: Timeline,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Timeline` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The original `BaseTimeline`/`BaseTimelineItem` pair shared its orientation through a `provide`/`inject` context; the neutral version flattens them into one component driven by an `items` array (like the migrated `BaseTabs`), so the layout state simply flows from props onto each `<li>`. Styling comes from the co-located `base-timeline.module.scss`.',
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
