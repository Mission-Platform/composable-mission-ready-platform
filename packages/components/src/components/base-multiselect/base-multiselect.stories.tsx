import { ref } from 'vue';

import BaseMultiselect from './base-multiselect.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const FRUIT_OPTIONS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Durian (disabled)', value: 'durian', disabled: true },
  { label: 'Elderberry', value: 'elderberry' },
  { label: 'Fig', value: 'fig' },
];

const meta = {
  title: 'Components/Forms/BaseMultiselect',
  component: BaseMultiselect,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseMultiselect` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
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
    modelValue: [],
    size: 'md',
    label: 'Fruits',
    placeholder: 'Pick fruits…',
    options: FRUIT_OPTIONS,
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { BaseMultiselect },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseMultiselect v-bind="args" style="max-width: 400px" />',
  }),
} satisfies Meta<typeof BaseMultiselect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPreselected: Story = {
  args: { modelValue: ['apple', 'cherry'] },
};

export const WithHint: Story = { args: { hint: 'Choose all your favourite fruits.' } };

export const WithError: Story = { args: { error: 'Please select at least one fruit.' } };

export const Required: Story = { args: { required: true } };

export const Disabled: Story = { args: { disabled: true, modelValue: ['apple', 'banana'] } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const NoLabel: Story = { args: { label: undefined } };

export const WithNativeAutocomplete: Story = {
  parameters: {
    docs: {
      description: {
        story: [
          'The combobox is backed by a visually-hidden native `<select multiple>` that carries the',
          '`name` and `autocomplete` attributes, so browsers and profile managers can autofill the',
          'field and submit its values in a native `<form>`. Autofill updates `v-model` just like',
          'picking options from the dropdown.',
        ].join(' '),
      },
    },
  },
  render: (arguments_) => ({
    components: { BaseMultiselect },
    setup() {
      const value = ref<(string | number)[]>(arguments_.modelValue ?? []);
      return { args: arguments_, value, options: FRUIT_OPTIONS };
    },
    template: `
      <form style="max-width: 400px">
        <BaseMultiselect
          v-bind="args"
          name="fruits"
          autocomplete="off"
          :options="options"
          :modelValue="value"
          @update:modelValue="value = $event"
        />
      </form>
    `,
  }),
};

export const AutocompleteExamples: Story = {
  parameters: {
    docs: {
      description: {
        story: [
          'Multi-select fields inside a native `<form>`, each backed by the hidden',
          '`<select multiple>`. Use a `name` together with a standard `autocomplete` token',
          'where one applies (e.g. `language` for spoken languages), or `autocomplete="off"`',
          'for bespoke lists the browser should not try to autofill. Selections are submitted',
          'natively and autofill updates `v-model` like picking options from the dropdown.',
        ].join(' '),
      },
    },
  },
  render: () => ({
    components: { BaseMultiselect },
    setup() {
      const languages = ref<(string | number)[]>([]);
      const skills = ref<(string | number)[]>([]);

      const languageOptions = [
        { label: 'English', value: 'en' },
        { label: 'French', value: 'fr' },
        { label: 'Spanish', value: 'es' },
        { label: 'German', value: 'de' },
        { label: 'Mandarin', value: 'zh' },
      ];
      const skillOptions = [
        { label: 'Vue', value: 'vue' },
        { label: 'TypeScript', value: 'ts' },
        { label: 'CSS', value: 'css' },
        { label: 'Accessibility', value: 'a11y' },
        { label: 'Testing', value: 'testing' },
      ];

      return { languages, skills, languageOptions, skillOptions };
    },
    template: `
      <form style="display: grid; gap: 16px; max-width: 400px">
        <BaseMultiselect
          label="Spoken languages"
          placeholder="Select languages…"
          name="language"
          autocomplete="language"
          :options="languageOptions"
          :modelValue="languages"
          @update:modelValue="languages = $event"
        />
        <BaseMultiselect
          label="Skills"
          placeholder="Select skills…"
          name="skills"
          autocomplete="off"
          :options="skillOptions"
          :modelValue="skills"
          @update:modelValue="skills = $event"
        />
      </form>
    `,
  }),
};

export const WithStartAndEndExtensions: Story = {
  render: () => ({
    components: { BaseMultiselect },
    setup() {
      const value = ref<(string | number)[]>(['apple']);
      return { value, options: FRUIT_OPTIONS };
    },
    template: `
      <BaseMultiselect
        label="Fruits"
        placeholder="Pick fruits…"
        :options="options"
        :modelValue="value"
        @update:modelValue="value = $event"
        style="max-width: 400px"
      >
        <template #start>
          <span>🥇</span>
        </template>
        <template #end>
          <span style="font-size: var(--mp-font-size-sm);">{{ value.length }}</span>
        </template>
      </BaseMultiselect>
    `,
  }),
};
