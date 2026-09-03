import { ForgeAlert, type AlertProperties } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Feedback/ForgeAlert',
  component: ForgeAlert,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['info', 'success', 'warning', 'danger'] },
    dismissible: { control: 'boolean' },
    icon: { control: 'boolean' },
  },
  args: { title: 'Heads up', children: 'Your preferences have been saved.', type: 'info', icon: true },
} satisfies Meta<AlertProperties>;

export default meta;
type Story = StoryObj<AlertProperties>;
export const Default: Story = {};
export const Success: Story = { args: { type: 'success', title: 'Saved', children: 'Changes are now live.' } };
export const Warning: Story = { args: { type: 'warning', title: 'Review required' } };
export const Dismissible: Story = { args: { dismissible: true } };
