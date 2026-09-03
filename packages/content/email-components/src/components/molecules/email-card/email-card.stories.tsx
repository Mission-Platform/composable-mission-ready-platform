import { EmailCard, EmailTypography } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Email/EmailCard',
  component: EmailCard,
  tags: ['autodocs'],
  args: {
    background: 'bg.surface',
    borderColor: 'border.default',
    radius: 'md',
    padding: 'lg',
  },
  render: (arguments_) => (
    <EmailCard {...arguments_}>
      <EmailTypography>Content grouped in a tokenized email card.</EmailTypography>
    </EmailCard>
  ),
} satisfies Meta<typeof EmailCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Raised: Story = {
  args: { background: 'bg.raised', borderColor: 'border.strong', padding: 'xl', radius: 'lg' },
};
