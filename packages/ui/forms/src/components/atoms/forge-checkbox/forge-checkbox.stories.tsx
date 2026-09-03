import { useArgs } from 'storybook/preview-api';
import { expect, userEvent, within } from 'storybook/test';

import { ForgeCheckbox } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeCheckbox` is the write-once component of `@mission-platform/forms`.
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
  title: 'Atoms/Forms/ForgeCheckbox',
  component: ForgeCheckbox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeCheckbox` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The checked state is controlled via `modelValue`; the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. The check/indeterminate SVGs are substituted with a CSS-coloured `✓`/`−` glyph. Styling comes from the co-located `forge-checkbox.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    labelHidden: { control: 'boolean' },
  },
  args: {
    label: 'Accept terms and conditions',
    size: 'md',
    disabled: false,
    required: false,
    indeterminate: false,
    labelHidden: false,
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeCheckbox
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeCheckbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { modelValue: true } };

export const Required: Story = { args: { required: true } };

export const Indeterminate: Story = { args: { indeterminate: true } };

export const WithHint: Story = { args: { hint: 'You can change this later in settings.' } };

export const WithError: Story = { args: { error: 'You must accept to continue.' } };

export const Disabled: Story = { args: { disabled: true } };

export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole('checkbox', { name: 'Accept terms and conditions' });
    await userEvent.tab();
    await expect(checkbox).toHaveFocus();
  },
};
