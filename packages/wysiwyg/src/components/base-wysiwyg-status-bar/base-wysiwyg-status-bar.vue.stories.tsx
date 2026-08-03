import { WysiwygStatusBar } from '@mission-platform/wysiwyg/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `WysiwygStatusBar` is the Vue 3 build of the write-once `BaseWysiwygStatusBar`
 * — the editor's status bar extracted into its own fully customisable component.
 * By default it shows the live word/character counts; pass `items` to replace
 * those segments with your own.
 */
const meta = {
  title: 'WYSIWYG/WysiwygStatusBar',
  component: WysiwygStatusBar,
  tags: ['autodocs'],
  args: {
    stats: { words: 128, characters: 742, charactersNoSpaces: 620 },
  },
  render: (args) => ({
    components: { WysiwygStatusBar },
    setup() {
      return { args };
    },
    template: '<WysiwygStatusBar v-bind="args" />',
  }),
} satisfies Meta<typeof WysiwygStatusBar>;

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
