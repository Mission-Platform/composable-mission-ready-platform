import { ForgeCommentThread } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const comments = [
  {
    id: '1',
    author: 'Jordan Kim',
    body: 'This is looking great. I have one small suggestion.',
    timestamp: '2026-08-24T09:00:00Z',
  },
  {
    id: '2',
    author: 'Riley Chen',
    body: 'The suggestion has been addressed.',
    timestamp: '2026-08-24T10:00:00Z',
    resolved: true,
  },
];

const meta = {
  title: 'Organisms/Collaboration/ForgeCommentThread',
  component: ForgeCommentThread,
  tags: ['autodocs'],
  args: { comments },
} satisfies Meta<typeof ForgeCommentThread>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { comments: [] } };
