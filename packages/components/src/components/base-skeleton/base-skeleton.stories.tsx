import { Skeleton } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Skeleton` is the Vue 3 build of the write-once `BaseSkeleton` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Feedback/BaseSkeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Skeleton` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders an `aria-hidden` loading placeholder in one of three shapes with an optional shimmer animation. Styling comes from the co-located `base-skeleton.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    shape: { control: 'select', options: ['line', 'circle', 'block'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    animated: { control: 'boolean' },
    width: { control: 'text' },
    height: { control: 'text' },
  },
  args: {
    shape: 'line',
    animated: true,
  },
  render: (arguments_) => ({
    components: { Skeleton },
    setup() {
      return { args: arguments_ };
    },
    template: '<div style="max-width: 300px;"><Skeleton v-bind="args" /></div>',
  }),
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Circle: Story = { args: { shape: 'circle' } };

export const Block: Story = { args: { shape: 'block' } };

export const CardSkeleton: Story = {
  render: () => ({
    components: { Skeleton },
    template: `
      <div style="max-width: 300px; display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1px solid #eee; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <Skeleton shape="circle" />
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <Skeleton width="60%" />
            <Skeleton width="40%" height="0.75em" />
          </div>
        </div>
        <Skeleton />
        <Skeleton width="80%" />
        <Skeleton shape="block" height="4rem" />
      </div>
    `,
  }),
};
