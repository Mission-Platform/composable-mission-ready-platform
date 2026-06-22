import prettierConfig from 'eslint-config-prettier/flat';
import turboConfig from 'eslint-config-turbo/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import pluginI18next from 'eslint-plugin-i18next';
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
  // ── import/default on Vue SFCs ────────────────────────────────────────────
  // `eslint-plugin-import`'s `import/default` rule (DeepSource shortcode
  // JS-W1028) cannot resolve the implicit default export that a Vue
  // `<script setup>` SFC compiles to, so importing a `.vue` component as a
  // default import is wrongly flagged as "No default export found". This repo
  // lints imports via `eslint-plugin-import-x`, not the upstream plugin, so the
  // rule is not part of our active rule set; we register the plugin here purely
  // to switch the rule off. DeepSource honours rules explicitly disabled in the
  // ESLint config, which silences the false positives at the source.
  {
    name: 'mission-platform/import-default-off',
    plugins: { import: importX },
    rules: { 'import/default': 'off' },
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
  // ── i18next ─────────────────────────────────────────────────────────────────
  // Register `eslint-plugin-i18next` so the platform's i18next usage is linted
  // with a single, shared plugin. The `no-literal-string` rule is intentionally
  // disabled by default: the platform has many legitimate non-user-facing
  // literals, so flagging every string repo-wide would be noise. Registering
  // the plugin with the rule explicitly off keeps the rule available for opt-in
  // per workspace and lets tools (e.g. DeepSource) honour the explicit setting.
  {
    name: 'mission-platform/i18next',
    files: ['**/*.vue', '**/*.ts', '**/*.tsx'],
    plugins: { i18next: pluginI18next },
    rules: {
      'i18next/no-literal-string': 'off',
    },
  },
  // ── turbo ─────────────────────────────────────────────────────────────────
  // Flag usage of environment variables that have not been declared in
  // `turbo.json` (`globalEnv` / per-task `env`), which would otherwise silently
  // break Turborepo's cache hashing.
  ...turboConfig.map((cfg) => ({ ...cfg, name: cfg?.name ?? 'mission-platform/turbo' })),
  // ── prettier ──────────────────────────────────────────────────────────────
  // Must come last: disables all ESLint rules that conflict with Prettier so
  // ESLint never reformats code in ways Prettier would undo. Prettier remains
  // the single source of truth for formatting.
  { ...prettierConfig, name: 'mission-platform/prettier' },
];

export default config;
