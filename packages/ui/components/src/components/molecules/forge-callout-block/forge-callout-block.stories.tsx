import { ForgeCalloutBlock, type CalloutBlockProperties } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Feedback/ForgeCalloutBlock',
  component: ForgeCalloutBlock,
  tags: ['autodocs'],
  argTypes: { type: { control: 'select', options: ['info', 'success', 'warning', 'danger'] } },
  args: { title: 'Helpful information', description: 'Keep this information close to the task at hand.' },
} satisfies Meta<CalloutBlockProperties>;
export default meta;
type Story = StoryObj<CalloutBlockProperties>;
export const Default: Story = {};
export const Warning: Story = { args: { type: 'warning', title: 'Before you continue' } };
export const Success: Story = { args: { type: 'success', title: 'All set' } };
