import { Skeleton } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Skeleton` is the **React** build of the write-once `BaseSkeleton` in
 * `@mission-platform/components` — an `aria-hidden` loading placeholder in one of
 * three shapes with an optional shimmer animation. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Feedback/BaseSkeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Skeleton` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders an `aria-hidden` loading placeholder in one of three shapes with an optional shimmer animation. Styling comes from the co-located `base-skeleton.module.scss`.',
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
  render: (arguments_) => (
    <div style={{ maxWidth: 300 }}>
      <Skeleton {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Circle: Story = { args: { shape: 'circle' } };

export const Block: Story = { args: { shape: 'block' } };

export const CardSkeleton: Story = {
  render: () => (
    <div
      style={{
        maxWidth: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        border: '1px solid #eee',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton shape="circle" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="60%" />
          <Skeleton
            width="40%"
            height="0.75em"
          />
        </div>
      </div>
      <Skeleton />
      <Skeleton width="80%" />
      <Skeleton
        shape="block"
        height="4rem"
      />
    </div>
  ),
};
