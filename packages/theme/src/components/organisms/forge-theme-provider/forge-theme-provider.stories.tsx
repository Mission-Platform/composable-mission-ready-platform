import { h } from '@mission-platform/forge';

import { ForgeThemeProvider, ForgeThemeToggle } from '@mission-platform/theme';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeThemeProvider` is the write-once `ForgeThemeProvider` component of `@mission-platform/theme`. It configures the shared observable theme store
 * from its props and exposes the live theme state and mutators to its default
 * scoped slot (a render-prop child), so a `ForgeThemeToggle` (or any other consumer)
 * placed inside it shares the same theme.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Theme/ForgeThemeProvider',
  component: ForgeThemeProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeThemeProvider` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It configures the shared theme store and exposes `{ theme, resolvedTheme, systemTheme, setTheme, toggleTheme, cycleTheme }` to its default scoped slot.',
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
    <ForgeThemeProvider {...arguments_}>
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
    </ForgeThemeProvider>
  ),
} satisfies Meta<typeof ForgeThemeProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A `ForgeThemeToggle` nested inside the provider drives the same shared store, so the
 * provider's exposed `theme` updates in lock-step with the toggle.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
export const WithToggle: Story = {
  render: (arguments_) => (
    <ForgeThemeProvider {...arguments_}>
      {({ theme }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mp-spacing-3)' }}>
          <ForgeThemeToggle />
          <span>
            Active preference: <strong>{theme}</strong>
          </span>
        </div>
      )}
    </ForgeThemeProvider>
  ),
};
