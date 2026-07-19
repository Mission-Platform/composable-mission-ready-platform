import { ThemeComposer } from '@mission-platform/components/react';
import { useState } from 'react';

import type { ThemeComposerConfig } from './base-theme-composer';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ThemeComposer` is the **React** build of the write-once `BaseThemeComposer`
 * in `@mission-platform/components`. It composes runtime `--mp-*` design-token
 * overrides and applies them to its scope (or the document when `global`), is
 * controlled via `modelValue` + `onUpdateModelValue` (the substitute for
 * `v-model`), and exposes `{ config, cssVariables, styleString, setConfig,
 * setAttribute, setToken, removeToken, reset }` to its default scoped slot (a
 * render-prop child). Authored once in the neutral JSX dialect and compiled
 * straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Theme/BaseThemeComposer',
  component: ThemeComposer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ThemeComposer` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It resolves a composed config into `--mp-*` custom properties applied to its scope (or the document when `global`), is controlled via `modelValue` + `onUpdateModelValue`, and exposes the config + mutators to its default scoped slot.',
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
  render: (arguments_) => {
    const [model, setModel] = useState<ThemeComposerConfig>({ primaryColor: '#7c3aed', radius: '12px' });
    return (
      <ThemeComposer
        {...arguments_}
        modelValue={model}
        onUpdateModelValue={setModel}
      >
        {({ config, setAttribute }) => (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--mp-spacing-3)',
              padding: 'var(--mp-spacing-4)',
              border: '1px solid var(--mp-color-border-default)',
              borderRadius: 'var(--mp-radius-md)',
              background: 'var(--mp-color-bg-surface)',
            }}
          >
            <button
              type="button"
              style={{
                padding: 'var(--mp-spacing-2) var(--mp-spacing-3)',
                borderRadius: 'var(--mp-radius-md)',
                background: 'var(--mp-color-primary-default)',
                color: 'var(--mp-color-text-on-primary, #fff)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Primary button
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--mp-spacing-2)' }}>
              Brand colour
              <input
                type="color"
                value={config.primaryColor}
                onInput={(event) => setAttribute('primaryColor', (event.target as HTMLInputElement).value)}
              />
            </label>
          </div>
        )}
      </ThemeComposer>
    );
  },
} satisfies Meta<typeof ThemeComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
