import { EmailColumn, EmailRow } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Email/EmailColumn',
  component: EmailColumn,
  tags: ['autodocs'],
  args: {
    width: '50%',
    valign: 'top',
  },
  render: (arguments_) => (
    <EmailRow>
      <EmailColumn {...arguments_}>Primary column content</EmailColumn>
      <EmailColumn width="50%">Secondary column content</EmailColumn>
    </EmailRow>
  ),
} satisfies Meta<typeof EmailColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoColumns: Story = {};
export const StacksOnMobile: Story = { args: { stackOnMobile: true } };
