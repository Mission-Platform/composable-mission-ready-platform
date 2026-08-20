import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';
import { expect, userEvent, within } from 'storybook/test';

import { ForgeInput } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeInput` is the write-once component of `@mission-platform/forms`.
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
  title: 'Atoms/Forms/ForgeInput',
  component: ForgeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The value is controlled via `modelValue`; the original `start`/`prefix`/`suffix`/`end` named slots become `MpChild` content props and the `v-model` + `change`/`blur`/`focus` emits become the `onUpdateModelValue`/`onChange`/`onBlur`/`onFocus` callback props. Styling comes from the co-located `forge-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search', 'url'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Full name',
    placeholder: 'Ada Lovelace',
    type: 'text',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeInput
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { modelValue: 'Ada Lovelace' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'As it appears on your passport.' } };

export const WithError: Story = { args: { error: 'This field is required.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: 'Locked value' } };

export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: 'Full name' });
    await userEvent.tab();
    await expect(input).toHaveFocus();
  },
};

export const WithDatalist: Story = {
  args: { label: 'Favourite fruit', list: ['Apple', 'Banana', 'Cherry', 'Date'], placeholder: 'Start typing…' },
};
