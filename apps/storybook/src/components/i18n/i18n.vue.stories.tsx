import { LanguageSwitcher } from '@mission-platform/components/vue';
import { createMpI18n } from '@mission-platform/i18n';
import { useI18n } from '@mission-platform/i18n/vue';
import { defineComponent, ref } from 'vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * A small component that renders a handful of keys from the globally-installed
 * i18next instance (set up in `preview.ts`) so we can visually inspect what is
 * registered and how the reactive `useI18n` composable behaves.
 */
const LocaleInspector = defineComponent({
  name: 'LocaleInspector',
  setup() {
    const { t, locale } = useI18n();

    const keys: { label: string; defaultValue: string; selector: ($: any) => any }[] = [
      { label: 'title', defaultValue: 'Map Draw Toolbar', selector: (s) => s.title },
      { label: 'draw.line', defaultValue: 'Line', selector: (s) => s.draw.line },
      { label: 'draw.polygon', defaultValue: 'Polygon', selector: (s) => s.draw.polygon },
      { label: 'status.selected', defaultValue: 'Selected: {id}', selector: (s) => s.status.selected },
      { label: 'tooltip.split', defaultValue: 'Split line at midpoint', selector: (s) => s.tooltip.split },
    ];

    return () => (
      <div style="font-family: monospace; font-size: 13px; line-height: 1.8;">
        <p>
          <strong>Active locale:</strong> {locale.value}
        </p>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 6px 12px; text-align: left; border: 1px solid #ddd;">Key</th>
              <th style="padding: 6px 12px; text-align: left; border: 1px solid #ddd;">t(key) → value</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.label}>
                <td style="padding: 6px 12px; border: 1px solid #ddd; color: #555;">{k.label}</td>
                <td style="padding: 6px 12px; border: 1px solid #ddd;">
                  {t(($) => k.selector($), {
                    ns: 'mp.storybook',
                    defaultValue: k.defaultValue,
                    id: 'feature-1',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
});

/**
 * Demonstrates a standalone `createMpI18n` instance with inline messages for
 * multiple locales — used directly (no Vue plugin) to translate and switch
 * locales on the fly.
 */
const CustomMessages = defineComponent({
  name: 'CustomMessages',
  setup() {
    const i18n = createMpI18n({
      locale: 'en',
      messages: {
        en: { greeting: 'Hello {name}', farewell: 'Goodbye' },
        fr: { greeting: 'Bonjour {name}', farewell: 'Au revoir' },
      },
    });

    // i18next is framework-neutral, so bump a ref to re-render on locale change.
    const tick = ref(0);
    const current = ref(i18n.language);
    async function switchLocale(code: string) {
      await i18n.changeLanguage(code);
      current.value = code;
      tick.value += 1;
    }

    return () => (
      <div
        key={tick.value}
        style="font-family: monospace; font-size: 13px; line-height: 1.8;"
      >
        <div style="margin-bottom: 12px; display: flex; gap: 8px;">
          {['en', 'fr'].map((code) => (
            <button
              key={code}
              onClick={() => switchLocale(code)}
              style={`padding: 4px 12px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer; background: ${code === current.value ? '#1a73e8' : '#fff'}; color: ${code === current.value ? '#fff' : '#333'};`}
            >
              {code}
            </button>
          ))}
        </div>
        <p>
          <strong>greeting:</strong>{' '}
          {i18n.t(($: any) => $.greeting, {
            defaultValue: 'Hello World',
            name: 'World',
          })}
        </p>
        <p>
          <strong>farewell:</strong>{' '}
          {i18n.t(($: any) => $.farewell, {
            defaultValue: 'Goodbye',
          })}
        </p>
      </div>
    );
  },
});

const LanguageSwitcherExample = defineComponent({
  name: 'LanguageSwitcherExample',
  setup() {
    const locale = ref('en');
    return () => (
      <LanguageSwitcher
        locale={locale.value}
        locales={[
          { code: 'en', label: 'English' },
          { code: 'fr', label: 'Français' },
          { code: 'es', label: 'Español' },
        ]}
        labelHidden={false}
        onLocaleChange={(nextLocale) => {
          locale.value = nextLocale;
        }}
      />
    );
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

The \`@mission-platform/i18n\` package wraps [i18next](https://www.i18next.com/)
in a framework-agnostic core plus thin per-framework adapters.

| Export | Purpose |
|---|---|
| \`@mission-platform/i18n\` → \`createMpI18n\` | Build a configured, framework-neutral i18next instance |
| \`@mission-platform/i18n/vue\` → \`createMpI18nVue\` / \`useI18n\` | Vue 3 plugin + composable (\`i18next-vue\`) |
| \`@mission-platform/i18n/react\` → \`MpI18nProvider\` / \`useI18n\` | React provider + hook (\`react-i18next\`) |

## Pattern: app-wide instance

Apps build one instance and install it via \`app.use()\`:

\`\`\`ts
// main.ts
import { createMpI18n } from '@mission-platform/i18n'
import { createMpI18nVue } from '@mission-platform/i18n/vue'

app.use(createMpI18nVue(createMpI18n({ messages: { en } })))
\`\`\`

\`\`\`vue
<script setup lang="ts">
import { useI18n } from '@mission-platform/i18n/vue'
const { t, locale, setLocale } = useI18n()
</script>
\`\`\`

Interpolation uses single-brace delimiters (\`{name}\`), and nested
(\`nav.notes\`) and array-indexed (\`items.0.title\`) keys resolve out of the box.

## Namespaces: \`mp.<workspace>\`

Strings are grouped into i18next namespaces. Every package lives under
\`mp.<package_name>\` and every app under \`mp.<app_name>\` (build one with the
\`mpNamespace\` helper). An app sets its own namespace as the default; it falls
back to every package namespace, so component code keeps resolving the keys it
owns. Package components resolve their own namespace explicitly:

\`\`\`vue
<script setup lang="ts">
import { mpNamespace, useI18n } from '@mission-platform/i18n/vue'
// Bind \`t\` to this package's namespace.
const { t } = useI18n(mpNamespace('breakpoints'))
</script>
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
 * The default setup: Storybook's global i18next instance (set up in
 * `preview.ts`) is already configured, so the inspector below reads from that
 * shared instance via the `useI18n` composable.
 */
export const DefaultSetup: StoryObj = {
  name: 'Global instance (useI18n)',
  render: () => ({
    components: { LocaleInspector },
    template: '<LocaleInspector />',
  }),
};

/**
 * Demonstrates creating a standalone `createMpI18n` instance with inline
 * messages for several locales — no external locale files required.
 */
export const CustomMessagesStory: StoryObj = {
  name: 'createMpI18n — custom messages',
  render: () => ({
    components: { CustomMessages },
    template: '<CustomMessages />',
  }),
};

export const LanguageSwitcherStory: StoryObj = {
  name: 'Language switcher',
  render: () => ({
    components: { LanguageSwitcherExample },
    template: '<LanguageSwitcherExample />',
  }),
};
