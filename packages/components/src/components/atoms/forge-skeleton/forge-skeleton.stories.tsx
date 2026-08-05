import { h } from '@mission-platform/forge';

import { ForgeSkeleton } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeSkeleton` is the write-once `ForgeSkeleton` component of `@mission-platform/components` — an `aria-hidden` loading placeholder in one of
 * three shapes with an optional shimmer animation.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Feedback/ForgeSkeleton',
  component: ForgeSkeleton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeSkeleton` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders an `aria-hidden` loading placeholder in one of three shapes with an optional shimmer animation. Styling comes from the co-located `forge-skeleton.module.scss`.',
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
      <ForgeSkeleton {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ForgeSkeleton>;

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
        <ForgeSkeleton shape="circle" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ForgeSkeleton width="60%" />
          <ForgeSkeleton
            width="40%"
            height="0.75em"
          />
        </div>
      </div>
      <ForgeSkeleton />
      <ForgeSkeleton width="80%" />
      <ForgeSkeleton
        shape="block"
        height="4rem"
      />
    </div>
  ),
};
