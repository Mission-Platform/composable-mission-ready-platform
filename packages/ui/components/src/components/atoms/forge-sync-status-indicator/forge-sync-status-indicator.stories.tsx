import { ForgeSyncStatusIndicator } from '@mission-platform/components';

import type { SyncStatusIndicatorProperties } from './forge-sync-status-indicator';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Feedback/ForgeSyncStatusIndicator',
  component: ForgeSyncStatusIndicator,
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'select', options: ['synced', 'syncing', 'pending', 'error', 'offline'] },
    showLabel: { control: 'boolean' },
  },
  args: { status: 'synced', showLabel: true },
  render: (arguments_) => <ForgeSyncStatusIndicator {...arguments_} />,
} satisfies Meta<SyncStatusIndicatorProperties>;

export default meta;
type Story = StoryObj<SyncStatusIndicatorProperties>;

export const Synced: Story = {};
export const Syncing: Story = { args: { status: 'syncing' } };
export const Pending: Story = { args: { status: 'pending' } };
export const Error: Story = { args: { status: 'error' } };
export const Offline: Story = { args: { status: 'offline', showLabel: false } };
