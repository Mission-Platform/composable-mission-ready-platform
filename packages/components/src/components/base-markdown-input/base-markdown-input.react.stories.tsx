import { useState } from 'react';

import { MarkdownInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `MarkdownInput` is the **React** build of the write-once `BaseMarkdownInput`
 * in `@mission-platform/components`. A write/preview tab bar fronts a glyph
 * toolbar + textarea and a `marked`-rendered preview, injected into the preview
 * host via a `useRef` + `useEffect` `innerHTML` assignment; the value is
 * controlled via `modelValue` and the `v-model`/emits become callback props.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseMarkdownInput',
  component: MarkdownInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `MarkdownInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A write/preview tab bar fronts a glyph toolbar + textarea and a `marked`-rendered preview; the value is controlled via `modelValue`. Styling comes from the co-located `base-markdown-input.module.scss`.',
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
    const [value, setValue] = useState(
      arguments_.modelValue ?? '# Hello\n\nSome **markdown** with a [link](https://example.com).',
    );
    return (
      <MarkdownInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
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
