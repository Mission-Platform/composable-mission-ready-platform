/**
 * Convention-compliant file templates for scaffolding new workspace members.
 *
 * Each factory returns a map of *relative file path* → *file contents*. The
 * templates mirror the real structure of existing members (e.g. the
 * `breakpoints` package, `forge-spa` worker and `my-care-notes` app) so
 * generated skeletons build and lint like hand-written ones.
 */

export interface PackageScaffoldOptions {
  /** Kebab-case package folder name, e.g. `date-utils`. */
  name: string;
  description: string;
  /** Whether the package ships Vue components (adds stylelint + vue deps). */
  vue: boolean;
}

export interface AppScaffoldOptions {
  name: string;
  description: string;
}

export interface WorkerScaffoldOptions {
  name: string;
  description: string;
}

export interface CrateScaffoldOptions {
  /** Kebab-case crate folder name, e.g. `barcode-encode`. */
  name: string;
  description: string;
}

/** Atomic-design levels accepted by `scaffold_component`. */
export type ScaffoldAtomicLevel = 'atom' | 'molecule' | 'organism' | 'template' | 'page';

export interface ComponentScaffoldOptions {
  /** Kebab-case component folder name, e.g. `forge-input`. */
  name: string;
  /** Atomic level (singular). */
  level: ScaffoldAtomicLevel;
  /**
   * Functional area segment of the Storybook title
   * (`<Level>/<Area>/<Component>`), e.g. `Forms`, `Data`, `Display`.
   */
  area: string;
  description?: string;
}

export interface NamedUnitScaffoldOptions {
  /** Kebab-case unit name, e.g. `use-focus-trap` or `format-date`. */
  name: string;
  description?: string;
}

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Map singular scaffold level → plural folder name (`atom` → `atoms`). */
export function atomicLevelFolder(level: ScaffoldAtomicLevel): string {
  return level === 'page' ? 'pages' : `${level}s`;
}

/** Capitalised plural used in Storybook titles (`Atoms`, `Pages`). */
export function atomicLevelTitle(level: ScaffoldAtomicLevel): string {
  const folder = atomicLevelFolder(level);
  return folder.charAt(0).toUpperCase() + folder.slice(1);
}

/** Normalise a functional-area token to PascalCase (`forms` → `Forms`). */
export function toAreaTitle(area: string): string {
  return area
    .split(/[-_/\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Strip a leading `Forge` from a PascalCase name for `*Properties` types. */
function toPropertiesName(pascal: string): string {
  const stem = pascal.startsWith('Forge') && pascal.length > 5 ? pascal.slice(5) : pascal;
  return `${stem}Properties`;
}

/** Ensure composable folder/function names start with `use-` / `use`. */
export function normalizeComposableName(name: string): string {
  const kebab = name
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/[\s_]+/g, '-')
    .toLowerCase();
  return kebab.startsWith('use-') || kebab === 'use' ? kebab : `use-${kebab}`;
}

const ESLINT_CONFIG = `import baseConfig from '@mission-platform/eslint-config';

export default [...baseConfig];
`;

const PRETTIER_CONFIG = `import baseConfig from '@mission-platform/prettier-config';

export default { ...baseConfig };
`;

const STYLELINT_CONFIG = `import baseConfig from '@mission-platform/stylelint-config';

export default { ...baseConfig };
`;

const PRETTIER_IGNORE = `node_modules
dist
`;

const TURBO_LEAF = `{
  "$schema": "https://turborepo.com/schema.json",
  "extends": ["//"]
}
`;

/** Files for a new `packages/<name>` package. */
export function packageFiles(options: PackageScaffoldOptions): Record<string, string> {
  const { name, description, vue } = options;
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const scoped = `@mission-platform/${name}`;

  const packageJson = {
    name: scoped,
    version: '0.1.0',
    description,
    type: 'module',
    sideEffects: vue ? ['**/*.css', '**/*.scss', '**/*.vue'] : false,
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
    },
    main: './dist/index.js',
    types: './dist/index.d.ts',
    files: ['dist'],
    scripts: {
      'build:check': vue ? 'vue-tsc -b' : 'tsc --project tsconfig.build.json --noEmit',
      'build:bundle': 'vite build',
      'build:types': vue
        ? 'vue-tsc --project tsconfig.build.json --emitDeclarationOnly'
        : 'tsc --project tsconfig.build.json --emitDeclarationOnly',
      'build:watch': 'vite build --watch',
      test: 'vitest run',
      'test:watch': 'vitest',
      'test:coverage': 'vitest run --coverage',
      lint: 'eslint .',
      'lint:fix': 'eslint --fix .',
      ...(vue
        ? {
            'lint:style': 'stylelint "src/**/*.{vue,scss}"',
            'lint:style:fix': 'stylelint --fix "src/**/*.{vue,scss}"',
          }
        : {}),
      format: 'prettier --check .',
      'format:write': 'prettier --write .',
    },
    ...(vue ? { peerDependencies: { vue: '^3.5.0' } } : {}),
    devDependencies: {
      '@mission-platform/eslint-config': 'workspace:*',
      '@mission-platform/prettier-config': 'workspace:*',
      ...(vue ? { '@mission-platform/stylelint-config': 'workspace:*' } : {}),
      '@mission-platform/typescript-config': 'workspace:*',
      '@mission-platform/vite-config': 'workspace:*',
      '@types/node': 'catalog:typescript',
      '@vitest/coverage-v8': 'catalog:testing',
      eslint: 'catalog:eslint',
      ...(vue
        ? {
            jsdom: 'catalog:testing',
            'postcss-html': 'catalog:stylelint',
            'postcss-scss': 'catalog:stylelint',
            'sass-embedded': 'catalog:vite',
            stylelint: 'catalog:stylelint',
            '@vue/test-utils': 'catalog:vue',
          }
        : {}),
      prettier: 'catalog:prettier',
      typescript: 'catalog:typescript',
      vite: 'catalog:vite',
      vitest: 'catalog:testing',
      ...(vue ? { vue: 'catalog:vue', 'vue-tsc': 'catalog:vue' } : {}),
    },
  };

  const includeGlobs = vue
    ? '["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "src/**/*.d.ts"]'
    : '["src/**/*.ts", "src/**/*.d.ts"]';

  const files: Record<string, string> = {
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    'tsconfig.json': `{
  "files": [],
  "references": [
    { "path": "./tsconfig.build.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.test.json" }
  ]
}
`,
    'tsconfig.build.json': `{
  "extends": "@mission-platform/typescript-config/library",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.build.tsbuildinfo",
    "types": ["vite/client"],
    "rootDir": "./src",
    "declarationDir": "./dist",
    "emitDeclarationOnly": true
  },
  "include": ${includeGlobs},
  "exclude": ["src/**/*.stories.ts", "src/**/*.stories.tsx", "src/**/*.spec.ts"]
}
`,
    'tsconfig.node.json': `{
  "extends": "@mission-platform/typescript-config/node",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo"
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
`,
    'tsconfig.test.json': `{
  "extends": "@mission-platform/typescript-config/test",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.test.tsbuildinfo"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "src/**/*.spec.ts"],
  "exclude": ["src/**/*.stories.ts", "src/**/*.stories.tsx"]
}
`,
    'eslint.config.js': ESLINT_CONFIG,
    'prettier.config.js': PRETTIER_CONFIG,
    '.prettierignore': PRETTIER_IGNORE,
    'vite.config.ts': `import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  name: 'MissionPlatform${pascal}',
  fileName: '${name}',
});
`,
    'vitest.config.ts': `import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts'${vue ? ", 'src/**/*.vue'" : ''}],
  coverageExclude: ['src/**/*.stories.*', 'src/index.ts'],
});
`,
    'turbo.json': `{
  "$schema": "https://turborepo.com/schema.json",
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": ["build:check", "build:bundle", "build:types"]
    },
    "build:bundle": {
      "dependsOn": ["^build", "build:check"]
    },
    "build:types": {
      "dependsOn": ["^build", "build:bundle"]
    }
  }
}
`,
    'src/index.ts': `export * from './components/index.ts';
export * from './composables/index.ts';
export * from './locales/index.ts';
export * from './stores/index.ts';
export * from './utils/index.ts';
`,
    'src/components/index.ts': `// Export UI components from here
export {};
`,
    'src/composables/index.ts': `// Export reactive logic and hooks from here (authored against @mission-platform/forge)
export {};
`,
    'src/locales/index.ts': `// Export i18n translations from here
export {};
`,
    'src/stores/index.ts': `// Export framework-neutral stores from here
export {};
`,
    'src/utils/index.ts': `export { ${camel} } from './${name}/${name}';
`,
    [`src/utils/${name}/${name}.ts`]: `/**
 * ${description || `Public API for the ${scoped} package.`}
 */
export function ${camel}(): string {
  return '${name}';
}
`,
    [`src/utils/${name}/${name}.spec.ts`]: `import { describe, expect, it } from 'vitest';

import { ${camel} } from './${name}';

describe('${camel}', () => {
  it('returns the package name', () => {
    expect(${camel}()).toBe('${name}');
  });
});
`,
    'llms.txt': `# ${scoped}

${description}

## Installation

Add it to a consuming workspace member:

\`\`\`json
{
  "dependencies": {
    "${scoped}": "workspace:*"
  }
}
\`\`\`

## Usage

\`\`\`ts
import { ${camel} } from '${scoped}';
\`\`\`
`,
    'docs/index.md': `# ${scoped}

${description}

See \`llms.txt\` for the public API and usage examples.
`,
  };

  if (vue) {
    files['stylelint.config.js'] = STYLELINT_CONFIG;
  }

  return files;
}

/** Files for a new `apps/<name>` Vite + Vue 3 application. */
export function appFiles(options: AppScaffoldOptions): Record<string, string> {
  const { name, description } = options;
  const scoped = `@mission-platform/${name}`;
  const title = toPascalCase(name);

  const packageJson = {
    name: scoped,
    private: true,
    version: '0.0.0',
    description,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vue-tsc -b && vite build',
      preview: 'vite preview',
      test: 'vitest run',
      lint: 'eslint .',
      'lint:fix': 'eslint --fix .',
      'lint:style': 'stylelint "src/**/*.{vue,scss,css}"',
      'lint:style:fix': 'stylelint --fix "src/**/*.{vue,scss,css}"',
      format: 'prettier --check .',
      'format:write': 'prettier --write .',
    },
    dependencies: {
      '@mission-platform/components': 'workspace:*',
      '@mission-platform/tokens': 'workspace:*',
      vue: 'catalog:vue',
    },
    devDependencies: {
      '@mission-platform/eslint-config': 'workspace:*',
      '@mission-platform/prettier-config': 'workspace:*',
      '@mission-platform/stylelint-config': 'workspace:*',
      '@mission-platform/typescript-config': 'workspace:*',
      '@mission-platform/vite-config': 'workspace:*',
      '@types/node': 'catalog:typescript',
      '@vitejs/plugin-vue': 'catalog:vue',
      eslint: 'catalog:eslint',
      prettier: 'catalog:prettier',
      stylelint: 'catalog:stylelint',
      typescript: 'catalog:typescript',
      vite: 'catalog:vite',
      vitest: 'catalog:testing',
      vue: 'catalog:vue',
      'vue-tsc': 'catalog:vue',
    },
  };

  return {
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    'tsconfig.json': `{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
`,
    'tsconfig.app.json': `{
  "extends": "@mission-platform/typescript-config/app",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "env.d.ts"]
}
`,
    'tsconfig.node.json': `{
  "extends": "@mission-platform/typescript-config/node",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo"
  },
  "include": ["vite.config.ts"]
}
`,
    'eslint.config.js': ESLINT_CONFIG,
    'prettier.config.js': PRETTIER_CONFIG,
    'stylelint.config.js': STYLELINT_CONFIG,
    '.prettierignore': PRETTIER_IGNORE,
    'vite.config.ts': `import { defineFrameworkAppConfig } from '@mission-platform/vite-config';

// \`framework\` is the single app-level switch: it sets the \`mp:<framework>\`
// \`resolve.conditions\` so every bare \`@mission-platform/*\` import resolves to
// that framework's build. Pair it with the matching
// \`@mission-platform/typescript-config/tsconfig.framework-<name>.json\` preset.
export default defineFrameworkAppConfig({
  framework: 'vue',
  rootDir: __dirname,
});
`,
    'turbo.json': `{
  "$schema": "https://turborepo.com/schema.json",
  "extends": ["//"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".vite/**"]
    }
  }
}
`,
    'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    'env.d.ts': `/// <reference types="vite/client" />
`,
    'src/main.ts': `import { createApp } from 'vue';

import App from './App.vue';

createApp(App).mount('#app');
`,
    'src/App.vue': `<script setup lang="ts">
import { ForgeButton } from '@mission-platform/components';
</script>

<template>
  <main>
    <h1>${title}</h1>
    <ForgeButton variant="primary">Get started</ForgeButton>
  </main>
</template>
`,
    'src/client/index.ts': `// Client entry points\nexport {};\n`,
    'src/server/index.ts': `// Server-side logic\nexport {};\n`,
    'src/pages/index.ts': `// Routable page components\nexport {};\n`,
    'src/views/index.ts': `// View components\nexport {};\n`,
    'src/components/index.ts': `// App-specific components\nexport {};\n`,
    'src/composables/index.ts': `// App-specific composables\nexport {};\n`,
    'src/locales/index.ts': `// App-specific locales\nexport {};\n`,
    'src/utils/index.ts': `// App-specific utilities\nexport {};\n`,
    'src/routes/index.ts': `// Route definitions\nexport {};\n`,
  };
}

/** Files for a new `workers/<name>` Cloudflare Worker. */
export function workerFiles(options: WorkerScaffoldOptions): Record<string, string> {
  const { name, description } = options;
  const scoped = `@mission-platform/${name}`;

  const packageJson = {
    name: scoped,
    private: true,
    version: '0.0.0',
    description,
    type: 'module',
    exports: {
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts',
      },
    },
    types: './dist/index.d.ts',
    files: ['dist'],
    scripts: {
      build: 'tsc --project tsconfig.build.json',
      lint: 'eslint .',
      'lint:fix': 'eslint --fix .',
      format: 'prettier --check .',
      'format:write': 'prettier --write .',
    },
    devDependencies: {
      '@cloudflare/workers-types': 'catalog:cloudflare',
      '@mission-platform/eslint-config': 'workspace:*',
      '@mission-platform/prettier-config': 'workspace:*',
      '@mission-platform/typescript-config': 'workspace:*',
      eslint: 'catalog:eslint',
      prettier: 'catalog:prettier',
      typescript: 'catalog:typescript',
    },
  };

  return {
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    'tsconfig.json': `{
  "files": [],
  "references": [{ "path": "./tsconfig.build.json" }]
}
`,
    'tsconfig.build.json': `{
  "extends": "@mission-platform/typescript-config/library",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.build.tsbuildinfo",
    "rootDir": "./src",
    "outDir": "./dist",
    "declarationDir": "./dist",
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"]
}
`,
    'eslint.config.js': ESLINT_CONFIG,
    'prettier.config.js': PRETTIER_CONFIG,
    '.prettierignore': PRETTIER_IGNORE,
    'src/index.ts': `import type { fetch, Request, Response } from '@cloudflare/workers-types';

export default {
  async fetch(request: Request, environment: Record<string, { fetch: typeof fetch }>): Promise<Response> {
    // ${description || `${scoped} worker`}
    return environment.ASSETS.fetch(request);
  },
};
`,
    'README.md': `# ${scoped}

${description}

A Cloudflare Worker. Build with \`pnpm exec turbo run build --filter ${scoped}\`.
Local dev and deployment are driven from the consuming app via \`wrangler\`.
`,
  };
}

/** Files for a new `crates/<name>` Rust/WASM crate. */
export function crateFiles(options: CrateScaffoldOptions): Record<string, string> {
  const { name, description } = options;

  const cargoToml = `[package]
name = "mission-platform-${name}"
version = "0.1.0"
edition = "2021"
description = "${description}"
license = "MIT"
publish = false

[lib]
crate-type = ["cdylib", "rlib"]

[features]
console = [
    "dep:tracing-wasm",
    "dep:mission-platform-console-panic-hook",
]

[dependencies]
wasm-bindgen.workspace = true
tracing = { workspace = true }
tracing-wasm = { workspace = true, optional = true }
mission-platform-console-panic-hook = { workspace = true, optional = true }
shadow-rs.workspace = true

[dev-dependencies]
wasm-bindgen-test.workspace = true

[build-dependencies]
shadow-rs = { workspace = true, features = ["build", "git2"] }

[package.metadata.wasm-pack.profile.release]
wasm-opt = false
`;

  const libRs = `use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert_eq!(version(), "0.1.0");
    }
}
`;

  const buildRs = `fn main() {
    shadow_rs::new().unwrap();
}
`;

  const wasmTestRs = `use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn pass() {
    assert_eq!(1 + 1, 2);
}
`;

  const readme = `# mission-platform-${name}

${description}
`;

  return {
    'Cargo.toml': cargoToml,
    'src/lib.rs': libRs,
    'build.rs': buildRs,
    'tests/wasm.rs': wasmTestRs,
    'README.md': readme,
  };
}

/**
 * Files for a new atomic-design component under
 * `src/components/<level>/<name>/` (paths relative to the target package).
 */
export function componentFiles(options: ComponentScaffoldOptions): {
  files: Record<string, string>;
  barrelExport: string;
  levelFolder: string;
  componentName: string;
  storyTitle: string;
} {
  const { name, level } = options;
  const description = options.description?.trim() || `Write-once ${toPascalCase(name)} component.`;
  const levelFolder = atomicLevelFolder(level);
  const levelTitle = atomicLevelTitle(level);
  const areaTitle = toAreaTitle(options.area || 'General');
  const componentName = toPascalCase(name);
  const propertiesName = toPropertiesName(componentName);
  const storyTitle = `${levelTitle}/${areaTitle}/${componentName}`;
  const baseDir = `src/components/${levelFolder}/${name}`;

  const files: Record<string, string> = {
    [`${baseDir}/${name}.tsx`]: `import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

export interface ${propertiesName} extends MpProperties {
  /** Optional accessible label forwarded to the root element. */
  ariaLabel?: string;
}

/**
 * \`${componentName}\` — ${description}
 *
 * Authored once in the neutral JSX dialect (\`@mission-platform/forge\`) and
 * compiled to every supported framework by \`@mission-platform/vite-plugin-forge\`.
 */
export function ${componentName}(properties: Readonly<${propertiesName}>): MpElement {
  return (
    <div className="${name}" aria-label={properties.ariaLabel}>
      {properties.children}
    </div>
  );
}
`,
    [`${baseDir}/${name}.stories.tsx`]: `import { h } from '@mission-platform/forge';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

import { ${componentName} } from './${name}';

/**
 * Storybook entry for \`${componentName}\`.
 * Title convention: \`<Level>/<FunctionalArea>/<Component>\`.
 */
const meta = {
  title: '${storyTitle}',
  component: ${componentName},
  tags: ['autodocs'],
  args: {},
  render: (arguments_) => <${componentName} {...arguments_}>Content</${componentName}>,
} satisfies Meta<typeof ${componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
`,
    [`${baseDir}/${name}.spec.ts`]: `import { describe, expect, it } from 'vitest';

import { ${componentName} } from './${name}';

describe('${componentName}', () => {
  it('is a callable write-once component', () => {
    expect(typeof ${componentName}).toBe('function');
  });
});
`,
    [`${baseDir}/index.ts`]: `export { ${componentName}, type ${propertiesName} } from './${name}';
`,
  };

  const barrelExport = `export { ${componentName}, type ${propertiesName} } from './${levelFolder}/${name}';`;

  return { files, barrelExport, levelFolder, componentName, storyTitle };
}

/**
 * Files for a new composable under `src/composables/<name>/`
 * (paths relative to the target package).
 */
export function composableFiles(options: NamedUnitScaffoldOptions): {
  files: Record<string, string>;
  barrelExport: string;
  name: string;
  functionName: string;
} {
  const name = normalizeComposableName(options.name);
  const functionName = toCamelCase(name);
  const description = options.description?.trim() || `Framework-neutral ${functionName} composable.`;
  const baseDir = `src/composables/${name}`;

  const files: Record<string, string> = {
    [`${baseDir}/${name}.ts`]: `import { useState } from '@mission-platform/forge';

/**
 * ${description}
 *
 * Write-once against \`@mission-platform/forge\` neutral hooks so the same source
 * compiles to every supported framework.
 */
export function ${functionName}(initial = false): {
  value: boolean;
  setValue: (next: boolean) => void;
  toggle: () => void;
} {
  const [value, setValue] = useState(initial);
  return {
    value,
    setValue,
    toggle: () => setValue(!value),
  };
}
`,
    [`${baseDir}/${name}.spec.ts`]: `import { describe, expect, it } from 'vitest';

import { ${functionName} } from './${name}';

describe('${functionName}', () => {
  it('is a callable composable', () => {
    expect(typeof ${functionName}).toBe('function');
  });
});
`,
  };

  const barrelExport = `export { ${functionName} } from './${name}/${name}';`;
  return { files, barrelExport, name, functionName };
}

/**
 * Files for a new framework-neutral store under `src/stores/<name>/`.
 */
export function storeFiles(options: NamedUnitScaffoldOptions): {
  files: Record<string, string>;
  barrelExport: string;
  name: string;
  pascal: string;
} {
  const name = options.name;
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const description = options.description?.trim() || `Framework-neutral ${pascal} store.`;
  const baseDir = `src/stores/${name}`;

  const files: Record<string, string> = {
    [`${baseDir}/${name}.ts`]: `/**
 * ${description}
 *
 * Plain module store (no framework reactivity). Components subscribe with
 * forge \`useState\`/\`useEffect\` so the same source stays portable.
 */

export interface ${pascal}Snapshot {
  /** Example flag held by the store. */
  enabled: boolean;
}

const listeners = new Set<() => void>();

let snapshot: ${pascal}Snapshot = {
  enabled: false,
};

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Immutable snapshot of the current store state. */
export function get${pascal}Snapshot(): ${pascal}Snapshot {
  return snapshot;
}

/** Replace the enabled flag and notify subscribers. */
export function set${pascal}Enabled(enabled: boolean): void {
  if (snapshot.enabled === enabled) {
    return;
  }
  snapshot = { ...snapshot, enabled };
  notify();
}

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe${pascal}(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Camel-case alias helpers for ergonomic imports. */
export const ${camel}Store = {
  getSnapshot: get${pascal}Snapshot,
  setEnabled: set${pascal}Enabled,
  subscribe: subscribe${pascal},
};
`,
    [`${baseDir}/${name}.spec.ts`]: `import { describe, expect, it } from 'vitest';

import { get${pascal}Snapshot, set${pascal}Enabled, subscribe${pascal} } from './${name}';

describe('${name} store', () => {
  it('updates snapshot and notifies subscribers', () => {
    let calls = 0;
    const unsubscribe = subscribe${pascal}(() => {
      calls += 1;
    });

    set${pascal}Enabled(true);
    expect(get${pascal}Snapshot().enabled).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(1);

    unsubscribe();
  });
});
`,
  };

  const barrelExport = `export {
  get${pascal}Snapshot,
  set${pascal}Enabled,
  subscribe${pascal},
  ${camel}Store,
  type ${pascal}Snapshot,
} from './${name}/${name}';`;

  return { files, barrelExport, name, pascal };
}

/**
 * Files for a new util under `src/utils/<name>/`.
 */
export function utilFiles(options: NamedUnitScaffoldOptions): {
  files: Record<string, string>;
  barrelExport: string;
  name: string;
  functionName: string;
} {
  const name = options.name;
  const functionName = toCamelCase(name);
  const description = options.description?.trim() || `Utility helper: ${functionName}.`;
  const baseDir = `src/utils/${name}`;

  const files: Record<string, string> = {
    [`${baseDir}/${name}.ts`]: `/**
 * ${description}
 */
export function ${functionName}<T>(value: T): T {
  return value;
}
`,
    [`${baseDir}/${name}.spec.ts`]: `import { describe, expect, it } from 'vitest';

import { ${functionName} } from './${name}';

describe('${functionName}', () => {
  it('returns the input value', () => {
    expect(${functionName}('ok')).toBe('ok');
    expect(${functionName}(42)).toBe(42);
  });
});
`,
  };

  const barrelExport = `export { ${functionName} } from './${name}/${name}';`;
  return { files, barrelExport, name, functionName };
}

export { toPascalCase, toCamelCase, TURBO_LEAF };
