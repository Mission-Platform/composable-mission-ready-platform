import { useArgs } from 'storybook/preview-api';

import { ForgeFileInput } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeFileInput` is the write-once component of `@mission-platform/forms`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/forms` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Forms/ForgeFileInput',
  component: ForgeFileInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeFileInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A visually-hidden native `<input type="file">` fronted by a browse-button row or a `dragDrop` dropzone; the selection is controlled via `modelValue`, the `ForgeIconUpload` becomes a `⬆` glyph, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `forge-file-input.module.scss`.',
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
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeFileInput
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeFileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = { args: { multiple: true } };

export const DragDrop: Story = { args: { dragDrop: true } };

export const WithHint: Story = { args: { hint: 'PNG or JPG, up to 5 MB.' } };

export const WithError: Story = { args: { error: 'Please choose a file.' } };

export const Disabled: Story = { args: { disabled: true } };
