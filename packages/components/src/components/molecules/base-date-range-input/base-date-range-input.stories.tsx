import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { DateRangeInput } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `DateRangeInput` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Forms/BaseDateRangeInput',
  component: DateRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `DateRangeInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A trigger opens a teleported, CSS-anchor-positioned popover with two composed `Calendar`s (start/end), kept ordered via `min`/`max` (substituting the SFC hover-driven dual-month grid); the `{ start, end }` range is controlled via `modelValue`, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-date-range-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Date range',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <DateRangeInput
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof DateRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: { start: '2026-01-10', end: '2026-01-20' } } };

export const WithHint: Story = { args: { hint: 'Both endpoints are inclusive.' } };

export const WithError: Story = { args: { error: 'A range is required.' } };
