import { ref } from 'vue';

import { FileInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `FileInput` is the Vue 3 build of the write-once `BaseFileInput` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseFileInput',
  component: FileInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `FileInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A visually-hidden native `<input type="file">` fronted by a browse-button row or a `dragDrop` dropzone; the selection is controlled via `modelValue`, the `IconUpload` becomes a `⬆` glyph, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-file-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    multiple: { control: 'boolean' },
    dragDrop: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Attachment',
    size: 'md',
    multiple: false,
    dragDrop: false,
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { FileInput },
    setup() {
      const value = ref(arguments_.modelValue);
      return { args: arguments_, value };
    },
    template: '<FileInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof FileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = { args: { multiple: true } };

export const DragDrop: Story = { args: { dragDrop: true } };

export const WithHint: Story = { args: { hint: 'PNG or JPG, up to 5 MB.' } };

export const WithError: Story = { args: { error: 'Please choose a file.' } };

export const Disabled: Story = { args: { disabled: true } };
