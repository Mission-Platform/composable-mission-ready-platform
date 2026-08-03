import { ref } from 'vue';

import { Radio } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Radio` is the Vue 3 build of the write-once `BaseRadio` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseRadio',
  component: Radio,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Radio` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A radio is selected when its `value` equals the group `modelValue`; the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-radio.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    labelHidden: { control: 'boolean' },
  },
  args: {
    label: 'Option A',
    value: 'a',
    size: 'md',
    disabled: false,
    labelHidden: false,
  },
  render: (arguments_) => ({
    components: { Radio },
    setup() {
      const value = ref(arguments_.modelValue ?? 'a');
      return { args: arguments_, value };
    },
    template: '<Radio v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: 'a' } };

export const Disabled: Story = { args: { disabled: true } };

export const Group: Story = {
  render: () => ({
    components: { Radio },
    setup() {
      const selected = ref('email');
      return { selected };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <Radio :model-value="selected" value="email" label="Email" @update-model-value="selected = $event" />
        <Radio :model-value="selected" value="sms" label="SMS" @update-model-value="selected = $event" />
        <Radio :model-value="selected" value="push" label="Push notification" @update-model-value="selected = $event" />
      </div>
    `,
  }),
};
