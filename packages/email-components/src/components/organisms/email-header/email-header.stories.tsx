import { EmailHeader, EmailTypography } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Email/EmailHeader',
  component: EmailHeader,
  tags: ['autodocs'],
  args: {
    brandName: 'Mission Platform',
  },
  render: (arguments_) => (
    <EmailHeader {...arguments_}>
      <EmailTypography href="https://example.com/account">Account</EmailTypography>
    </EmailHeader>
  ),
} satisfies Meta<typeof EmailHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BrandName: Story = {};
export const WithLogo: Story = {
  args: {
    brandName: 'Mission Platform',
    logoSrc: 'https://example.com/mission-platform.png',
    logoAlt: 'Mission Platform logo',
    logoWidth: 160,
  },
};
