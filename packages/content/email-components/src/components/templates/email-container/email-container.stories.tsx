import { EmailContainer, EmailTypography } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Templates/Email/EmailContainer',
  component: EmailContainer,
  tags: ['autodocs'],
  args: {
    width: 'md',
    background: 'bg.base',
  },
  render: (arguments_) => (
    <EmailContainer {...arguments_}>
      <EmailTypography>Centered, max-width email content with a static fallback.</EmailTypography>
    </EmailContainer>
  ),
} satisfies Meta<typeof EmailContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};
export const Narrow: Story = { args: { width: 'sm' } };
