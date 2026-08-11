import { ForgeWysiwygBlockControls } from '@mission-platform/content';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeWysiwygBlockControls` is the write-once `ForgeWysiwygBlockControls` — the
 * per-block overlay shown on hover/caret inside the editor. It outlines the
 * active block and floats a control bar to move the block up/down and change its
 * alignment/justification. The editor feeds it the block geometry; here it is
 * shown over a fixed sample rectangle.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/content` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var.
 */
const meta = {
  title: 'Molecules/Editor/ForgeWysiwygBlockControls',
  component: ForgeWysiwygBlockControls,
  tags: ['autodocs'],
  args: {
    visible: true,
    geometry: { top: 24, left: 24, width: 420, height: 96 },
    activeAlign: 'alignLeft',
    canMoveUp: true,
    canMoveDown: true,
  },
  render: (arguments_) => (
    <div style={{ position: 'relative', height: 200, border: '1px dashed var(--mp-color-border-subtle)' }}>
      <ForgeWysiwygBlockControls {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ForgeWysiwygBlockControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CenteredBlock: Story = { args: { activeAlign: 'alignCenter' } };
export const FirstBlock: Story = { args: { canMoveUp: false } };
