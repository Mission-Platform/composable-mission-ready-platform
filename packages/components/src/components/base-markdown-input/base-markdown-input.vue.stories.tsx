import { ref } from 'vue';

import { MarkdownInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `MarkdownInput` is the Vue 3 build of the write-once `BaseMarkdownInput` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseMarkdownInput',
  component: MarkdownInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `MarkdownInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A write/preview tab bar fronts a glyph toolbar + textarea and a `marked`-rendered preview (kept verbatim), injected into the preview host via a `useRef` + `useEffect` `innerHTML` assignment (replacing `v-html`); the value is controlled via `modelValue` and the `v-model`/emits become callback props. Styling comes from the co-located `base-markdown-input.module.scss`.',
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
  render: (arguments_) => ({
    components: { MarkdownInput },
    setup() {
      const value = ref(arguments_.modelValue ?? '# Hello\n\nSome **markdown** with a [link](https://example.com).');
      return { args: arguments_, value };
    },
    template: '<MarkdownInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof MarkdownInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: 'Supports CommonMark.' } };

export const WithError: Story = { args: { error: 'Content is required.' } };

export const Readonly: Story = { args: { readonly: true } };
