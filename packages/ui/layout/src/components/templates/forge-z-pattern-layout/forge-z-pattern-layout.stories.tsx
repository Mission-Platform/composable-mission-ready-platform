import { ForgeZPatternLayout } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Templates/Layout/ForgeZPatternLayout',
  component: ForgeZPatternLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'An alternating scanning layout for marketing and landing-page sections. Top, middle, and bottom regions alternate visually on wide screens while remaining in topStart, topEnd, middle, bottomStart, bottomEnd source order.',
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
} satisfies Meta<typeof ForgeZPatternLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const block = (label: string, background: string) => (
  <div style={{ minHeight: '6rem', padding: 'var(--mp-spacing-6)', background }}>{label}</div>
);

/** A complete alternating flow for a product or campaign landing page. */
export const LandingPageFlow: Story = {
  render: (arguments_) => (
    <ForgeZPatternLayout
      {...arguments_}
      topStart={block('Top-left message', 'var(--mp-color-primary-muted)')}
      topEnd={block('Top-right visual', 'var(--mp-color-bg-surface)')}
      middle={block('Middle proof point or call to action', 'var(--mp-color-bg-subtle)')}
      bottomStart={block('Bottom-left detail', 'var(--mp-color-bg-surface)')}
      bottomEnd={block('Bottom-right action', 'var(--mp-color-primary-muted)')}
    />
  ),
};

/** A partial flow demonstrates that visual gaps are not reserved for missing slots. */
export const PartialFlow: Story = {
  render: (arguments_) => (
    <ForgeZPatternLayout
      {...arguments_}
      topStart={block('Top content', 'var(--mp-color-bg-surface)')}
      middle={block('Middle content', 'var(--mp-color-bg-subtle)')}
      bottomEnd={block('Bottom action', 'var(--mp-color-primary-muted)')}
    />
  ),
};
