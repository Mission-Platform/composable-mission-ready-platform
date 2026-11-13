import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

import { ForgeStatsSection } from './forge-stats-section';

const meta = {
  title: 'Organisms/Marketing/ForgeStatsSection',
  component: ForgeStatsSection,
  tags: ['autodocs'],
  args: {
    title: 'At a glance',
    stats: [
      { id: 'users', value: '10k+', label: 'Users' },
      { id: 'uptime', value: '99.9%', label: 'Uptime' },
    ],
    columns: 4,
    animated: true,
    variant: 'default' as const,
  },
} satisfies Meta<typeof ForgeStatsSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
