import { ForgeIcon } from '@mission-platform/components';

import type { IconProperties } from './forge-icon';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Display/ForgeIcon',
  component: ForgeIcon,
  tags: ['autodocs'],
  argTypes: {
    name: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    ariaLabel: { control: 'text' },
  },
  args: { name: 'forge-icon-check', size: 'lg', ariaLabel: 'Complete', color: 'currentColor' },
  render: (arguments_) => <ForgeIcon {...arguments_} />,
} satisfies Meta<IconProperties>;

export default meta;
type Story = StoryObj<IconProperties>;

export const Default: Story = {};
export const Decorative: Story = { args: { name: 'forge-icon-map-pin' } };
export const SafeFallback: Story = { args: { name: 'not-in-the-catalog', ariaLabel: 'Unknown icon' } };
