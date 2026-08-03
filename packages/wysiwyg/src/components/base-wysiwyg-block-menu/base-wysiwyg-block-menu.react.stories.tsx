import { WysiwygBlockMenu } from '@mission-platform/wysiwyg/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `WysiwygBlockMenu` is the React build of the write-once `BaseWysiwygBlockMenu`
 * — the toolbar's block-style selector. It replaces the former
 * heading/paragraph/quote buttons with a single dropdown (Paragraph, Headings
 * 1-6, Block Quote, Monospace), composing `@mission-platform/components`'
 * `BaseDropdown`.
 */
const meta = {
  title: 'WYSIWYG/WysiwygBlockMenu',
  component: WysiwygBlockMenu,
  tags: ['autodocs'],
  args: {
    activeFormat: 'heading2',
  },
  render: (args) => (
    <div style={{ padding: '4rem', minHeight: '20rem' }}>
      <WysiwygBlockMenu {...args} />
    </div>
  ),
} satisfies Meta<typeof WysiwygBlockMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Paragraph: Story = { args: { activeFormat: 'paragraph' } };
export const Disabled: Story = { args: { disabled: true } };
