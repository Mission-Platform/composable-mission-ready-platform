import { EmailSpacer } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Email/EmailSpacer',
  component: EmailSpacer,
  tags: ['autodocs'],
  args: {
    spacing: 'md',
  },
} satisfies Meta<typeof EmailSpacer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { spacing: 'lg' } };
