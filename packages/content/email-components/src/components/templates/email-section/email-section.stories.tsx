import { EmailSection, EmailTypography } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Templates/Email/EmailSection',
  component: EmailSection,
  tags: ['autodocs'],
  args: {
    background: 'bg.surface',
    padding: 'lg',
  },
  render: (arguments_) => (
    <EmailSection {...arguments_}>
      <EmailTypography>Sections provide predictable vertical rhythm for email layouts.</EmailTypography>
    </EmailSection>
  ),
} satisfies Meta<typeof EmailSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AccentSurface: Story = { args: { background: 'bg.raised', padding: 'xl' } };
