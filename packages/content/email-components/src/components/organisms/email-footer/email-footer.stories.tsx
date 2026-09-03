import { EmailFooter, EmailSocialLinks } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Email/EmailFooter',
  component: EmailFooter,
  tags: ['autodocs'],
  args: {
    text: 'Mission Platform · 123 Platform Way',
  },
  render: (arguments_) => (
    <EmailFooter {...arguments_}>
      <EmailSocialLinks links={[{ href: 'https://example.com/preferences', label: 'Manage preferences' }]} />
    </EmailFooter>
  ),
} satisfies Meta<typeof EmailFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
