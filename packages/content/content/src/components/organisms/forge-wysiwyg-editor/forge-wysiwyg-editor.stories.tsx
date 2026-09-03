import { useArgs } from 'storybook/preview-api';

import { ForgeWysiwygEditor } from '@mission-platform/content';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeWysiwygEditor` is the write-once `ForgeWysiwygEditor` in
 * `@mission-platform/content`, authored once in the neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to every supported framework
 * by `@mission-platform/vite-plugin-forge`.
 *
 * It composes `@mission-platform/components` (`ForgeButton`, and — in the HTML
 * source view — `ForgeMonacoEditor` with Hunspell + Harper spell/grammar
 * checking) and `@mission-platform/icons` for the toolbar glyphs, and derives a
 * live word/character counter from an RxJS stream.
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/content` import auto-resolves to the framework selected by
 * the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by that
 * framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Organisms/Editor/ForgeWysiwygEditor',
  component: ForgeWysiwygEditor,
  tags: ['autodocs'],
  args: {
    modelValue: {
      version: 1,
      type: 'document',
      children: [
        { type: 'heading', level: 2, children: [{ type: 'text', value: 'Mission report' }] },
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Type here to ' },
            { type: 'text', value: 'format', marks: [{ type: 'strong' }] },
            { type: 'text', value: ' text.' },
          ],
        },
      ],
    },
    placeholder: 'Start typing…',
    spellCheck: false,
    minHeight: '14rem',
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeWysiwygEditor
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeWysiwygEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ReadOnly: Story = { args: { readonly: true } };
export const WithSpellCheck: Story = { args: { spellCheck: true } };
export const WithoutStatusBar: Story = { args: { showStatusBar: false } };
