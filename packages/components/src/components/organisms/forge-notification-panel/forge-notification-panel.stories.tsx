import { ForgeNotificationPanel } from './forge-notification-panel';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Feedback/ForgeNotificationPanel',
  component: ForgeNotificationPanel,
  tags: ['autodocs'],
  args: {
    notifications: [
      {
        id: 'one',
        title: 'Welcome',
        message: 'Your workspace is ready.',
        type: 'success' as const,
        timestamp: 'Today',
      },
      {
        id: 'two',
        title: 'Weekly summary',
        message: 'Your weekly summary is ready.',
        timestamp: 'Yesterday',
        read: true,
      },
    ],
    unreadCount: 1,
  },
} satisfies Meta<typeof ForgeNotificationPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
