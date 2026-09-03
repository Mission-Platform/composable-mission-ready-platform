import { ForgeIconUndo } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'icons/content/editing/forge-icon-undo',
  component: ForgeIconUndo,
  tags: ['autodocs'],
  args: { size: 'md', ariaLabel: 'Undo' },
} satisfies Meta<typeof ForgeIconUndo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
