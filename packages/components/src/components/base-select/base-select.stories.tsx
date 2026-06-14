import { expect, userEvent, within } from 'storybook/test';
import { ref } from 'vue';

import BaseSelect from './base-select.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const FRUIT_OPTIONS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Durian (disabled)', value: 'durian', disabled: true },
];

const meta = {
  title: 'Components/Forms/BaseSelect',
  component: BaseSelect,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseSelect` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    name: { control: 'text' },
    autocomplete: { control: 'text' },
  },
  args: {
    modelValue: '',
    size: 'md',
    label: 'Fruit',
    placeholder: 'Pick a fruit…',
    options: FRUIT_OPTIONS,
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { BaseSelect },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseSelect v-bind="args" style="max-width: 320px" />',
  }),
} satisfies Meta<typeof BaseSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (arguments_) => ({
    components: { BaseSelect },
    setup() {
      const modelValue = ref(arguments_.modelValue ?? '');
      return { args: arguments_, modelValue };
    },
    template:
      '<BaseSelect v-bind="args" :modelValue="modelValue" @update:modelValue="modelValue = $event" style="max-width: 320px" />',
  }),
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const combobox = canvas.getByRole('combobox', { name: /fruit/i });

    // Act — open the dropdown by clicking the trigger button
    const trigger = within(combobox).getByRole('button');
    await userEvent.click(trigger);

    // Select the "Apple" option from the listbox
    const listbox = canvas.getByRole('listbox');
    const appleOption = within(listbox).getByRole('option', { name: /apple/i });
    await userEvent.click(appleOption);

    // Assert — trigger now shows the selected label
    expect(trigger).toHaveTextContent('Apple');
  },
};

export const WithHint: Story = { args: { hint: 'Choose your favourite fruit.' } };

export const WithError: Story = { args: { error: 'Please select a fruit.' } };

export const Required: Story = { args: { required: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const NoLabel: Story = { args: { label: 'Fruit', labelHidden: true } };

export const WithNativeAutocomplete: Story = {
  parameters: {
    docs: {
      description: {
        story: [
          'The combobox is backed by a visually-hidden native `<select>` that carries the',
          '`name` and `autocomplete` attributes, so browsers and profile managers can autofill',
          'the field and submit its value in a native `<form>`. Selecting via autofill updates',
          '`v-model` just like clicking an option.',
        ].join(' '),
      },
    },
  },
  render: (arguments_) => ({
    components: { BaseSelect },
    setup() {
      const modelValue = ref(arguments_.modelValue ?? '');
      return { args: arguments_, modelValue };
    },
    template: `
      <form style="max-width: 320px">
        <BaseSelect
          v-bind="args"
          name="country"
          autocomplete="country"
          :modelValue="modelValue"
          @update:modelValue="modelValue = $event"
        />
      </form>
    `,
  }),
  args: {
    label: 'Country',
    placeholder: 'Select a country…',
    options: [
      { label: 'United Kingdom', value: 'GB' },
      { label: 'United States', value: 'US' },
      { label: 'Australia', value: 'AU' },
    ],
  },
};

export const AutocompleteExamples: Story = {
  parameters: {
    docs: {
      description: {
        story: [
          'Common single-select autofill fields, each backed by the hidden native `<select>`.',
          'Give every control a `name` and the matching standard `autocomplete` token',
          '(`honorific-prefix`, `sex`, `bday-month`, `country`, `cc-exp-month`, …) so browsers',
          'and profile managers can fill the whole form in one tap and submit it natively.',
        ].join(' '),
      },
    },
  },
  render: () => ({
    components: { BaseSelect },
    setup() {
      const title = ref('');
      const sex = ref('');
      const birthMonth = ref('');
      const country = ref('');
      const cardExpiryMonth = ref('');

      const titleOptions = [
        { label: 'Mr', value: 'mr' },
        { label: 'Mrs', value: 'mrs' },
        { label: 'Ms', value: 'ms' },
        { label: 'Mx', value: 'mx' },
        { label: 'Dr', value: 'dr' },
      ];
      const sexOptions = [
        { label: 'Female', value: 'female' },
        { label: 'Male', value: 'male' },
        { label: 'Prefer not to say', value: 'unspecified' },
      ];
      const monthOptions = [
        { label: 'January', value: '01' },
        { label: 'February', value: '02' },
        { label: 'March', value: '03' },
        { label: 'April', value: '04' },
        { label: 'May', value: '05' },
        { label: 'June', value: '06' },
        { label: 'July', value: '07' },
        { label: 'August', value: '08' },
        { label: 'September', value: '09' },
        { label: 'October', value: '10' },
        { label: 'November', value: '11' },
        { label: 'December', value: '12' },
      ];
      const countryOptions = [
        { label: 'United Kingdom', value: 'GB' },
        { label: 'United States', value: 'US' },
        { label: 'Australia', value: 'AU' },
        { label: 'Canada', value: 'CA' },
        { label: 'New Zealand', value: 'NZ' },
      ];

      return {
        title,
        sex,
        birthMonth,
        country,
        cardExpiryMonth,
        titleOptions,
        sexOptions,
        monthOptions,
        countryOptions,
      };
    },
    template: `
      <form style="display: grid; gap: 16px; max-width: 320px">
        <BaseSelect
          label="Title"
          placeholder="Select a title…"
          name="honorific-prefix"
          autocomplete="honorific-prefix"
          :options="titleOptions"
          :modelValue="title"
          @update:modelValue="title = $event"
        />
        <BaseSelect
          label="Sex"
          placeholder="Select…"
          name="sex"
          autocomplete="sex"
          :options="sexOptions"
          :modelValue="sex"
          @update:modelValue="sex = $event"
        />
        <BaseSelect
          label="Birth month"
          placeholder="Select a month…"
          name="bday-month"
          autocomplete="bday-month"
          :options="monthOptions"
          :modelValue="birthMonth"
          @update:modelValue="birthMonth = $event"
        />
        <BaseSelect
          label="Country"
          placeholder="Select a country…"
          name="country"
          autocomplete="country"
          :options="countryOptions"
          :modelValue="country"
          @update:modelValue="country = $event"
        />
        <BaseSelect
          label="Card expiry month"
          placeholder="MM"
          name="cc-exp-month"
          autocomplete="cc-exp-month"
          :options="monthOptions"
          :modelValue="cardExpiryMonth"
          @update:modelValue="cardExpiryMonth = $event"
        />
      </form>
    `,
  }),
};

export const WithStartExtension: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      const modelValue = ref('');
      return { modelValue, options: FRUIT_OPTIONS };
    },
    template: `
      <BaseSelect
        label="Fruit"
        placeholder="Pick a fruit…"
        :options="options"
        :modelValue="modelValue"
        @update:modelValue="modelValue = $event"
        style="max-width: 320px"
      >
        <template #start>
          <span style="margin-inline-start: 10px;">🍎</span>
        </template>
      </BaseSelect>
    `,
  }),
};
