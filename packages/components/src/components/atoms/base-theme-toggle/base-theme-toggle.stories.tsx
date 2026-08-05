import { h } from '@mission-platform/forge';

import { ThemeToggle } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ThemeToggle` is the write-once `BaseThemeToggle` component of `@mission-platform/components`. Clicking it cycles the active theme through
 * `light → dark → auto`, driving the shared observable theme store which pins
 * `data-theme`/`color-scheme` on the document root and persists the preference.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Theme/BaseThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ThemeToggle` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It cycles `light → dark → auto`, backed by the shared observable theme store, and fires `onChange` with the new theme. The label is overridable through the default slot.',
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
