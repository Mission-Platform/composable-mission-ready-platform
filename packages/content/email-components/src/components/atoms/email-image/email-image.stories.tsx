import { EmailImage } from '@mission-platform/email-components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Email/EmailImage',
  component: EmailImage,
  tags: ['autodocs'],
  args: {
    src: '/favicon.svg',
    alt: 'Mission Platform logo',
    width: 240,
    height: 80,
    fluid: true,
  },
} satisfies Meta<typeof EmailImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fluid: Story = {};
export const FixedWidth: Story = { args: { fluid: false } };
