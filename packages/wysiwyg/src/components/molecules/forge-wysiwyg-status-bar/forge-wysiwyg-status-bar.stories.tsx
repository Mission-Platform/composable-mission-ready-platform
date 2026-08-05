import { ForgeWysiwygStatusBar } from '@mission-platform/wysiwyg';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeWysiwygStatusBar` is the write-once `ForgeWysiwygStatusBar` — the editor's
 * status bar extracted into its own fully customisable component. By default it
 * shows the live word/character counts; pass `items` to replace those segments
 * with your own.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/wysiwyg` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var.
 */
const meta = {
  title: 'Molecules/Editor/ForgeWysiwygStatusBar',
  component: ForgeWysiwygStatusBar,
  tags: ['autodocs'],
  args: {
    stats: { words: 128, characters: 742, charactersNoSpaces: 620 },
  },
} satisfies Meta<typeof ForgeWysiwygStatusBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Centered: Story = { args: { align: 'center' } };
export const CustomItems: Story = {
  args: {
    align: 'between',
    items: [
      { id: 'reading-time', label: 'min read', value: 3 },
      { id: 'selection', label: 'Ln 12, Col 4' },
      { id: 'saved', label: 'All changes saved' },
    ],
  },
};
