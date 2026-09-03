import { ForgeIconRedo } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'icons/content/editing/forge-icon-redo',
  component: ForgeIconRedo,
  tags: ['autodocs'],
  args: { size: 'md', ariaLabel: 'Redo' },
} satisfies Meta<typeof ForgeIconRedo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
