/**
 * Convention-compliant file templates for scaffolding new workspace members.
 *
 * Each factory returns a map of *relative file path* → *file contents*. The
 * templates mirror the real structure of existing members (e.g. the
 * `breakpoints` package, `base-spa` worker and `my-care-notes` app) so
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
    'src/index.ts': `export { ${camel} } from './${name}';
`,
    [`src/${name}.ts`]: `/**
 * ${description || `Public API for the ${scoped} package.`}
 */
export function ${camel}(): string {
  return '${name}';
}
`,
    [`src/${name}.spec.ts`]: `import { describe, expect, it } from 'vitest';

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
    'vite.config.ts': `import { defineAppConfig } from '@mission-platform/vite-config';

export default defineAppConfig({
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
import { BaseButton } from '@mission-platform/components/vue';
</script>

<template>
  <main>
    <h1>${title}</h1>
    <BaseButton variant="primary">Get started</BaseButton>
  </main>
</template>
`,
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

export { toPascalCase, toCamelCase, TURBO_LEAF };
