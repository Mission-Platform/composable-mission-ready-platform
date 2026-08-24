import { useArgs } from 'storybook/preview-api';

import { ForgeDateInput } from '@mission-platform/forms';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeDateInput` is the write-once component of `@mission-platform/forms`.
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
  title: 'Molecules/Forms/ForgeDateInput',
  component: ForgeDateInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeDateInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A trigger opens a teleported, CSS-anchor-positioned popover composing the migrated `Calendar` (replacing `@floating-ui` + `useZIndex`); the ISO date is controlled via `modelValue`, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `forge-date-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Date',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeDateInput
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeDateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: '2026-01-15' } };

export const WithHint: Story = { args: { hint: 'Choose any future date.' } };

export const WithError: Story = { args: { error: 'A date is required.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '2026-01-15' } };
