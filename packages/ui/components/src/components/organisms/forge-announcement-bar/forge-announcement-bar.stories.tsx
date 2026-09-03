import { ForgeAnnouncementBar } from '@mission-platform/components';

import type { AnnouncementBarProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Feedback/ForgeAnnouncementBar',
  component: ForgeAnnouncementBar,
  tags: ['autodocs'],
  args: {
    message: 'The service will be unavailable tonight at 22:00 UTC.',
    variant: 'warning',
    link: { label: 'Read details', href: '/maintenance' },
    dismissible: true,
  },
} satisfies Meta<typeof ForgeAnnouncementBar>;

export default meta;
type Story = StoryObj<AnnouncementBarProperties>;

export const Default: Story = {};
export const Informational: Story = {
  args: {
    message: 'You can now share dashboards with your team.',
    variant: 'info',
    link: { label: 'Learn more', href: '/features' },
  },
};
export const NotDismissible: Story = { args: { dismissible: false, link: undefined } };
