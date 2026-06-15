import BaseButton from '../base-button/base-button.vue';
import BaseCard from '../base-card/base-card.vue';

import BaseThemeComposer from './base-theme-composer.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Theme/BaseThemeComposer',
  component: BaseThemeComposer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`ThemeComposer` component — composes theme attributes (brand/accent colours, text/surface/border/focus colours, font families, base font size, and corner radius) plus arbitrary raw `--mp-*` token overrides into CSS custom properties. It scopes the result to its own wrapper element (default) or applies it globally to `<html>`, shares the reactive configuration with descendants via `useThemeComposer`, and supports `v-model`. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    global: { control: 'boolean' },
    persist: { control: 'boolean' },
    storageKey: { control: 'text' },
    as: { control: 'text' },
  },
  args: {
    global: false,
    persist: false,
    storageKey: 'mp-theme-composer',
    as: 'div',
  },
  render: (arguments_) => ({
    components: { BaseThemeComposer, BaseButton, BaseCard },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseThemeComposer v-bind="args" :model-value="{ primaryColor: '#0ea5e9', radius: '1rem' }">
        <template #default="{ config, setAttribute, reset }">
          <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 24rem;">
            <label style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
              Primary colour
              <input
                type="color"
                :value="config.primaryColor"
                @input="(event) => setAttribute('primaryColor', event.target.value)"
              />
            </label>
            <label style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
              Corner radius
              <input
                type="range"
                min="0"
                max="24"
                :value="parseInt(config.radius ?? '0', 10)"
                @input="(event) => setAttribute('radius', event.target.value + 'px')"
              />
            </label>
            <BaseCard>
              <p style="margin: 0 0 0.75rem;">Live preview</p>
              <BaseButton variant="primary">Primary button</BaseButton>
            </BaseCard>
            <BaseButton variant="secondary" @click="reset">Reset</BaseButton>
          </div>
        </template>
      </BaseThemeComposer>
    `,
  }),
} satisfies Meta<typeof BaseThemeComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const PresetBrand: Story = {
  render: () => ({
    components: { BaseThemeComposer, BaseButton, BaseCard },
    setup() {
      const config = { primaryColor: '#db2777', primaryHoverColor: '#be185d', radius: '0.75rem', fontFamily: 'Georgia, serif' };
      return { config };
    },
    template: `
      <BaseThemeComposer :model-value="config">
        <BaseCard>
          <p style="margin: 0 0 0.75rem;">Scoped pink brand theme</p>
          <BaseButton variant="primary">Primary</BaseButton>
        </BaseCard>
      </BaseThemeComposer>
    `,
  }),
};

export const RawTokenOverrides: Story = {
  render: () => ({
    components: { BaseThemeComposer, BaseButton },
    setup() {
      const config = { tokens: { 'radius-md': '9999px', '--mp-color-primary-default': '#16a34a' } };
      return { config };
    },
    template: `
      <BaseThemeComposer :model-value="config">
        <BaseButton variant="primary">Pill button via raw tokens</BaseButton>
      </BaseThemeComposer>
    `,
  }),
};
