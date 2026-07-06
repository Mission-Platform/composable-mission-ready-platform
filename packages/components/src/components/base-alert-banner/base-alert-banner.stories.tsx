import { ref } from 'vue';

import { AlertBanner } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `AlertBanner` is the Vue 3 build of the write-once `BaseAlertBanner` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Feedback/BaseAlertBanner',
  component: AlertBanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `AlertBanner` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders an intent-toned notification with an optional title, status glyph, dismiss button, and an `actions` slot. The original `v-model`/`dismiss` emit becomes the controlled `modelValue` + `onUpdateModelValue`/`onDismiss` callbacks, and the `icon`/`actions` slots are the `iconContent`/`actions` named slots. Styling comes from the co-located `base-alert-banner.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    title: { control: 'text' },
    dismissible: { control: 'boolean' },
    icon: { control: 'boolean' },
  },
  args: {
    variant: 'info',
    title: 'Heads up',
    dismissible: false,
    icon: true,
  },
  render: (arguments_) => ({
    components: { AlertBanner },
    setup() {
      const value = ref(arguments_.modelValue ?? true);
      return { args: arguments_, value };
    },
    template: `<AlertBanner v-bind="args" :model-value="value" @update-model-value="value = $event">Your changes have been saved.</AlertBanner>`,
  }),
} satisfies Meta<typeof AlertBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = { args: { variant: 'success', title: 'Success' } };

export const Warning: Story = { args: { variant: 'warning', title: 'Warning' } };

export const Error: Story = { args: { variant: 'error', title: 'Something went wrong' } };

export const Critical: Story = { args: { variant: 'critical', title: 'Critical' } };

export const Neutral: Story = { args: { variant: 'neutral', title: 'Note' } };

export const Dismissible: Story = {
  args: { dismissible: true },
  render: (arguments_) => ({
    components: { AlertBanner },
    setup() {
      const value = ref(arguments_.modelValue ?? true);
      return { args: arguments_, value };
    },
    template: `<AlertBanner v-bind="args" :model-value="value" @update-model-value="value = $event">This banner can be dismissed.</AlertBanner>`,
  }),
};

export const WithActions: Story = {
  args: { title: 'Update available' },
  render: (arguments_) => ({
    components: { AlertBanner },
    setup() {
      const value = ref(arguments_.modelValue ?? true);
      return { args: arguments_, value };
    },
    template: `<AlertBanner v-bind="args" :model-value="value" @update-model-value="value = $event">A new version is ready.<template #actions>Update now</template></AlertBanner>`,
  }),
};
