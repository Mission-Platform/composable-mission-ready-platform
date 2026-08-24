import { ForgeShortcutHint } from './forge-shortcut-hint';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Navigation/ForgeShortcutHint',
  component: ForgeShortcutHint,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    separator: { control: 'text' },
  },
  args: {
    label: 'Open command menu',
    keys: ['⌘', 'K'],
    size: 'md',
  },
} satisfies Meta<typeof ForgeShortcutHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithShift: Story = { args: { label: 'Open quick search', keys: ['⌘', 'Shift', 'P'] } };
export const WithoutKeys: Story = { args: { label: 'Keyboard shortcuts unavailable', keys: [] } };
