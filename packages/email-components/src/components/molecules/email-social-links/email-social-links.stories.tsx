import { EmailSocialLinks } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Email/EmailSocialLinks',
  component: EmailSocialLinks,
  tags: ['autodocs'],
  args: {
    links: [
      { href: 'https://example.com/news', label: 'News' },
      { href: 'https://example.com/community', label: 'Community' },
      { href: 'https://example.com/support', label: 'Support' },
    ],
  },
} satisfies Meta<typeof EmailSocialLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
