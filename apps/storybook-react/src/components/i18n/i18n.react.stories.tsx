import { createMpI18n } from '@mission-platform/i18n';
import { MpI18nProvider, useI18n } from '@mission-platform/i18n/react';
import { useState } from 'react';

import type { CSSProperties, ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mono: CSSProperties = { fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 };

/**
 * A small component that renders a handful of keys from an i18next instance
 * provided by `MpI18nProvider`, so we can visually inspect what is registered
 * and how the reactive `useI18n` hook behaves.
 */
function LocaleInspector(): ReactElement {
  const { t, locale } = useI18n();
  const keys = ['title', 'draw.line', 'draw.polygon', 'status.selected', 'tooltip.split'];
  return (
    <div style={mono}>
      <p>
        <strong>Active locale:</strong> {locale}
      </p>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '6px 12px', textAlign: 'left', border: '1px solid #ddd' }}>Key</th>
            <th style={{ padding: '6px 12px', textAlign: 'left', border: '1px solid #ddd' }}>t(key) → value</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key}>
              <td style={{ padding: '6px 12px', border: '1px solid #ddd', color: '#555' }}>{key}</td>
              <td style={{ padding: '6px 12px', border: '1px solid #ddd' }}>{t(key, { id: 'feature-1' })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A standalone instance seeding the inspector keys (the React storybook has no
// global i18n instance, so the demo provides its own via `MpI18nProvider`).
const inspectorI18n = createMpI18n({
  locale: 'en',
  messages: {
    en: {
      title: 'Mission Platform',
      draw: { line: 'Draw line', polygon: 'Draw polygon' },
      status: { selected: '{id} selected' },
      tooltip: { split: 'Split feature' },
    },
  },
});

/**
 * Demonstrates a standalone `createMpI18n` instance with inline messages for
 * multiple locales — used directly (no provider) to translate and switch
 * locales on the fly.
 */
function CustomMessages(): ReactElement {
  const [i18n] = useState(() =>
    createMpI18n({
      locale: 'en',
      messages: {
        en: { greeting: 'Hello {name}', farewell: 'Goodbye' },
        fr: { greeting: 'Bonjour {name}', farewell: 'Au revoir' },
      },
    }),
  );

  const [current, setCurrent] = useState(i18n.language);
  async function switchLocale(code: string): Promise<void> {
    await i18n.changeLanguage(code);
    setCurrent(code);
  }

  return (
    <div style={mono}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        {['en', 'fr'].map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => void switchLocale(code)}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid #ccc',
              cursor: 'pointer',
              background: code === current ? '#1a73e8' : '#fff',
              color: code === current ? '#fff' : '#333',
            }}
          >
            {code}
          </button>
        ))}
      </div>
      <p>
        <strong>greeting:</strong> {i18n.t('greeting', { name: 'World' })}
      </p>
      <p>
        <strong>farewell:</strong> {i18n.t('farewell')}
      </p>
    </div>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'Utilities/I18n',
  parameters: {
    docs: {
      description: {
        component: `
# Mission Platform i18n

The \`@mission-platform/i18n\` package wraps [i18next](https://www.i18next.com/)
in a framework-agnostic core plus thin per-framework adapters.

| Export | Purpose |
|---|---|
| \`@mission-platform/i18n\` → \`createMpI18n\` | Build a configured, framework-neutral i18next instance |
| \`@mission-platform/i18n/vue\` → \`createMpI18nVue\` / \`useI18n\` | Vue 3 plugin + composable (\`i18next-vue\`) |
| \`@mission-platform/i18n/react\` → \`MpI18nProvider\` / \`useI18n\` | React provider + hook (\`react-i18next\`) |

## Pattern: app-wide instance

Apps build one instance and provide it at the root:

\`\`\`tsx
// main.tsx
import { createMpI18n } from '@mission-platform/i18n'
import { MpI18nProvider } from '@mission-platform/i18n/react'

const i18n = createMpI18n({ messages: { en } })
root.render(<MpI18nProvider i18n={i18n}><App /></MpI18nProvider>)
\`\`\`

\`\`\`tsx
import { useI18n } from '@mission-platform/i18n/react'
const { t, locale, setLocale } = useI18n()
\`\`\`

Interpolation uses single-brace delimiters (\`{name}\`), and nested
(\`nav.notes\`) and array-indexed (\`items.0.title\`) keys resolve out of the box.

## Namespaces: \`mp.<workspace>\`

Strings are grouped into i18next namespaces. Every package lives under
\`mp.<package_name>\` and every app under \`mp.<app_name>\` (build one with the
\`mpNamespace\` helper). Package components resolve their own namespace explicitly:

\`\`\`tsx
import { mpNamespace, useI18n } from '@mission-platform/i18n/react'
// Bind \`t\` to this package's namespace.
const { t } = useI18n(mpNamespace('breakpoints'))
\`\`\`

## Overriding a package's strings

Apps can override any package/component strings per namespace via \`overrides\`,
deep-merged on top of the package's own bundle (only the listed keys change):

\`\`\`ts
createMpI18n({
  namespace: mpNamespace('my-care-notes'),
  namespaces: localeNamespaces('en', enBundles),
  overrides: {
    [mpNamespace('breakpoints')]: { en: { breakpoint: 'Viewport:' } },
  },
})
\`\`\`
        `,
      },
    },
  },
};

export default meta;

// ─── Stories ─────────────────────────────────────────────────────────────────

/**
 * An i18next instance provided via `MpI18nProvider`; the inspector below reads
 * from it through the `useI18n` hook.
 */
export const DefaultSetup: StoryObj = {
  name: 'Provided instance (useI18n)',
  render: () => (
    <MpI18nProvider i18n={inspectorI18n}>
      <LocaleInspector />
    </MpI18nProvider>
  ),
};

/**
 * Demonstrates creating a standalone `createMpI18n` instance with inline
 * messages for several locales — no external locale files required.
 */
export const CustomMessagesStory: StoryObj = {
  name: 'createMpI18n — custom messages',
  render: () => <CustomMessages />,
};
