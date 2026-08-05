import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { LocationInput } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `LocationInput` is the write-once component of `@mission-platform/components`.
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
  title: 'Molecules/Forms/BaseLocationInput',
  component: LocationInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `LocationInput` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It composes the migrated `BaseSelect`/`BaseInput`/`BaseTypography` primitives and captures a latitude/longitude point in DD, DM, or DMS form; the canonical model always carries signed decimal-degree `lat`/`lng`. The local text buffers become neutral `useState` resynced via `useEffect`, and the `v-model` + `change` emits become the `onUpdateModelValue`/`onChange` callback props. The conversion logic ships with the package as the co-located `location.ts`.',
      },
    },
  },
  argTypes: {
    format: { control: 'select', options: ['dd', 'dm', 'dms'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    allowFormatChange: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    labelHidden: { control: 'boolean' },
  },
  args: {
    label: 'Coordinates',
    format: 'dd',
    allowFormatChange: true,
    size: 'md',
    disabled: false,
    required: false,
    labelHidden: false,
    modelValue: { lat: 40.712_775_3, lng: -74.005_972_8, format: 'dd' },
  },
  render: (arguments_) => {
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <LocationInput
        {...arguments_}
        modelValue={modelValue}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
      />
    );
  },
} satisfies Meta<typeof LocationInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DegreesMinutes: Story = {
  args: {
    format: 'dm',
    modelValue: { lat: 40.712_775_3, lng: -74.005_972_8, format: 'dm' },
  },
};

export const FixedFormat: Story = { args: { allowFormatChange: false } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Enter the incident location.' } };

export const WithError: Story = { args: { error: 'Coordinates are required.' } };

export const Disabled: Story = { args: { disabled: true } };
