import { ref } from 'vue';

import { RadioGroup } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `RadioGroup` is the Vue 3 build of the write-once `BaseRadioGroup` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseRadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `RadioGroup` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The radios are driven from the `options` array (flattening the SFC slot composition, like `BaseTabs`); the selected value is controlled via `modelValue` and the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-radio-group.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    direction: { control: 'select', options: ['vertical', 'horizontal'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    legendHidden: { control: 'boolean' },
  },
  args: {
    legend: 'Favourite fruit',
    options: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
    ],
    direction: 'vertical',
    size: 'md',
    disabled: false,
    required: false,
    legendHidden: false,
  },
  render: (arguments_) => ({
    components: { RadioGroup },
    setup() {
      const value = ref(arguments_.modelValue ?? 'apple');
      return { args: arguments_, value };
    },
    template: '<RadioGroup v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Horizontal: Story = { args: { direction: 'horizontal' } };

export const Required: Story = { args: { required: true } };

export const WithHint: Story = { args: { hint: 'Pick the one you like best.' } };

export const WithError: Story = { args: { error: 'You must choose a fruit.' } };

export const Disabled: Story = { args: { disabled: true } };
