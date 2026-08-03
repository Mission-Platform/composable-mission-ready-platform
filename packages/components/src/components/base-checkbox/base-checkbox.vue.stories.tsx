import { ref } from 'vue';

import { Checkbox } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Checkbox` is the Vue 3 build of the write-once `BaseCheckbox` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseCheckbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Checkbox` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The checked state is controlled via `modelValue`; the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. The check/indeterminate SVGs are substituted with a CSS-coloured `✓`/`−` glyph. Styling comes from the co-located `base-checkbox.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    labelHidden: { control: 'boolean' },
  },
  args: {
    label: 'Accept terms and conditions',
    size: 'md',
    disabled: false,
    required: false,
    indeterminate: false,
    labelHidden: false,
  },
  render: (arguments_) => ({
    components: { Checkbox },
    setup() {
      const value = ref(Boolean(arguments_.modelValue));
      return { args: arguments_, value };
    },
    template: '<Checkbox v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { modelValue: true } };

export const Required: Story = { args: { required: true } };

export const Indeterminate: Story = { args: { indeterminate: true } };

export const WithHint: Story = { args: { hint: 'You can change this later in settings.' } };

export const WithError: Story = { args: { error: 'You must accept to continue.' } };

export const Disabled: Story = { args: { disabled: true } };
