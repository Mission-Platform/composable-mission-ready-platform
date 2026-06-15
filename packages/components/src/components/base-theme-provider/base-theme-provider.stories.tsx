import BaseButton from '../base-button/base-button.vue';
import BaseSegmentControl from '../base-segment-control/base-segment-control.vue';

import BaseThemeProvider from './base-theme-provider.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'Auto', value: 'auto' },
];

const meta = {
  title: 'Components/Theme/BaseThemeProvider',
  component: BaseThemeProvider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`ThemeProvider` component — configures and shares a reactive theme store (`useTheme`) with descendants, applying `data-theme` to `<html>` and persisting the preference. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    defaultTheme: { control: 'inline-radio', options: ['light', 'dark', 'auto'] },
    storageKey: { control: 'text' },
    persist: { control: 'boolean' },
  },
  args: {
    defaultTheme: 'auto',
    storageKey: 'mp-theme',
    persist: true,
  },
  render: (arguments_) => ({
    components: { BaseThemeProvider, BaseSegmentControl, BaseButton },
    setup() {
      return { args: arguments_, themeOptions: THEME_OPTIONS };
    },
    template: `
      <BaseThemeProvider v-bind="args">
        <template #default="{ theme, resolvedTheme, setTheme, toggleTheme }">
          <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
            <BaseSegmentControl
              :options="themeOptions"
              :model-value="theme"
              aria-label="Theme"
              @update:model-value="(value) => setTheme(value)"
            />
            <p style="margin: 0;">Preference: <strong>{{ theme }}</strong> · Resolved: <strong>{{ resolvedTheme }}</strong></p>
            <BaseButton variant="secondary" @click="toggleTheme">Toggle light / dark</BaseButton>
          </div>
        </template>
      </BaseThemeProvider>
    `,
  }),
} satisfies Meta<typeof BaseThemeProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DefaultDark: Story = { args: { defaultTheme: 'dark' } };

export const WithoutPersistence: Story = { args: { persist: false } };
