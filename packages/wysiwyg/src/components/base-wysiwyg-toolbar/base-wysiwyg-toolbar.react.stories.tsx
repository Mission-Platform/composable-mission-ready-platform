import { WysiwygToolbar } from '@mission-platform/wysiwyg/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `WysiwygToolbar` is the React build of the write-once `BaseWysiwygToolbar` —
 * the formatting toolbar for the editor. By default it renders the block-format
 * dropdown followed by grouped icon buttons (bold/italic/…, lists, code/link/
 * image, alignment, undo/redo); pass `items` to replace the built-ins with a
 * custom control set.
 */
const meta = {
  title: 'WYSIWYG/WysiwygToolbar',
  component: WysiwygToolbar,
  tags: ['autodocs'],
  args: {
    blockFormat: 'paragraph',
    activeCommands: ['bold'],
  },
  render: (args) => (
    <div style={{ padding: '1rem', minHeight: '16rem' }}>
      <WysiwygToolbar {...args} />
    </div>
  ),
} satisfies Meta<typeof WysiwygToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithSourceToggle: Story = { args: { showSourceToggle: true, sourceActive: false } };
export const Disabled: Story = { args: { disabled: true } };
