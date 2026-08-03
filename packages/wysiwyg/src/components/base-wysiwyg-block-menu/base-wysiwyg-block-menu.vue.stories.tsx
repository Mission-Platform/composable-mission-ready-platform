import { WysiwygBlockMenu } from '@mission-platform/wysiwyg/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `WysiwygBlockMenu` is the Vue 3 build of the write-once `BaseWysiwygBlockMenu`
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
  render: (args) => ({
    components: { WysiwygBlockMenu },
    setup() {
      return { args };
    },
    template: '<div style="padding: 4rem; min-height: 20rem;"><WysiwygBlockMenu v-bind="args" /></div>',
  }),
} satisfies Meta<typeof WysiwygBlockMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Paragraph: Story = { args: { activeFormat: 'paragraph' } };
export const Disabled: Story = { args: { disabled: true } };
