import { EmailList } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Email/EmailList',
  component: EmailList,
  tags: ['autodocs'],
  args: {
    items: [
      { children: 'First email-safe list item' },
      { children: 'Linked list item', href: 'https://example.com/details' },
    ],
    spacing: 'sm',
  },
} satisfies Meta<typeof EmailList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unordered: Story = {};
export const Ordered: Story = { args: { ordered: true } };
