import { ForgeProfileCard } from './forge-profile-card';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/People/ForgeProfileCard',
  component: ForgeProfileCard,
  tags: ['autodocs'],
  args: {
    user: {
      name: 'Ada Lovelace',
      role: 'Engineer',
      initials: 'AL',
      status: 'online' as const,
      socials: [{ id: 'github', label: 'GitHub', href: '#' }],
    },
    variant: 'default' as const,
    editable: true,
    stats: [{ id: 'projects', label: 'Projects', value: 24 }],
  },
} satisfies Meta<typeof ForgeProfileCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
