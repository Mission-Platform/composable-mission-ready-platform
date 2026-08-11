import { ForgeIconLayer } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'icons/maps/layers/forge-icon-layer',
  component: ForgeIconLayer,
  tags: ['autodocs'],
  args: { size: 'md', ariaLabel: 'Map layers' },
} satisfies Meta<typeof ForgeIconLayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
