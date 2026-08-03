import { ref } from 'vue';

import { Input } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Input` is the Vue 3 build of the write-once `BaseInput` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseInput',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Input` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The value is controlled via `modelValue`; the original `start`/`prefix`/`suffix`/`end` named slots become `MpChild` content props and the `v-model` + `change`/`blur`/`focus` emits become the `onUpdateModelValue`/`onChange`/`onBlur`/`onFocus` callback props. Styling comes from the co-located `base-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search', 'url'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Full name',
    placeholder: 'Ada Lovelace',
    type: 'text',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { Input },
    setup() {
      const value = ref(arguments_.modelValue ?? '');
      return { args: arguments_, value };
    },
    template: '<Input v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { modelValue: 'Ada Lovelace' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'As it appears on your passport.' } };

export const WithError: Story = { args: { error: 'This field is required.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: 'Locked value' } };

export const WithDatalist: Story = {
  args: { label: 'Favourite fruit', list: ['Apple', 'Banana', 'Cherry', 'Date'], placeholder: 'Start typing…' },
};
