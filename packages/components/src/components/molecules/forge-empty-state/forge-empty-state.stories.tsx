import { ForgeEmptyState } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Feedback/ForgeEmptyState',
  component: ForgeEmptyState,
  tags: ['autodocs'],
  args: {
    title: 'No results found',
    description: 'Try changing your search or filters.',
    icon: '○',
  },
} satisfies Meta<typeof ForgeEmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithActions: Story = {};
