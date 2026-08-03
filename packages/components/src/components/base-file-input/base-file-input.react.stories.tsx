import { useState } from 'react';

import { FileInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `FileInput` is the **React** build of the write-once `BaseFileInput` in
 * `@mission-platform/components`. A visually-hidden native `<input type="file">`
 * fronted by a browse-button row or a `dragDrop` dropzone; the selection is
 * controlled via `modelValue`, and the `v-model` + `change` emit become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Forms/BaseFileInput',
  component: FileInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `FileInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A visually-hidden native `<input type="file">` fronted by a browse-button row or a `dragDrop` dropzone; the selection is controlled via `modelValue`. Styling comes from the co-located `base-file-input.module.scss`.',
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
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue);
    return (
      <FileInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof FileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = { args: { multiple: true } };

export const DragDrop: Story = { args: { dragDrop: true } };

export const WithHint: Story = { args: { hint: 'PNG or JPG, up to 5 MB.' } };

export const WithError: Story = { args: { error: 'Please choose a file.' } };

export const Disabled: Story = { args: { disabled: true } };
