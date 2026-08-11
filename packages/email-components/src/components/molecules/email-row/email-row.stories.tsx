import { EmailColumn, EmailRow } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Email/EmailRow',
  component: EmailRow,
  tags: ['autodocs'],
  args: {
    align: 'left',
    valign: 'top',
  },
  render: (arguments_) => (
    <EmailRow {...arguments_}>
      <EmailColumn width="50%">Left column</EmailColumn>
      <EmailColumn
        width="50%"
        align="right"
      >
        Right column
      </EmailColumn>
    </EmailRow>
  ),
} satisfies Meta<typeof EmailRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const StacksOnMobile: Story = { args: { stackOnMobile: true } };
