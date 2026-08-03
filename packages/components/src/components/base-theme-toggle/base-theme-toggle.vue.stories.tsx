import { ThemeToggle } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ThemeToggle` is the Vue 3 build of the write-once `BaseThemeToggle` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`; the very same source also
 * ships as a React component via the package's `./react` subpath.
 *
 * Clicking it cycles the active theme through `light → dark → auto`, driving the
 * shared observable theme store (the substitute for the original Vue
 * `provide`/`inject`) which pins `data-theme`/`color-scheme` on the document
 * root and persists the preference.
 */
const meta = {
  title: 'Components/Theme/BaseThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ThemeToggle` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It cycles `light → dark → auto`, backed by the shared observable theme store, and fires `onChange` with the new theme. The label is overridable through the default slot.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    ariaLabel: { control: 'text' },
  },
  args: {},
  render: (arguments_) => ({
    components: { ThemeToggle },
    setup() {
      return { args: arguments_ };
    },
    template: '<ThemeToggle v-bind="args" />',
  }),
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
  render: (arguments_) => ({
    components: { ThemeToggle },
    setup() {
      return { args: arguments_ };
    },
    template: '<ThemeToggle v-bind="args">Theme</ThemeToggle>',
  }),
};
