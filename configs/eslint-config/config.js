import pluginVueI18n from '@intlify/eslint-plugin-vue-i18n';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import unicorn from 'eslint-plugin-unicorn';
import pluginVue from 'eslint-plugin-vue';
import vueA11y from 'eslint-plugin-vuejs-accessibility';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

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
    ignores: ['**/dist/**', '**/node_modules/**', '**/storybook-static/**', '**/.storybook/storybook-static/**'],
  },
  {
    name: 'mission-platform/typescript',
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
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
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
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
      'vue/define-macros-order': ['error', { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] }],
      'vue/html-self-closing': ['error', { html: { void: 'always', normal: 'always', component: 'always' } }],
      // Disabled: conflicts with Prettier's htmlWhitespaceSensitivity: 'ignore' setting, which
      // collapses short single-line elements. Prettier is the source of truth for formatting.
      'vue/singleline-html-element-content-newline': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
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
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
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
      // Allow both explicit `for`/`id` association and implicit nesting (label wrapping input).
      // Dynamic `:for` / `:id` bindings are valid in this codebase's component patterns.
      'vuejs-accessibility/label-has-for': [
        'error',
        {
          required: {
            some: ['nesting', 'id'],
          },
        },
      ],
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
  // All i18n strings live in SFC-local <i18n> blocks — there are no external
  // locale JSON/YAML files. Apply only the rules that are relevant to .vue
  // and .ts/.tsx files; skip the jsonc/yaml sub-parser entries from
  // flat/recommended to avoid "Unexpected token '<'" parse errors.
  {
    name: 'mission-platform/vue-i18n',
    files: ['**/*.vue', '**/*.ts', '**/*.tsx'],
    plugins: { '@intlify/vue-i18n': pluginVueI18n },
    settings: {
      'vue-i18n': { messageSyntaxVersion: '^9.0.0' },
    },
    rules: {
      '@intlify/vue-i18n/no-raw-text': 'off',
      '@intlify/vue-i18n/no-missing-keys': 'off',
    },
  },
];

export default config;
