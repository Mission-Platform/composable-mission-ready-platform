import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeThemeComposer } from '@mission-platform/theme';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeThemeComposer` is the write-once `ForgeThemeComposer` component of `@mission-platform/theme`. It composes runtime `--mp-*` design-token
 * overrides and applies them to its scope (or the document when `global`), is
 * controlled via `modelValue` + `onUpdateModelValue` (the substitute for
 * `v-model`), and exposes `{ config, cssVariables, styleString, setConfig,
 * setAttribute, setToken, removeToken, reset }` to its default scoped slot (a
 * render-prop child).
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Theme/ForgeThemeComposer',
  component: ForgeThemeComposer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeThemeComposer` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It resolves a composed config into `--mp-*` custom properties applied to its scope (or the document when `global`), is controlled via `modelValue` + `onUpdateModelValue`, and exposes the config + mutators to its default scoped slot.',
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
    const [{ modelValue: model }, updateArguments] = useArgs();

    return (
      <ForgeThemeComposer
        {...arguments_}
        modelValue={model}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
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
      </ForgeThemeComposer>
    );
  },
} satisfies Meta<typeof ForgeThemeComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
