import BaseLocationInput from './base-location-input.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const NYC = { lat: 40.712_775_3, lng: -74.005_972_8 };

const meta = {
  title: 'Components/Forms/BaseLocationInput',
  component: BaseLocationInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseLocationInput` — captures a latitude/longitude point in one of Decimal Degrees (DD), Degrees Decimal Minutes (DM), or Degrees Minutes Seconds (DMS), chosen via a compact, single-line format selector. The canonical model always stores signed decimal-degree coordinates rounded to centimetre precision (7 fractional digits). See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    format: { control: 'select', options: ['dd', 'dm', 'dms'] },
    allowFormatChange: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Location',
    size: 'md',
    format: 'dd',
    allowFormatChange: true,
    disabled: false,
    required: false,
    id: 'example-location-input',
  },
  render: (arguments_) => ({
    components: { BaseLocationInput },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseLocationInput v-bind="args" />',
  }),
} satisfies Meta<typeof BaseLocationInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DecimalDegrees: Story = {
  args: { modelValue: { ...NYC, format: 'dd' } },
};

export const DegreesMinutesSeconds: Story = {
  args: { format: 'dms', modelValue: { ...NYC, format: 'dms' } },
};

export const DegreesDecimalMinutes: Story = {
  args: { format: 'dm', modelValue: { ...NYC, format: 'dm' } },
};

export const FixedFormat: Story = {
  args: { allowFormatChange: false, modelValue: { ...NYC, format: 'dd' } },
};

export const WithError: Story = {
  args: { error: 'Please enter a valid coordinate.' },
};

export const Disabled: Story = {
  args: { disabled: true, modelValue: { ...NYC, format: 'dd' } },
};
