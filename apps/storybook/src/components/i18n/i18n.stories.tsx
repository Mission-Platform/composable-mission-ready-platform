import { createMpI18n, useI18n } from '@mission-platform/i18n';
import { defineComponent, ref } from 'vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * A small component that renders every key from the active locale so we can
 * visually inspect what is registered in the i18n instance.
 */
const LocaleInspector = defineComponent({
  name: 'LocaleInspector',
  setup() {
    const { t, locale, availableLocales, getLocaleMessage } = useI18n({ useScope: 'global' });

    const selectedLocale = ref(locale.value);

    function switchLocale(code: string) {
      locale.value = code;
      selectedLocale.value = code;
    }

    return () => {
      const msgs = getLocaleMessage(selectedLocale.value) as Record<string, string>;

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
                <th style="padding: 6px 12px; text-align: left; border: 1px solid #ddd;">t(key) → value</th>
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
      );
    };
  },
});

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'Utilities/I18n',
  parameters: {
    docs: {
      description: {
        component: `
# Mission Platform i18n

The \`@mission-platform/i18n\` package provides Vue 3 i18n integration following
the **SFC-local** pattern: every component owns its strings inside an
\`<i18n>\` block, so no external locale files or compile steps are needed.

| Export | Purpose |
|---|---|
| \`createMpI18n\` | Create a configured \`vue-i18n\` instance |
| \`useI18n\` | Re-exported from \`vue-i18n\` for single-import convenience |

## Pattern: SFC-local strings

Each component declares its own translations inline using \`useScope: 'local'\`:

\`\`\`vue
<script setup lang="ts">
import { useI18n } from '@mission-platform/i18n'

const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <button :aria-label="t('close')">×</button>
</template>

<i18n lang="json">
{
  "en": { "close": "Close" },
  "fr": { "close": "Fermer" }
}
</i18n>
\`\`\`

## Pattern: global instance

Apps create a single global instance and install it via \`app.use()\`:

\`\`\`ts
// main.ts
import { createMpI18n } from '@mission-platform/i18n'

app.use(createMpI18n({ locale: 'en' }))
\`\`\`

The global instance is used by \`useI18n({ useScope: 'global' })\`.
SFC-local scopes automatically inherit from the global instance, so
locale switching propagates to every component.
        `,
      },
    },
  },
};

export default meta;

// ─── Stories ─────────────────────────────────────────────────────────────────

/**
 * The default setup: Storybook's global i18n instance (set up in `preview.ts`)
 * is already configured, so the inspector below reads from that shared instance.
 * Individual components provide their own strings via SFC-local `<i18n>` blocks.
 */
export const DefaultSetup: StoryObj = {
  name: 'Global instance (SFC-local components)',
  render: () => ({
    components: { LocaleInspector },
    template: '<LocaleInspector />',
  }),
};

/**
 * Demonstrates creating a standalone `createMpI18n` instance and passing
 * custom global messages inline — no external locale files required.
 */
export const CustomMessages: StoryObj = {
  name: 'createMpI18n — custom global messages',
  render: () => ({
    setup() {
      const i18n = createMpI18n({
        locale: 'en',
        messages: {
          en: { greeting: 'Hello', farewell: 'Goodbye' },
          fr: { greeting: 'Bonjour', farewell: 'Au revoir' },
        },
      });

      const { t, locale } = i18n.global as unknown as ReturnType<typeof useI18n>;
      const currentLocale = ref((locale as unknown as { value: string }).value);

      return { t, locale, currentLocale };
    },
    template: `
      <div style="font-family: monospace; font-size: 13px; line-height: 1.8;">
        <div style="margin-bottom: 12px; display: flex; gap: 8px;">
          <button
            v-for="code in ['en', 'fr']"
            :key="code"
            @click="locale = code; currentLocale = code"
            :style="'padding: 4px 12px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer; background: ' + (code === currentLocale ? '#1a73e8' : '#fff') + '; color: ' + (code === currentLocale ? '#fff' : '#333') + ';'"
          >{{ code }}</button>
        </div>
        <p><strong>greeting:</strong> {{ t('greeting') }}</p>
        <p><strong>farewell:</strong> {{ t('farewell') }}</p>
      </div>
    `,
  }),
};
