import { ForgeGauge, type GaugeProperties } from './forge-gauge';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Feedback/ForgeGauge',
  component: ForgeGauge,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    showValue: { control: 'boolean' },
  },
  args: { value: 72, max: 100, label: 'Completion', showValue: true, size: 'md' },
  render: (arguments_) => <ForgeGauge {...arguments_} />,
} satisfies Meta<GaugeProperties>;

export default meta;
type Story = StoryObj<GaugeProperties>;

export const Default: Story = {};
export const Complete: Story = { args: { value: 100 } };
export const WithoutValue: Story = { args: { showValue: false } };
