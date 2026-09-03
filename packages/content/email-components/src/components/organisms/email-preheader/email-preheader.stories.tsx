import { EmailPreheader } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Email/EmailPreheader',
  component: EmailPreheader,
  tags: ['autodocs'],
  args: {
    text: 'A concise preview of the message shown in supported inboxes.',
  },
} satisfies Meta<typeof EmailPreheader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
