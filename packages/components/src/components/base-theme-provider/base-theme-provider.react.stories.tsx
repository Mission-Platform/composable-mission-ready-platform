import { ThemeProvider, ThemeToggle } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ThemeProvider` is the **React** build of the write-once `BaseThemeProvider` in
 * `@mission-platform/components`. It configures the shared observable theme store
 * from its props and exposes the live theme state and mutators to its default
 * scoped slot (a render-prop child), so a `ThemeToggle` (or any other consumer)
 * placed inside it shares the same theme. Authored once in the neutral JSX
 * dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Theme/BaseThemeProvider',
  component: ThemeProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ThemeProvider` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It configures the shared theme store and exposes `{ theme, resolvedTheme, systemTheme, setTheme, toggleTheme, cycleTheme }` to its default scoped slot.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    defaultTheme: { control: 'select', options: ['light', 'dark', 'auto'] },
    storageKey: { control: 'text' },
    persist: { control: 'boolean' },
  },
  args: {
    defaultTheme: 'auto',
    persist: false,
  },
  render: (arguments_) => (
    <ThemeProvider {...arguments_}>
      {({ theme, resolvedTheme, setTheme }) => (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--mp-spacing-3)',
            padding: 'var(--mp-spacing-4)',
            border: '1px solid var(--mp-color-border-default)',
            borderRadius: 'var(--mp-radius-md)',
            background: 'var(--mp-color-bg-surface)',
            color: 'var(--mp-color-text-primary)',
          }}
        >
          <p>
            Preference: <strong>{theme}</strong> · Resolved: <strong>{resolvedTheme}</strong>
          </p>
          <div style={{ display: 'flex', gap: 'var(--mp-spacing-2)' }}>
            <button
              type="button"
              onClick={() => setTheme('light')}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('auto')}
            >
              Auto
            </button>
          </div>
        </div>
      )}
    </ThemeProvider>
  ),
} satisfies Meta<typeof ThemeProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A `ThemeToggle` nested inside the provider drives the same shared store, so the
 * provider's exposed `theme` updates in lock-step with the toggle.
 */
export const WithToggle: Story = {
  render: (arguments_) => (
    <ThemeProvider {...arguments_}>
      {({ theme }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mp-spacing-3)' }}>
          <ThemeToggle />
          <span>
            Active preference: <strong>{theme}</strong>
          </span>
        </div>
      )}
    </ThemeProvider>
  ),
};
