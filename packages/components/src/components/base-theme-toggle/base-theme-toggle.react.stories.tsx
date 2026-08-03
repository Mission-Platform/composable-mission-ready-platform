import { ThemeToggle } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ThemeToggle` is the **React** build of the write-once `BaseThemeToggle` in
 * `@mission-platform/components`. Clicking it cycles the active theme through
 * `light → dark → auto`, driving the shared observable theme store which pins
 * `data-theme`/`color-scheme` on the document root and persists the preference.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Theme/BaseThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ThemeToggle` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It cycles `light → dark → auto`, backed by the shared observable theme store, and fires `onChange` with the new theme. The label is overridable through the default slot.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    ariaLabel: { control: 'text' },
  },
  args: {},
  render: (arguments_) => <ThemeToggle {...arguments_} />,
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
  render: (arguments_) => <ThemeToggle {...arguments_}>Theme</ThemeToggle>,
};
