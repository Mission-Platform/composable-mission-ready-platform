import { ref } from 'vue';

import { Textarea } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Textarea` is the Vue 3 build of the write-once `BaseTextarea` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseTextarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Textarea` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The value is controlled via `modelValue`; the original `start`/`end` named slots become `MpChild` content props and the `v-model` + `change`/`blur`/`focus` emits become the `onUpdateModelValue`/`onChange`/`onBlur`/`onFocus` callback props. Styling comes from the co-located `base-textarea.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    resize: { control: 'inline-radio', options: ['none', 'vertical', 'horizontal', 'both'] },
    rows: { control: { type: 'number', min: 1, max: 20 } },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Biography',
    placeholder: 'Tell us about yourself…',
    rows: 4,
    size: 'md',
    resize: 'vertical',
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { Textarea },
    setup() {
      const value = ref(arguments_.modelValue ?? '');
      return { args: arguments_, value };
    },
    template: '<Textarea v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { modelValue: 'Ada Lovelace was an English mathematician.' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Markdown is supported.' } };

export const WithError: Story = { args: { error: 'Please enter at least 20 characters.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: 'Locked content' } };
