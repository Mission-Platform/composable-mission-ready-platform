import { ForgeMetricCard, type MetricCardProperties } from './forge-metric-card';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Display/ForgeMetricCard',
  component: ForgeMetricCard,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
  },
  args: {
    label: 'Active users',
    value: '12,480',
    trend: { value: '+12%', direction: 'up' },
    size: 'md',
    loading: false,
  },
} satisfies Meta<MetricCardProperties>;

export default meta;
type Story = StoryObj<MetricCardProperties>;

export const Default: Story = {};
export const DownwardTrend: Story = {
  args: { label: 'Failed jobs', value: '18', trend: { value: '-4%', direction: 'down' } },
};
export const NoChange: Story = {
  args: { label: 'Uptime', value: '99.9%', trend: { value: '0%', direction: 'flat' } },
};
export const Loading: Story = { args: { label: 'Revenue', value: '$42,800', loading: true } };
