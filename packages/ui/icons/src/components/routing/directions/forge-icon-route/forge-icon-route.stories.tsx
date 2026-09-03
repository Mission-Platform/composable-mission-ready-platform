import { ForgeIconRoute } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'icons/routing/directions/forge-icon-route',
  component: ForgeIconRoute,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor' },
} satisfies Meta<typeof ForgeIconRoute>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: 'xl' } };
