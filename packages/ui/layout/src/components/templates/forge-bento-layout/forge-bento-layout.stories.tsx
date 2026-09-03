import { ForgeBentoLayout } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Templates/Layout/ForgeBentoLayout',
  component: ForgeBentoLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A responsive asymmetric composition for a dominant hero region with supporting feature content. Named regions remain in hero, feature, supporting source order and stack below the selected breakpoint.',
      },
    },
  },
  argTypes: {
    breakpoint: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    breakpoint: 'md',
    gap: 'lg',
  },
} satisfies Meta<typeof ForgeBentoLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const panel = (label: string, background: string) => (
  <div style={{ minHeight: '8rem', padding: 'var(--mp-spacing-6)', background, borderRadius: 'var(--mp-radius-lg)' }}>
    {label}
  </div>
);

/** A website-style marketing hero with feature and supporting content beside it. */
export const MarketingComposition: Story = {
  render: (arguments_) => (
    <ForgeBentoLayout
      {...arguments_}
      hero={panel('Hero / primary value proposition', 'var(--mp-color-primary-muted)')}
      feature={panel('Featured capability', 'var(--mp-color-bg-surface)')}
      supporting={panel('Supporting links and context', 'var(--mp-color-bg-subtle)')}
    />
  ),
};

/** A sparse composition demonstrates that absent optional regions leave no empty wrappers. */
export const Sparse: Story = {
  render: (arguments_) => (
    <ForgeBentoLayout
      {...arguments_}
      hero={panel('Only the primary content is supplied', 'var(--mp-color-bg-surface)')}
    />
  ),
};
