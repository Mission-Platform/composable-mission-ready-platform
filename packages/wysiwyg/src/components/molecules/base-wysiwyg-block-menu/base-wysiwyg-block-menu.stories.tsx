import { h } from '@mission-platform/forge';

import { WysiwygBlockMenu } from '@mission-platform/wysiwyg';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `WysiwygBlockMenu` is the write-once `BaseWysiwygBlockMenu` — the toolbar's
 * block-style selector. It replaces the former heading/paragraph/quote buttons
 * with a single dropdown (Paragraph, Headings 1-6, Block Quote, Monospace),
 * composing `@mission-platform/components`' `BaseDropdown`.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/wysiwyg` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var.
 */
const meta = {
  title: 'Molecules/Editor/WysiwygBlockMenu',
  component: WysiwygBlockMenu,
  tags: ['autodocs'],
  args: {
    activeFormat: 'heading2',
  },
  render: (arguments_) => (
    <div style={{ padding: '4rem', minHeight: '20rem' }}>
      <WysiwygBlockMenu {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof WysiwygBlockMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Paragraph: Story = { args: { activeFormat: 'paragraph' } };
export const Disabled: Story = { args: { disabled: true } };
