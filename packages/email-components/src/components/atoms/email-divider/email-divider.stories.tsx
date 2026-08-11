import { EmailDivider } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Email/EmailDivider',
  component: EmailDivider,
  tags: ['autodocs'],
  args: {
    spacing: 'md',
  },
} satisfies Meta<typeof EmailDivider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
