import { ForgeWysiwygBlockMenu } from '@mission-platform/content';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeWysiwygBlockMenu` is the write-once `ForgeWysiwygBlockMenu` — the toolbar's
 * block-style selector. It replaces the former heading/paragraph/quote buttons
 * with a single dropdown (Paragraph, Headings 1-6, Block Quote, Monospace),
 * composing `@mission-platform/float`'s `ForgeDropdown`.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/content` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var.
 */
const meta = {
  title: 'Molecules/Editor/ForgeWysiwygBlockMenu',
  component: ForgeWysiwygBlockMenu,
  tags: ['autodocs'],
  args: {
    activeFormat: 'heading2',
  },
  render: (arguments_) => (
    <div style={{ padding: '4rem', minHeight: '20rem' }}>
      <ForgeWysiwygBlockMenu {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ForgeWysiwygBlockMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Paragraph: Story = { args: { activeFormat: 'paragraph' } };
export const Disabled: Story = { args: { disabled: true } };
