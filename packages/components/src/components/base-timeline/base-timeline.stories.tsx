import BaseTypography from '../base-typography/base-typography.vue';

import BaseTimelineItem from './base-timeline-item.vue';
import BaseTimeline from './base-timeline.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Data Display/BaseTimeline',
  component: BaseTimeline,
  subcomponents: { BaseTimelineItem },
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    align: { control: 'inline-radio', options: ['start', 'alternate'] },
  },
  args: {
    orientation: 'vertical',
    align: 'start',
  },
  parameters: {
    docs: {
      description: {
        component:
          "`Timeline` displays a chronological sequence of events. Compose it from `BaseTimelineItem` children; the item automatically inherits the parent timeline's orientation and alternating rhythm. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.",
      },
    },
  },
} satisfies Meta<typeof BaseTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A vertical timeline with mixed marker variants and body content. */
export const Vertical: Story = {
  render: (arguments_) => ({
    components: { BaseTimeline, BaseTimelineItem, BaseTypography },
    setup: () => ({ args: arguments_ }),
    template: `
      <BaseTimeline v-bind="args">
        <BaseTimelineItem variant="success" title="Project kick-off" time="January 2024">
          <BaseTypography variant="body-sm" color="secondary">The platform monorepo is scaffolded.</BaseTypography>
        </BaseTimelineItem>
        <BaseTimelineItem variant="primary" title="First component shipped" time="March 2024">
          <BaseTypography variant="body-sm" color="secondary">BaseButton lands in the catalogue.</BaseTypography>
        </BaseTimelineItem>
        <BaseTimelineItem variant="information" title="Theming released" time="June 2024">
          <BaseTypography variant="body-sm" color="secondary">Light / dark themes and design tokens go live.</BaseTypography>
        </BaseTimelineItem>
        <BaseTimelineItem variant="warning" outlined title="In progress" time="Now">
          <BaseTypography variant="body-sm" color="secondary">Expanding the component library.</BaseTypography>
        </BaseTimelineItem>
      </BaseTimeline>
    `,
  }),
};

/** Vertical items zig-zag on alternating sides of a centred line. */
export const Alternate: Story = {
  args: { align: 'alternate' },
  render: Vertical.render,
};

/** A horizontal timeline scrolls along the inline axis. */
export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  render: (arguments_) => ({
    components: { BaseTimeline, BaseTimelineItem, BaseTypography },
    setup: () => ({ args: arguments_ }),
    template: `
      <BaseTimeline v-bind="args">
        <BaseTimelineItem variant="success" title="Ordered" time="09:00" />
        <BaseTimelineItem variant="primary" title="Packed" time="11:30" />
        <BaseTimelineItem variant="information" title="Shipped" time="14:15" />
        <BaseTimelineItem variant="warning" outlined title="Out for delivery" time="Now" />
      </BaseTimeline>
    `,
  }),
};
