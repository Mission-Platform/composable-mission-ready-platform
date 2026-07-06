import { ref } from 'vue';

import { LocationInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `LocationInput` is the Vue 3 build of the write-once `BaseLocationInput` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseLocationInput',
  component: LocationInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `LocationInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It composes the migrated `BaseSelect`/`BaseInput`/`BaseTypography` primitives and captures a latitude/longitude point in DD, DM, or DMS form; the canonical model always carries signed decimal-degree `lat`/`lng`. The local text buffers become neutral `useState` resynced via `useEffect`, and the `v-model` + `change` emits become the `onUpdateModelValue`/`onChange` callback props. The conversion logic ships with the package as the co-located `location.ts`.',
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
  render: (arguments_) => ({
    components: { LocationInput },
    setup() {
      const value = ref(arguments_.modelValue ?? { lat: 40.712_775_3, lng: -74.005_972_8, format: 'dd' });
      return { args: arguments_, value };
    },
    template: '<LocationInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof LocationInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DegreesMinutes: Story = {
  args: { format: 'dm' },
  render: (arguments_) => ({
    components: { LocationInput },
    setup() {
      const value = ref({ lat: 40.712_775_3, lng: -74.005_972_8, format: 'dm' });
      return { args: arguments_, value };
    },
    template: '<LocationInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
};

export const FixedFormat: Story = { args: { allowFormatChange: false } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Enter the incident location.' } };

export const WithError: Story = { args: { error: 'Coordinates are required.' } };

export const Disabled: Story = { args: { disabled: true } };
