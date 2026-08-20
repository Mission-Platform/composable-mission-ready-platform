import { h } from '@mission-platform/forge';

import { ForgeThemeToggle } from '@mission-platform/theme';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeThemeToggle` is the write-once `ForgeThemeToggle` component of `@mission-platform/theme`. Clicking it cycles the active theme through
 * `light → dark → auto`, driving the shared observable theme store which pins
 * `data-theme`/`color-scheme` on the document root and persists the preference.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Theme/ForgeThemeToggle',
  component: ForgeThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeThemeToggle` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It cycles `light → dark → auto`, backed by the shared observable theme store, and fires `onChange` with the new theme. The label is overridable through the default slot.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    ariaLabel: { control: 'text' },
  },
  args: {},
  render: (arguments_) => <ForgeThemeToggle {...arguments_} />,
} satisfies Meta<typeof ForgeThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LightTheme: Story = {
  globals: { theme: 'light' },
};

export const DarkTheme: Story = {
  globals: { theme: 'dark' },
};

export const CustomLabel: Story = {
  render: (arguments_) => <ForgeThemeToggle {...arguments_}>Theme</ForgeThemeToggle>,
};
