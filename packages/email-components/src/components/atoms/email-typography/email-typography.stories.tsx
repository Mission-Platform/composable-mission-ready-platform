import { EmailTypography } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Email/EmailTypography',
  component: EmailTypography,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The single email text atom: headings, body copy, and links share one tokenized type scale resolved to literal inline styles.',
      },
    },
  },
  args: {
    align: 'left',
  },
  render: (arguments_) => <EmailTypography {...arguments_}>Email-safe text with static inline styles.</EmailTypography>,
} satisfies Meta<typeof EmailTypography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {};
export const BodySmall: Story = { args: { variant: 'body-sm' } };
export const Heading: Story = {
  args: { as: 'h2' },
  render: (arguments_) => <EmailTypography {...arguments_}>A readable email heading</EmailTypography>,
};
export const HeadingCentered: Story = {
  args: { as: 'h1', align: 'center' },
  render: (arguments_) => <EmailTypography {...arguments_}>A centered email heading</EmailTypography>,
};
export const Link: Story = {
  args: { href: 'https://example.com', target: '_blank' },
  render: (arguments_) => <EmailTypography {...arguments_}>Read the full announcement</EmailTypography>,
};
export const LinkSecondary: Story = {
  args: { href: 'https://example.com', color: 'text.secondary' },
  render: (arguments_) => <EmailTypography {...arguments_}>A muted inline link</EmailTypography>,
};
