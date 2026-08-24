import { ForgeActivityFeed } from '@mission-platform/components';

import type { ActivityFeedProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const items: ActivityFeedProperties['items'] = [
  {
    user: { name: 'Alex Morgan' },
    action: 'published a new release',
    target: 'version 3.2',
    timestamp: '2026-08-24T10:30:00Z',
    type: 'release',
  },
  {
    user: { name: 'Sam Lee' },
    action: 'commented on a task',
    target: 'a task',
    timestamp: '2026-08-23T15:10:00Z',
    type: 'comment',
  },
];

const meta = {
  title: 'Organisms/Activity/ForgeActivityFeed',
  component: ForgeActivityFeed,
  tags: ['autodocs'],
  args: { items, loadMore: true, ariaLabel: 'Project activity' },
} satisfies Meta<typeof ForgeActivityFeed>;

export default meta;
type Story = StoryObj<ActivityFeedProperties>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { items: [], loadMore: false } };
