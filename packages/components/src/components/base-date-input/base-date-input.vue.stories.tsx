import { ref } from 'vue';

import { DateInput } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `DateInput` is the Vue 3 build of the write-once `BaseDateInput` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Forms/BaseDateInput',
  component: DateInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `DateInput` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A trigger opens a teleported, CSS-anchor-positioned popover composing the migrated `Calendar` (replacing `@floating-ui` + `useZIndex`); the ISO date is controlled via `modelValue`, and the `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-date-input.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Date',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (arguments_) => ({
    components: { DateInput },
    setup() {
      const value = ref(arguments_.modelValue ?? '');
      return { args: arguments_, value };
    },
    template: '<DateInput v-bind="args" :model-value="value" @update-model-value="value = $event" />',
  }),
} satisfies Meta<typeof DateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { modelValue: '2026-01-15' } };

export const WithHint: Story = { args: { hint: 'Choose any future date.' } };

export const WithError: Story = { args: { error: 'A date is required.' } };

export const Disabled: Story = { args: { disabled: true, modelValue: '2026-01-15' } };
