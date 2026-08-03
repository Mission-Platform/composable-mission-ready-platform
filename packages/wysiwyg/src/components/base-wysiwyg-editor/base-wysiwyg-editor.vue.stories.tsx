import { WysiwygEditor } from '@mission-platform/wysiwyg/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `WysiwygEditor` is the Vue 3 build of the write-once `BaseWysiwygEditor` in
 * `@mission-platform/wysiwyg`, authored once in the neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-forge`. The same source ships via `./react`.
 *
 * It composes `@mission-platform/components` (`BaseButton`, and — in the HTML
 * source view — `BaseMonacoEditor` with Hunspell + Harper spell/grammar
 * checking) and `@mission-platform/icons` for the toolbar glyphs, and derives a
 * live word/character counter from an RxJS stream.
 */
const meta = {
  title: 'WYSIWYG/WysiwygEditor',
  component: WysiwygEditor,
  tags: ['autodocs'],
  args: {
    modelValue: '<h2>Mission report</h2><p>Type here to <strong>format</strong> text.</p>',
    placeholder: 'Start typing…',
    spellCheck: false,
    minHeight: '14rem',
  },
  render: (args) => ({
    components: { WysiwygEditor },
    setup() {
      return { args };
    },
    template: '<WysiwygEditor v-bind="args" />',
  }),
} satisfies Meta<typeof WysiwygEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ReadOnly: Story = { args: { readonly: true } };
export const WithSpellCheck: Story = { args: { spellCheck: true } };
export const WithoutStatusBar: Story = { args: { showStatusBar: false } };
