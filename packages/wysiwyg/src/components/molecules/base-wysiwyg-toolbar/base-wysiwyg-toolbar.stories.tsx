import { h } from '@mission-platform/forge';

import { WysiwygToolbar } from '@mission-platform/wysiwyg';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `WysiwygToolbar` is the write-once `BaseWysiwygToolbar` — the formatting
 * toolbar for the editor. By default it renders the block-format dropdown
 * followed by grouped icon buttons (bold/italic/…, lists, code/link/image,
 * alignment, undo/redo); pass `items` to replace the built-ins with a custom
 * control set.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/wysiwyg` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var.
 */
const meta = {
  title: 'Molecules/Editor/WysiwygToolbar',
  component: WysiwygToolbar,
  tags: ['autodocs'],
  args: {
    blockFormat: 'paragraph',
    activeCommands: ['bold'],
  },
  render: (arguments_) => (
    <div style={{ padding: '1rem', minHeight: '16rem' }}>
      <WysiwygToolbar {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof WysiwygToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithSourceToggle: Story = { args: { showSourceToggle: true, sourceActive: false } };
export const Disabled: Story = { args: { disabled: true } };
