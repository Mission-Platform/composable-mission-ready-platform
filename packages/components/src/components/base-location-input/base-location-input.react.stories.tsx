import { useState } from 'react';

import { LocationInput } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `LocationInput` is the **React** build of the write-once `BaseLocationInput`
 * in `@mission-platform/components`. It composes the write-once
 * `Select`/`Input`/`Typography` primitives and captures a latitude/longitude
 * point in DD, DM, or DMS form; the canonical model always carries signed
 * decimal-degree `lat`/`lng`. The `v-model` + `change` emits become the
 * `onUpdateModelValue`/`onChange` callback props. Authored once in the neutral
 * JSX dialect and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Forms/BaseLocationInput',
  component: LocationInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `LocationInput` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It composes the write-once `Select`/`Input`/`Typography` primitives and captures a latitude/longitude point in DD, DM, or DMS form; the canonical model always carries signed decimal-degree `lat`/`lng`. The conversion logic ships as the co-located `location.ts`.',
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
  },
  render: (arguments_) => {
    const [value, setValue] = useState(
      arguments_.modelValue ?? { lat: 40.712_775_3, lng: -74.005_972_8, format: 'dd' },
    );
    return (
      <LocationInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
} satisfies Meta<typeof LocationInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DegreesMinutes: Story = {
  args: { format: 'dm' },
  render: (arguments_) => {
    const [value, setValue] = useState({ lat: 40.712_775_3, lng: -74.005_972_8, format: 'dm' });
    return (
      <LocationInput
        {...arguments_}
        modelValue={value}
        onUpdateModelValue={setValue}
      />
    );
  },
};

export const FixedFormat: Story = { args: { allowFormatChange: false } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Enter the incident location.' } };

export const WithError: Story = { args: { error: 'Coordinates are required.' } };

export const Disabled: Story = { args: { disabled: true } };
