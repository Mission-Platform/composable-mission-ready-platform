import { ref } from 'vue';

import { ThemeComposer } from '@mission-platform/components/vue';

import type { ThemeComposerConfig } from './base-theme-composer';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ThemeComposer` is the Vue 3 build of the write-once `BaseThemeComposer` in
 * this package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`; the very same source also
 * ships as a React component via the package's `./react` subpath.
 *
 * It composes runtime `--mp-*` design-token overrides and applies them to its
 * scope. The original Vue `v-model` is substituted by the controlled
 * `modelValue` + `onUpdateModelValue` callback pair; its default scoped slot
 * exposes the current config and mutators.
 */
const meta = {
  title: 'Components/Theme/BaseThemeComposer',
  component: ThemeComposer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ThemeComposer` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It resolves a composed config into `--mp-*` custom properties applied to its scope (or the document when `global`), is controlled via `modelValue` + `onUpdateModelValue` (the substitute for `v-model`), and exposes `{ config, cssVariables, styleString, setConfig, setAttribute, setToken, removeToken, reset }` to its default scoped slot.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    global: { control: 'boolean' },
  },
  args: {
    global: false,
  },
  render: (arguments_) => ({
    components: { ThemeComposer },
    setup() {
      const model = ref<ThemeComposerConfig>({ primaryColor: '#7c3aed', radius: '12px' });
      const onUpdate = (next: ThemeComposerConfig): void => {
        model.value = next;
      };
      return { args: arguments_, model, onUpdate };
    },
    template: `
      <ThemeComposer v-bind="args" :model-value="model" :on-update-model-value="onUpdate">
        <template #default="{ config, setAttribute }">
          <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-3); padding: var(--mp-spacing-4); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); background: var(--mp-color-bg-surface);">
            <button
              type="button"
              style="padding: var(--mp-spacing-2) var(--mp-spacing-3); border-radius: var(--mp-radius-md); background: var(--mp-color-primary-default); color: var(--mp-color-text-on-primary, #fff); border: none; cursor: pointer;"
            >
              Primary button
            </button>
            <label style="display: flex; align-items: center; gap: var(--mp-spacing-2);">
              Brand colour
              <input
                type="color"
                :value="config.primaryColor"
                @input="(event) => setAttribute('primaryColor', event.target.value)"
              />
            </label>
          </div>
        </template>
      </ThemeComposer>
    `,
  }),
} satisfies Meta<typeof ThemeComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
