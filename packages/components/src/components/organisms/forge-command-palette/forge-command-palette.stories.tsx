import { useArgs } from 'storybook/preview-api';

import { ForgeCommandPalette } from '@mission-platform/components';

import type { CommandPaletteCommand, CommandPaletteProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const commands: CommandPaletteCommand[] = [
  { id: 'new', label: 'Create mission', description: 'Start a new mission', shortcut: '⌘ N' },
  { id: 'search', label: 'Search missions', keywords: ['find', 'filter'] },
  { id: 'settings', label: 'Open settings', group: 'Navigate' },
];

const meta = {
  title: 'Organisms/Navigation/ForgeCommandPalette',
  component: ForgeCommandPalette,
  tags: ['autodocs'],
  args: { commands, label: 'Mission commands', triggerLabel: 'Commands' },
  argTypes: { open: { control: 'boolean' }, size: { control: 'select', options: ['sm', 'md', 'lg'] } },
} satisfies Meta<typeof ForgeCommandPalette>;

export default meta;
type Story = StoryObj<CommandPaletteProperties>;

export const Interactive: Story = {
  render: (arguments_) => {
    const [{ open }, updateArguments] = useArgs();
    return (
      <ForgeCommandPalette
        {...(arguments_ as CommandPaletteProperties)}
        open={Boolean(open)}
        onOpenChange={(value) => updateArguments({ open: value })}
      />
    );
  },
};

export const Open: Story = { args: { open: true } };
