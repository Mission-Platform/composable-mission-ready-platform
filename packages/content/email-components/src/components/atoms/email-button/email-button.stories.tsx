import { EmailButton } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Email/EmailButton',
  component: EmailButton,
  tags: ['autodocs'],
  args: {
    href: 'https://example.com',
  },
  render: (arguments_) => <EmailButton {...arguments_}>Continue</EmailButton>,
} satisfies Meta<typeof EmailButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Success: Story = { args: { variant: 'success', size: 'lg' } };
export const Compact: Story = { args: { size: 'sm' } };
export const Ghost: Story = { args: { variant: 'ghost', size: 'xl' } };
