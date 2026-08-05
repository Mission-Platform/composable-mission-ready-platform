import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { MarkdownInput } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `MarkdownInput` is the write-once `BaseMarkdownInput` component of `@mission-platform/components`
 * in `@mission-platform/components`. A write/preview tab bar fronts a glyph
 * toolbar + textarea and a `marked`-rendered preview, injected into the preview
 * host via a `useRef` + `useEffect` `innerHTML` assignment; the value is
 * controlled via `modelValue` and the `v-model`/emits become callback props.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Forms/BaseMarkdownInput',
  component: MarkdownInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `MarkdownInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A write/preview tab bar fronts a glyph toolbar + textarea and a `marked`-rendered preview; the value is controlled via `modelValue`. Styling comes from the co-located `base-markdown-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    rows: { control: 'number' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Notes',
    size: 'md',
    rows: 6,
    disabled: false,
    readonly: false,
    required: false,
  },
  render: (arguments_) => {
    const [{ modelValue: value = '# Hello\n\nSome **markdown** with a [link](https://example.com).' }, updateArguments] = useArgs();

    return (
      <MarkdownInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof MarkdownInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: 'Supports CommonMark.' } };

export const WithError: Story = { args: { error: 'Content is required.' } };

export const Readonly: Story = { args: { readonly: true } };
