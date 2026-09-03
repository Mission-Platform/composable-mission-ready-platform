import { ForgeWysiwygToolbar } from '@mission-platform/content';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeWysiwygToolbar` is the write-once `ForgeWysiwygToolbar` — the formatting
 * toolbar for the editor. By default it renders the block-format dropdown
 * followed by grouped icon buttons (bold/italic/…, lists, code/link/image,
 * alignment, undo/redo); pass `items` to replace the built-ins with a custom
 * control set.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/content` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var.
 */
const meta = {
  title: 'Molecules/Editor/ForgeWysiwygToolbar',
  component: ForgeWysiwygToolbar,
  tags: ['autodocs'],
  args: {
    blockFormat: 'paragraph',
    activeCommands: ['bold'],
  },
  render: (arguments_) => (
    <div style={{ padding: '1rem', minHeight: '16rem' }}>
      <ForgeWysiwygToolbar {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ForgeWysiwygToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithSourceToggle: Story = { args: { showSourceToggle: true, sourceActive: false } };
export const Disabled: Story = { args: { disabled: true } };
