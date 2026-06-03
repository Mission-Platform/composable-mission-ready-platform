import { locales as uiLocales } from '@mission-platform/components/locales'
import { createMpI18n, defineLocales, mergeLocales } from '@mission-platform/i18n'
import { locales as baseLocales } from '@mission-platform/i18n/locales'
import { defineComponent, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * A small component that renders every key from the active locale so we can
 * visually inspect what is registered in the i18n instance.
 */
const LocaleInspector = defineComponent({
  name: 'LocaleInspector',
  setup() {
    const { t, locale, availableLocales, getLocaleMessage } = useI18n({ useScope: 'global' })

    const selectedLocale = ref(locale.value)

    function switchLocale(code: string) {
      locale.value = code
      selectedLocale.value = code
    }

    return () => {
      const msgs = getLocaleMessage(selectedLocale.value) as Record<string, string>

      return (
        <div style="font-family: monospace; font-size: 13px; line-height: 1.8;">
          <div style="margin-bottom: 12px; display: flex; gap: 8px;">
            {availableLocales.map((code: string) => (
              <button
                key={code}
                onClick={() => switchLocale(code)}
                style={`padding: 4px 12px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer; background: ${code === selectedLocale.value ? '#1a73e8' : '#fff'}; color: ${code === selectedLocale.value ? '#fff' : '#333'};`}
              >
                {code}
              </button>
            ))}
          </div>

          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 6px 12px; text-align: left; border: 1px solid #ddd;">Key</th>
                <th style="padding: 6px 12px; text-align: left; border: 1px solid #ddd;">
                  t(key) → value
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(msgs).map((key) => (
                <tr key={key}>
                  <td style="padding: 6px 12px; border: 1px solid #ddd; color: #555;">{key}</td>
                  <td style="padding: 6px 12px; border: 1px solid #ddd;">{t(key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  },
})

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'Utilities/I18n',
  parameters: {
    docs: {
      description: {
        component: `
# Mission Platform i18n

The \`@mission-platform/i18n\` package provides three composable utilities for
building a multi-package i18n system in Vue 3:

| Export | Purpose |
|---|---|
| \`createMpI18n\` | Create a configured \`vue-i18n\` instance, merging all locale modules |
| \`mergeLocales\` | Standalone deep-merge of \`MpLocaleModule[]\` into one messages map |
| \`defineLocales\` | Identity helper — types a locale object as \`MpLocaleModule\` |

## Pattern: each package owns its strings

\`\`\`ts
// packages/my-package/src/locales/index.ts
import { defineLocales } from '@mission-platform/i18n'

export const locales = defineLocales({
  en: { greeting: 'Hello' },
  fr: { greeting: 'Bonjour' },
})
\`\`\`

Export the subpath in \`package.json\`:

\`\`\`json
{
  "exports": {
    "./locales": { "import": "./dist/locales.js", "types": "./dist/locales/index.d.ts" }
  }
}
\`\`\`

## Pattern: app merges everything

\`\`\`ts
// main.ts  (or .storybook/preview.ts)
import { createMpI18n } from '@mission-platform/i18n'
import { locales as baseLocales }  from '@mission-platform/i18n/locales'
import { locales as uiLocales }    from '@mission-platform/components/locales'
import { locales as mapLocales }   from '@mission-platform/map/locales'

app.use(createMpI18n({
  locale: 'en',
  modules: [baseLocales, uiLocales, mapLocales],
}))
\`\`\`

## Pattern: manual merge before \`createI18n\`

\`\`\`ts
import { mergeLocales } from '@mission-platform/i18n'
import { createI18n } from 'vue-i18n'

const messages = mergeLocales([baseLocales, uiLocales, { fr: { close: 'Quitter' } }])
const i18n = createI18n({ legacy: false, locale: 'en', messages })
\`\`\`
        `,
      },
    },
  },
}

export default meta

// ─── Stories ─────────────────────────────────────────────────────────────────

/**
 * The default setup: base strings + UI component strings registered via
 * \`createMpI18n({ modules: [baseLocales, uiLocales] })\`.
 *
 * Storybook's global i18n instance (set up in \`preview.ts\`) is already
 * configured this way, so the inspector below reads from that shared instance.
 */
export const DefaultSetup: StoryObj = {
  name: 'Default setup (base + UI components)',
  render: () => ({
    components: { LocaleInspector },
    template: '<LocaleInspector />',
  }),
}

/**
 * Demonstrates \`mergeLocales\` used standalone — outside of \`createMpI18n\`.
 * The result object is displayed as JSON so you can inspect the merged shape.
 */
export const MergeLocalesUtility: StoryObj = {
  name: 'mergeLocales — standalone merge',
  render: () => ({
    setup() {
      const packageA = defineLocales({ en: { hello: 'Hello', goodbye: 'Goodbye' } })
      const packageB = defineLocales({ en: { hello: 'Hi' }, fr: { hello: 'Bonjour' } })
      const appOverride = { fr: { hello: 'Salut' } }

      const merged = mergeLocales([packageA, packageB, appOverride])

      return { merged }
    },
    template: `
      <div style="font-family: monospace; font-size: 13px; line-height: 1.8;">
        <p style="margin-bottom: 8px; font-weight: bold;">mergeLocales([pkgA, pkgB, appOverride])</p>
        <pre style="background: #f5f5f5; padding: 16px; border-radius: 6px; overflow: auto;">{{ JSON.stringify(merged, null, 2) }}</pre>
        <p style="color: #555; margin-top: 8px; font-size: 12px;">
          pkgA.en.hello = "Hello" is overridden by pkgB.en.hello = "Hi".<br>
          pkgB.fr.hello = "Bonjour" is overridden by appOverride.fr.hello = "Salut".
        </p>
      </div>
    `,
  }),
}

/**
 * Demonstrates \`defineLocales\` — the typed identity helper that packages use
 * to declare their own locale modules without an explicit type annotation.
 */
export const DefineLocalesUtility: StoryObj = {
  name: 'defineLocales — typed locale module helper',
  render: () => ({
    setup() {
      const myLocales = defineLocales({
        en: { greeting: 'Hello from my-package', farewell: 'Goodbye' },
        fr: { greeting: 'Bonjour depuis my-package', farewell: 'Au revoir' },
      })

      const i18n = createMpI18n({ modules: [baseLocales, uiLocales, myLocales] })

      return { module: myLocales, locale: (i18n.global.locale as unknown as Ref<string>).value }
    },
    template: `
      <div style="font-family: monospace; font-size: 13px; line-height: 1.8;">
        <p style="margin-bottom: 8px; font-weight: bold;">defineLocales({ en: { … }, fr: { … } })</p>
        <pre style="background: #f5f5f5; padding: 16px; border-radius: 6px; overflow: auto;">{{ JSON.stringify(module, null, 2) }}</pre>
        <p style="color: #555; margin-top: 8px; font-size: 12px;">
          Returns the same object typed as <code>MpLocaleModule</code>.  Pass it straight to
          <code>createMpI18n({ modules: […, myLocales] })</code>.
        </p>
      </div>
    `,
  }),
}
