import babelParser from '@babel/eslint-parser';
import prettierConfig from 'eslint-config-prettier/flat';
import turboConfig from 'eslint-config-turbo/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import pluginI18next from 'eslint-plugin-i18next';
import importX from 'eslint-plugin-import-x';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import pluginVue from 'eslint-plugin-vue';
import vueA11y from 'eslint-plugin-vuejs-accessibility';
import vueParser from 'vue-eslint-parser';

const typeScriptParserOptions = {
  requireConfigFile: false,
  babelOptions: {
    babelrc: false,
    configFile: false,
    parserOpts: {
      plugins: ['typescript'],
    },
  },
};

const typeScriptJsxParserOptions = {
  ...typeScriptParserOptions,
  babelOptions: {
    ...typeScriptParserOptions.babelOptions,
    parserOpts: {
      plugins: ['typescript', 'jsx'],
    },
  },
};

/**
 * Check whether an AST node is exported directly or via an ancestor declaration.
 */
function isNodeExported(node) {
  let current = node?.parent;
  while (current) {
    if (current.type === 'ExportNamedDeclaration' || current.type === 'ExportDefaultDeclaration') {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Check whether all import specifiers in a declaration are inline type imports.
 */
function shouldConvertToTypeImport(node) {
  if (node.importKind === 'type') {
    return false;
  }
  const specifiers = Array.isArray(node.specifiers) ? node.specifiers : [];
  if (specifiers.length === 0) {
    return false;
  }
  return specifiers.every((specifier) => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type');
}

/**
 * Check whether a type annotation node represents an `as const` assertion.
 */
function isConstAssertion(typeAnnotation) {
  return typeAnnotation?.type === 'TSTypeReference' && typeAnnotation.typeName?.name === 'const';
}

const BOUNDARY_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'ArrowFunctionExpression',
  'FunctionExpression',
  'MethodDefinition',
  'VariableDeclaration',
  'ClassDeclaration',
]);

const FUNCTION_NODE_TYPES = new Set([
  'FunctionDeclaration',
  'ArrowFunctionExpression',
  'FunctionExpression',
  'MethodDefinition',
]);

/**
 * Check whether an AST node is a supported function declaration or expression.
 */
function isFunctionNode(node) {
  return Boolean(node && FUNCTION_NODE_TYPES.has(node.type));
}

/**
 * Find the enclosing TSTypeAnnotation for a nested type node.
 */
function findEnclosingTypeAnnotation(node) {
  let matched;
  for (let current = node?.parent; current; current = current.parent) {
    if (current.type === 'TSTypeAnnotation') {
      matched = current;
      break;
    }
    if (BOUNDARY_NODE_TYPES.has(current.type)) {
      break;
    }
  }
  return matched;
}

/**
 * Check whether a type node is a direct type annotation on an exported function.
 */
function isDirectExportedFunctionAnnotation(node) {
  const parent = node?.parent;
  if (parent?.type !== 'TSTypeAnnotation') {
    return false;
  }
  const functionNode = parent.parent;
  return isFunctionNode(functionNode) && isNodeExported(functionNode);
}

/**
 * Check whether an enclosing annotation is the direct return type of an exported function.
 */
function isDirectFunctionReturn(enclosing) {
  const functionNode = enclosing.parent;
  return isFunctionNode(functionNode) && functionNode.returnType === enclosing && isNodeExported(functionNode);
}

/**
 * Check whether a node is a TSFunctionType returning the specified enclosing annotation.
 */
function isMatchingFunctionType(node, enclosing) {
  return Boolean(node?.type === 'TSFunctionType' && node.returnType === enclosing);
}

/**
 * Check whether an enclosing annotation is a function type return on an exported function.
 */
function isFunctionTypeReturn(enclosing) {
  const tsFunction = enclosing.parent;
  if (!isMatchingFunctionType(tsFunction, enclosing)) {
    return false;
  }
  const annotation = tsFunction.parent;
  if (annotation?.type !== 'TSTypeAnnotation') {
    return false;
  }
  return isDirectFunctionReturn(annotation);
}

/**
 * Check whether a nested type node is part of an exported function return annotation.
 */
function isNestedReturnTypeAnnotation(node) {
  const enclosing = findEnclosingTypeAnnotation(node);
  if (!enclosing) {
    return false;
  }
  return isDirectFunctionReturn(enclosing) || isFunctionTypeReturn(enclosing);
}

/**
 * Check whether a type node is a return or parameter annotation on an exported function.
 */
function isExportedFunctionAnnotation(node) {
  return isDirectExportedFunctionAnnotation(node) || isNestedReturnTypeAnnotation(node);
}

/**
 * Check whether a generic constraint is genuinely restrictive (not open unknown or any).
 */
function isRestrictiveConstraint(constraint) {
  if (!constraint) return false;
  return constraint.type !== 'TSUnknownKeyword' && constraint.type !== 'TSAnyKeyword';
}

const missionTypeScriptPlugin = {
  rules: {
    'no-explicit-any': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow the `any` type in TypeScript syntax parsed without the TypeScript compiler API.',
        },
        schema: [],
        messages: {
          unexpectedAny: 'Unexpected any. Specify a more precise type.',
        },
      },
      create(context) {
        return {
          TSAnyKeyword(node) {
            context.report({ node, messageId: 'unexpectedAny' });
          },
        };
      },
    },
    'consistent-type-imports': {
      meta: {
        type: 'suggestion',
        fixable: 'code',
        docs: {
          description:
            'Prefer top-level `import type` declarations over inline `type` specifiers in TS7 syntax-only lint mode.',
        },
        schema: [
          {
            type: 'object',
            properties: {
              prefer: { enum: ['type-imports'] },
            },
            additionalProperties: true,
          },
        ],
        messages: {
          preferTopLevelTypeImport: 'Prefer a top-level `import type` declaration instead of inline `type` specifiers.',
        },
      },
      create(context) {
        return {
          ImportDeclaration(node) {
            if (!shouldConvertToTypeImport(node)) {
              return;
            }
            const specifiers = Array.isArray(node.specifiers) ? node.specifiers : [];
            context.report({
              node,
              messageId: 'preferTopLevelTypeImport',
              fix(fixer) {
                const sourceCode = context.sourceCode;
                const specifierText = specifiers
                  .map((specifier) => sourceCode.getText(specifier).replace(/^type\s+/u, ''))
                  .join(', ');
                return fixer.replaceText(
                  node,
                  `import type { ${specifierText} } from ${sourceCode.getText(node.source)};`,
                );
              },
            });
          },
        };
      },
    },
    'prefer-satisfies': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Prefer `satisfies` operator over type assertion `as` to preserve narrow literal types.',
        },
        schema: [],
        messages: {
          preferSatisfies:
            'Prefer "satisfies" over type assertion "as" to validate type conformance without widening literals or masking errors.',
          noAsAny: 'Unexpected "as any" type assertion. Prohibit "any" and use concrete types or "satisfies".',
        },
      },
      create(context) {
        /**
         * Validate a type assertion node for prefer-satisfies and no-as-any rules.
         */
        function validateAssertion(node) {
          if (node.typeAnnotation?.type === 'TSAnyKeyword') {
            context.report({ node, messageId: 'noAsAny' });
            return;
          }
          if (!isConstAssertion(node.typeAnnotation)) {
            context.report({ node, messageId: 'preferSatisfies' });
          }
        }

        return {
          TSAsExpression(node) {
            validateAssertion(node);
          },
          TSTypeAssertion(node) {
            validateAssertion(node);
          },
        };
      },
    },
    'no-unconstrained-generics': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Require generic type parameters to specify an `extends` constraint.',
        },
        schema: [],
        messages: {
          unconstrainedGeneric: 'Type parameter "{{name}}" must have an "extends" constraint to restrict open types.',
        },
      },
      create(context) {
        return {
          TSTypeParameter(node) {
            if (!isRestrictiveConstraint(node.constraint)) {
              const parameterName = typeof node.name === 'string' ? node.name : (node.name?.name ?? 'T');
              context.report({
                node,
                messageId: 'unconstrainedGeneric',
                data: {
                  name: parameterName,
                },
              });
            }
          },
        };
      },
    },
    'no-implicit-unknown': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow returning or leaking unvalidated `unknown` across exported functions and types.',
        },
        schema: [],
        messages: {
          noImplicitUnknown:
            'Avoid exposing unvalidated "unknown" across exported API boundaries. Parse or validate into concrete types.',
        },
      },
      create(context) {
        return {
          TSUnknownKeyword(node) {
            if (isExportedFunctionAnnotation(node)) {
              context.report({ node, messageId: 'noImplicitUnknown' });
            }
          },
        };
      },
    },
  },
};

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
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/coverage/**',
      '**/storybook-static/**',
      '**/.storybook/storybook-static/**',
    ],
  },
  {
    name: 'mission-platform/dependency-direction',
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './packages/**', from: './apps/**' },
            { target: './configs/**', from: './apps/**' },
            { target: './vite-plugins/**', from: './apps/**' },
            { target: './workers/**', from: './apps/**' },
          ],
        },
      ],
    },
  },
  {
    name: 'mission-platform/typescript',
    files: ['**/*.ts', '**/*.mts'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ...typeScriptParserOptions,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': missionTypeScriptPlugin,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/prefer-satisfies': 'warn',
      '@typescript-eslint/no-unconstrained-generics': 'warn',
      '@typescript-eslint/no-implicit-unknown': 'warn',
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
    name: 'mission-platform/typescript-jsx',
    files: ['**/*.tsx'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ...typeScriptJsxParserOptions,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': missionTypeScriptPlugin,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/prefer-satisfies': 'warn',
      '@typescript-eslint/no-unconstrained-generics': 'warn',
      '@typescript-eslint/no-implicit-unknown': 'warn',
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
        parser: babelParser,
        ...typeScriptJsxParserOptions,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': missionTypeScriptPlugin,
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      'vue/multi-word-component-names': 'error',
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': ['error', { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] }],
      'vue/html-self-closing': ['error', { html: { void: 'always', normal: 'always', component: 'always' } }],
      // Disabled: conflicts with Prettier's htmlWhitespaceSensitivity: 'ignore' setting, which
      // collapses short single-line elements. Prettier is the source of truth for formatting.
      'vue/singleline-html-element-content-newline': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/prefer-satisfies': 'warn',
      '@typescript-eslint/no-unconstrained-generics': 'warn',
      '@typescript-eslint/no-implicit-unknown': 'warn',
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
  // conflict with the vue-eslint-parser / syntax-only TS7 setup.
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
  // ── sonarjs ───────────────────────────────────────────────────────────────
  // Enable sonarjs recommended rules across the monorepo, disabling rules that
  // conflict with TypeScript/ESLint/Prettier rules or produce noise in UI/CLI code.
  {
    ...sonarjs.configs.recommended,
    name: 'mission-platform/sonarjs',
    rules: {
      ...sonarjs.configs.recommended.rules,
      // Handled by the shared TypeScript compatibility rules / ESLint core
      'sonarjs/no-unused-vars': 'off',
      // Allow nested ternaries and template literals (common in JSX / Vue templates)
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      // Allow TODO comments and commented code
      'sonarjs/todo-tag': 'off',
      'sonarjs/no-commented-code': 'off',
      // Allow standard JS idioms (Array.sort, String.match, inline union types, OS commands in scripts)
      'sonarjs/no-alphabetical-sort': 'off',
      'sonarjs/use-type-alias': 'off',
      'sonarjs/no-os-command-from-path': 'off',
      'sonarjs/prefer-regexp-exec': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-duplicate-in-composite': 'off',
      'sonarjs/different-types-comparison': 'off',
      // Heuristic type-inference rule with frequent false positives on generic
      // calls and `Array#includes`/`Set#has` with union types (e.g. narrowed
      // `string | number | boolean`). TypeScript's own type-checker (type-check)
      // already covers genuine argument-type mismatches.
      'sonarjs/argument-type': 'off',
      // Same heuristic family as `argument-type`: false-positives on `key in x`
      // where `x` is a union of object types, and it fights TypeScript's own
      // control-flow narrowing (the safe narrowing form is what TS understands).
      'sonarjs/in-operator-type-error': 'off',
      'sonarjs/function-return-type': 'off',
      'sonarjs/prefer-read-only-props': 'off',
      'sonarjs/no-globals-shadowing': 'off',
      'sonarjs/super-linear-regex': 'off',
      'sonarjs/no-nested-assignment': 'off',
      'sonarjs/no-small-switch': 'off',
      'sonarjs/no-undefined-argument': 'off',
      'sonarjs/parameterized-tests': 'off',
      'sonarjs/prefer-specific-assertions': 'off',
      'sonarjs/publicly-writable-directories': 'off',
      'sonarjs/redundant-type-aliases': 'off',
      'sonarjs/updated-loop-counter': 'off',
      'sonarjs/void-use': 'off',
      'sonarjs/deprecation': 'off',
      'sonarjs/no-dead-store': 'off',
      'sonarjs/no-selector-parameter': 'off',
      'sonarjs/no-all-duplicated-branches': 'off',
      'sonarjs/no-duplicated-branches': 'off',
      'sonarjs/no-async-constructor': 'off',
      'sonarjs/no-clear-text-protocols': 'off',
      'sonarjs/no-hardcoded-ip': 'off',
      'sonarjs/no-invariant-returns': 'off',
      'sonarjs/no-inverted-boolean-check': 'off',
      'sonarjs/no-redundant-jump': 'off',
      'sonarjs/no-redundant-optional': 'off',
      'sonarjs/post-message': 'off',
      'sonarjs/no-nested-functions': 'off',
      'sonarjs/concise-regex': 'off',
    },
  },
  // ── DeepSource analyzer overrides ──────────────────────────────────────────
  // DeepSource JavaScript analyzer honors rules explicitly disabled in the
  // ESLint configuration. Compilers, parsers, and AST visitors in this monorepo
  // have high cyclomatic complexity (JS-R1005) by design, and internal helper
  // functions do not require redundant JSDocs (JS-D1001). Switching them off here
  // ensures analyzer alignment with the repository conventions without modifying
  // .deepsource.toml.
  {
    name: 'mission-platform/deepsource-analyzer-overrides',
    rules: {
      complexity: 'off',
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
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

export { default as pluginI18next } from 'eslint-plugin-i18next';
export { default as sonarjs } from 'eslint-plugin-sonarjs';
export default config;
