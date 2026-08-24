import { ForgeKbd } from '@mission-platform/components';

import type { KbdProperties } from './forge-kbd';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Atoms/Display/ForgeKbd',
  component: ForgeKbd,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    pressed: { control: 'boolean' },
  },
  args: { children: '⌘ K', size: 'md', pressed: false },
  render: (arguments_) => <ForgeKbd {...arguments_} />,
} satisfies Meta<KbdProperties>;

export default meta;
type Story = StoryObj<KbdProperties>;

export const Default: Story = {};
export const Pressed: Story = { args: { children: '⌘ K', pressed: true } };
export const Large: Story = { args: { children: 'Enter', size: 'lg' } };
