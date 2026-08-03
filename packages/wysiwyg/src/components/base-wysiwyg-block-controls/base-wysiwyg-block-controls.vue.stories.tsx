import { WysiwygBlockControls } from '@mission-platform/wysiwyg/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `WysiwygBlockControls` is the Vue 3 build of the write-once
 * `BaseWysiwygBlockControls` — the per-block overlay shown on hover/caret inside
 * the editor. It outlines the active block and floats a control bar to move the
 * block up/down and change its alignment/justification. The editor feeds it the
 * block geometry; here it is shown over a fixed sample rectangle.
 */
const meta = {
  title: 'WYSIWYG/WysiwygBlockControls',
  component: WysiwygBlockControls,
  tags: ['autodocs'],
  args: {
    visible: true,
    geometry: { top: 24, left: 24, width: 420, height: 96 },
    activeAlign: 'alignLeft',
    canMoveUp: true,
    canMoveDown: true,
  },
  render: (args) => ({
    components: { WysiwygBlockControls },
    setup() {
      return { args };
    },
    template:
      '<div style="position: relative; height: 200px; border: 1px dashed var(--mp-color-border-subtle);">' +
      '<WysiwygBlockControls v-bind="args" /></div>',
  }),
} satisfies Meta<typeof WysiwygBlockControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CenteredBlock: Story = { args: { activeAlign: 'alignCenter' } };
export const FirstBlock: Story = { args: { canMoveUp: false } };
