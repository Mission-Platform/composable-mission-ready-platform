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
    ignores: ['**/dist/**', '**/node_modules/**', '**/.storybook/storybook-static/**'],
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
  // Spread the recommended flat config, then add settings pointing at YAML
  // locale files so the plugin can resolve keys for no-missing-keys etc.
  // Skip entries that target locale JSON/YAML files with a non-vue sub-parser
  // (jsonc-eslint-parser, yaml-eslint-parser) — those entries must not be
  // remapped to **/*.vue because they would override the TypeScript sub-parser
  // that vue-eslint-parser needs, causing "Cannot read properties of undefined
  // (reading 'arguments')" parse errors on every .vue file.
  ...pluginVueI18n.configs['flat/recommended']
    .filter((cfg) => {
      const subParserName =
        cfg.languageOptions?.parserOptions?.parser?.meta?.name ||
        cfg.languageOptions?.parserOptions?.parser?.name ||
        '';
      // Drop locale-file parser configs (jsonc / yaml sub-parsers).
      return (
        !subParserName || subParserName.includes('vue-eslint-parser') || subParserName.includes('typescript-eslint')
      );
    })
    .map((cfg) => {
      // Configs that set vue-eslint-parser must only apply to .vue files;
      // applying them to .ts/.tsx files overrides @typescript-eslint/parser
      // and breaks rules that require type information (e.g. consistent-type-imports).
      const parserName = cfg.languageOptions?.parser?.meta?.name || cfg.languageOptions?.parser?.name || '';
      const files = parserName.includes('vue-eslint-parser') ? ['**/*.vue'] : ['**/*.ts', '**/*.tsx', '**/*.vue'];
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
      };
    }),
  // ── component-library overrides ───────────────────────────────────────────
  // Component packages ship raw UI text intentionally (e.g. 'Done', 'Copy',
  // 'HH', '%'). They are not vue-i18n consumer apps, so the raw-text rule
  // is not applicable and is disabled here.
  {
    name: 'mission-platform/i18n-overrides',
    files: ['**/*.vue', '**/*.ts', '**/*.tsx'],
    rules: {
      '@intlify/vue-i18n/no-raw-text': 'off',
    },
  },
];

export default config;
