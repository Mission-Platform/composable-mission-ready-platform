import { ThemeProvider, ThemeToggle } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ThemeProvider` is the Vue 3 build of the write-once `BaseThemeProvider` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`; the very same source also
 * ships as a React component via the package's `./react` subpath.
 *
 * It configures the shared observable theme store (the substitute for the
 * original Vue `provide`/`inject`) from its props and exposes the live theme
 * state and mutators to its default scoped slot, so a `ThemeToggle` (or any
 * other consumer) placed inside it shares the same theme.
 */
const meta = {
  title: 'Components/Theme/BaseThemeProvider',
  component: ThemeProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ThemeProvider` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It configures the shared theme store and exposes `{ theme, resolvedTheme, systemTheme, setTheme, toggleTheme, cycleTheme }` to its default scoped slot. The original `provide`/`inject` is substituted by the shared singleton store.',
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
  render: (arguments_) => ({
    components: { ThemeProvider },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <ThemeProvider v-bind="args">
        <template #default="{ theme, resolvedTheme, setTheme }">
          <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-3); padding: var(--mp-spacing-4); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-surface); color: var(--mp-color-text-primary);">
            <p>Preference: <strong>{{ theme }}</strong> · Resolved: <strong>{{ resolvedTheme }}</strong></p>
            <div style="display: flex; gap: var(--mp-spacing-2);">
              <button type="button" @click="setTheme('light')">Light</button>
              <button type="button" @click="setTheme('dark')">Dark</button>
              <button type="button" @click="setTheme('auto')">Auto</button>
            </div>
          </div>
        </template>
      </ThemeProvider>
    `,
  }),
} satisfies Meta<typeof ThemeProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A `ThemeToggle` nested inside the provider drives the same shared store, so the
 * provider's exposed `theme` updates in lock-step with the toggle.
 */
export const WithToggle: Story = {
  render: (arguments_) => ({
    components: { ThemeProvider, ThemeToggle },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <ThemeProvider v-bind="args">
        <template #default="{ theme }">
          <div style="display: flex; align-items: center; gap: var(--mp-spacing-3);">
            <ThemeToggle />
            <span>Active preference: <strong>{{ theme }}</strong></span>
          </div>
        </template>
      </ThemeProvider>
    `,
  }),
};
