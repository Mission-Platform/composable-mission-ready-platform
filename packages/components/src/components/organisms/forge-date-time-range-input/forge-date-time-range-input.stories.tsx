import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeDateTimeRangeInput } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeDateTimeRangeInput` is the write-once component of `@mission-platform/components`.
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
  title: 'Organisms/Forms/ForgeDateTimeRangeInput',
  component: ForgeDateTimeRangeInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeDateTimeRangeInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A trigger opens a teleported, CSS-anchor-positioned popover with a browser/UTC toggle and two endpoint panes, each a composed `Calendar` plus scrollable time lists (replacing `@floating-ui` + `useZIndex`); the `{ start, end, timezone }` range is controlled via `modelValue`, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `forge-date-time-range-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    showSeconds: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Date & time range',
    size: 'md',
    showSeconds: false,
    disabled: false,
    required: false,
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <ForgeDateTimeRangeInput
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof ForgeDateTimeRangeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: { modelValue: { start: '2026-01-10 09:00', end: '2026-01-12 17:30', timezone: 'browser' } },
};

export const Utc: Story = {
  args: { modelValue: { start: '2026-01-10 09:00', end: '2026-01-12 17:30', timezone: 'utc' } },
};

export const WithError: Story = { args: { error: 'A window is required.' } };
