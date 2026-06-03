import pluginVueI18n from '@intlify/eslint-plugin-vue-i18n'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importX from 'eslint-plugin-import-x'
import unicorn from 'eslint-plugin-unicorn'
import pluginVue from 'eslint-plugin-vue'
import vueA11y from 'eslint-plugin-vuejs-accessibility'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

/**
 * Base ESLint flat config for all Mission Platform packages and apps.
 *
 * Usage in eslint.config.js:
 *   import baseConfig from '@mission-platform/eslint-config'
 *   export default [...baseConfig]
 */
const config = [
  {
    name: 'mission-platform/ignores',
    ignores: ['**/dist/**', '**/node_modules/**', '**/.storybook/storybook-static/**'],
  },
  {
    name: 'mission-platform/typescript',
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/first': 'error',
      'import-x/no-useless-path-segments': ['error', { noUselessIndex: true }],
    },
  },
  ...pluginVue.configs['flat/recommended'].map((cfg) => ({
    ...cfg,
    files: ['**/*.vue'],
  })),
  {
    name: 'mission-platform/vue',
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'vue/multi-word-component-names': 'error',
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': [
        'error',
        { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/first': 'error',
      'import-x/no-useless-path-segments': ['error', { noUselessIndex: true }],
    },
  },
  {
    name: 'mission-platform/js',
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    plugins: {
      'import-x': importX,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/first': 'error',
      'import-x/no-useless-path-segments': ['error', { noUselessIndex: true }],
    },
  },
  // ── vuejs-accessibility ───────────────────────────────────────────────────
  // Register the plugin and apply the recommended a11y rules to Vue files,
  // without overriding the parser already configured above.
  {
    name: 'mission-platform/vue-a11y',
    files: ['**/*.vue'],
    plugins: {
      'vuejs-accessibility': vueA11y,
    },
    rules: {
      ...vueA11y.configs['flat/recommended'][1].rules,
    },
  },
  // ── unicorn ───────────────────────────────────────────────────────────────
  // Apply unicorn to TypeScript and JavaScript files only.
  // Vue SFCs are excluded because unicorn rules that require type information
  // conflict with the vue-eslint-parser / project-service setup.
  {
    ...unicorn.configs['flat/recommended'],
    name: 'mission-platform/unicorn',
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.js', '**/*.mjs', '**/*.cjs'],
  },
  // ── vue-i18n ───────────────────────────────────────────────────────────────
  // Spread the recommended flat config, then add settings pointing at YAML
  // locale files so the plugin can resolve keys for no-missing-keys etc.
  ...pluginVueI18n.configs['flat/recommended'].map((cfg) => {
    // Configs that set vue-eslint-parser must only apply to .vue files;
    // applying them to .ts/.tsx files overrides @typescript-eslint/parser
    // and breaks rules that require type information (e.g. consistent-type-imports).
    const parserName =
      cfg.languageOptions?.parser?.meta?.name || cfg.languageOptions?.parser?.name || ''
    const files = parserName.includes('vue-eslint-parser')
      ? ['**/*.vue']
      : ['**/*.ts', '**/*.tsx', '**/*.vue']
    return {
      ...cfg,
      files,
      settings: {
        ...cfg.settings,
        'vue-i18n': {
          localeDir: './src/locales/*.{yaml,yml}',
          messageSyntaxVersion: '^9.0.0',
        },
      },
    }
  }),
]

export default config
