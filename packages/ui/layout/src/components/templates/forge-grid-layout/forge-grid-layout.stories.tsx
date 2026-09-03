import { ForgeGridLayout } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Templates/Layout/ForgeGridLayout',
  component: ForgeGridLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A regular responsive grid for ordered named cells. Cells render in cell1 through cellN source order, use the configured tracks above the breakpoint, and collapse to one column below it.',
      },
    },
  },
  argTypes: {
    rows: { control: { type: 'number', min: 1, max: 4, step: 1 } },
    columns: { control: { type: 'number', min: 1, max: 4, step: 1 } },
    breakpoint: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    rows: 2,
    columns: 2,
    breakpoint: 'md',
    gap: 'lg',
  },
} satisfies Meta<typeof ForgeGridLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const card = (label: string) => (
  <div style={{ minHeight: '7rem', padding: 'var(--mp-spacing-6)', background: 'var(--mp-color-bg-surface)' }}>
    {label}
  </div>
);

/** A dashboard-style card collection suitable for service status summaries. */
export const DashboardCards: Story = {
  render: (arguments_) => (
    <ForgeGridLayout
      {...arguments_}
      cell1={card('Service availability')}
      cell2={card('Latency summary')}
      cell3={card('Recent incidents')}
      cell4={card('Throughput')}
    />
  ),
};

/** A narrow example with only the first three cells supplied. */
export const NarrowSparse: Story = {
  args: {
    rows: 1,
    columns: 3,
    breakpoint: 'lg',
  },
  render: (arguments_) => (
    <ForgeGridLayout
      {...arguments_}
      cell1={card('Primary metric')}
      cell2={card('Secondary metric')}
      cell3={card('Trend')}
    />
  ),
};
