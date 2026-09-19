import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { emitDts } from 'svelte2tsx';

import {
  discoverComponentsFromGraph,
  discoverExternalExportsFromGraph,
  discoverHelperExportsFromGraph,
  type DiscoveredComponent,
  type DiscoveredExternalExport,
  type DiscoveredHelperExport,
} from '../compiler/discover.js';
import { buildForgeFileGraph } from '../compiler/graph.js';

import { externalReExportLine, helperBindingReExportName } from './entry-synthesis.js';

import type { JsxFramework } from '@mission-platform/forge-plugin-api';
import type { Plugin } from 'vite';

/** Options for {@link jsxComponentsEntryDtsPlugin}. */
export interface JsxComponentsEntryDtsOptions {
  /** Framework the synthesised declaration targets. */
  framework: JsxFramework;
  /** Absolute path of the neutral components barrel (e.g. `src/components/index.ts`). */
  componentsModule: string;
  /**
   * Absolute path of the package public entry (e.g. `src/index.ts`). Component
   * declarations are discovered from {@link componentsModule}; helper, type,
   * and external declarations are discovered from this entry. Defaults to the
   * component module for component-only packages and fixtures.
   */
  publicEntryModule?: string;
  /** Base name (no extension) of the synthesised declaration file, e.g. `vue`. */
  declarationFileName: string;
  /** Import specifier for the props types inside the emitted `.d.ts`. Defaults to `./components`. */
  declarationModule?: string;
  /** Prefix stripped from each neutral export name to form its public name. Defaults to `Forge`. */
  stripPrefix?: string;
  /** Owning neutral source root used for graph alias resolution. */
  sourceRoot?: string;
}

/**
 * Re-link per-component CSS to its JS chunk.
 */
export function jsxComponentsCssImportPlugin(): Plugin {
  return {
    name: '@mission-platform/vite-plugin-forge:css-imports',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const renamedCss = new Map<string, string>();
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.module.css')) {
          continue;
        }
        const renamed = `${file.fileName.slice(0, -'.module.css'.length)}.css`;
        if (Object.hasOwn(bundle, renamed)) {
          continue;
        }
        this.emitFile({ type: 'asset', fileName: renamed, source: file.source });
        delete bundle[file.fileName];
        renamedCss.set(file.fileName, renamed);
      }
      const renamedCssTargets = new Set(renamedCss.values());

      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') {
          continue;
        }
        const importedCss = file.viteMetadata?.importedCss;
        if (importedCss === undefined || importedCss.size === 0) {
          continue;
        }
        const fromDir = path.posix.dirname(file.fileName);
        const statements = [...importedCss]
          .map((cssFileName) => renamedCss.get(cssFileName) ?? cssFileName)
          .filter((cssFileName) => renamedCssTargets.has(cssFileName) || Object.hasOwn(bundle, cssFileName))
          .map((cssFileName) => {
            const relative = path.posix.relative(fromDir, cssFileName);
            const specifier = relative.startsWith('.') ? relative : `./${relative}`;
            return `import ${JSON.stringify(specifier)};`;
          })
          .join('\n');
        if (statements.length === 0) {
          continue;
        }
        file.code = `${statements}\n${file.code}`;
      }
    },
  };
}

/** Generate the synthesised TypeScript declaration of the public entry. */
export function generateEntryDeclaration(
  framework: JsxFramework,
  declarationModule: string,
  components: readonly DiscoveredComponent[],
  helpers: readonly DiscoveredHelperExport[] = [],
  externalExports: readonly DiscoveredExternalExport[] = [],
): string {
  const componentType =
    framework === 'react'
      ? 'FunctionComponent'
      : framework === 'vue'
        ? 'DefineComponent'
        : framework === 'solid'
          ? 'Component'
          : framework === 'svelte'
            ? 'Component'
            : 'CustomElementConstructor';
  const frameworkImport =
    framework === 'react'
      ? 'react'
      : framework === 'vue'
        ? 'vue'
        : framework === 'solid'
          ? 'solid-js'
          : framework === 'svelte'
            ? 'svelte'
            : '';

  const propertyTypes = [...new Set(components.map((component) => component.propertiesType).filter(Boolean))];
  const lines: string[] = [];
  if (frameworkImport.length > 0) {
    lines.push(`import type { ${componentType} } from ${JSON.stringify(frameworkImport)};`);
  }
  if (propertyTypes.length > 0) {
    lines.push(`import type { ${propertyTypes.join(', ')} } from ${JSON.stringify(declarationModule)};`);
  }
  lines.push('');
  const claimed = new Set<string>();
  for (const component of components) {
    if (claimed.has(component.publicName)) {
      continue;
    }
    claimed.add(component.publicName);
    const properties = component.propertiesType ?? 'Record<string, unknown>';
    lines.push(`export declare const ${component.publicName}: ${componentType}<${properties}>;`);
    if (component.neutralName !== component.publicName && !claimed.has(component.neutralName)) {
      claimed.add(component.neutralName);
      lines.push(`export declare const ${component.neutralName}: ${componentType}<${properties}>;`);
    }
  }
  const componentTypes = [...new Set(components.flatMap((component) => component.typeExports))];
  const unclaimedComponentTypes = componentTypes.filter((type) => {
    if (claimed.has(type)) {
      return false;
    }
    claimed.add(type);
    return true;
  });
  if (unclaimedComponentTypes.length > 0) {
    lines.push(`export type { ${unclaimedComponentTypes.join(', ')} } from ${JSON.stringify(declarationModule)};`);
  }
  for (const helper of helpers) {
    const names = [
      ...helper.values
        .filter((value) => !claimed.has(value.exportedName))
        .map((value) => {
          claimed.add(value.exportedName);
          return helperBindingReExportName(value);
        }),
      ...helper.types
        .filter((type) => !claimed.has(type.exportedName))
        .map((type) => {
          claimed.add(type.exportedName);
          return helperBindingReExportName(type, true);
        }),
    ];
    if (names.length > 0) {
      lines.push(
        `export { ${names.join(', ')} } from ${JSON.stringify(`${declarationModule}/${helper.relativePath}`)};`,
      );
    }
  }
  for (const external of externalExports) {
    if (external.exportedName !== undefined && external.star && claimed.has(external.exportedName)) {
      continue;
    }
    if (external.exportedName !== undefined && !external.star) {
      if (claimed.has(external.exportedName)) {
        continue;
      }
      claimed.add(external.exportedName);
    }
    const line = externalReExportLine(external);
    if (line.length > 0) {
      lines.push(line);
    }
  }
  lines.push('');
  return lines.join('\n');
}

export function discoverGeneratedEntrySources(
  componentsModule: string,
  publicEntryModule = componentsModule,
  stripPrefix = 'Forge',
  sourceRoot = path.dirname(path.dirname(componentsModule)),
): {
  components: DiscoveredComponent[];
  helpers: DiscoveredHelperExport[];
  externalExports: DiscoveredExternalExport[];
} {
  const componentGraph = buildForgeFileGraph({ entry: componentsModule, sourceRoot });
  const publicGraph =
    publicEntryModule === componentsModule
      ? componentGraph
      : buildForgeFileGraph({ entry: publicEntryModule, sourceRoot });
  const graphErrors = [...componentGraph.diagnostics, ...publicGraph.diagnostics]
    .filter((diagnostic) => diagnostic.code !== 'cycle')
    .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`);
  if (graphErrors.length > 0) {
    throw new Error(graphErrors.join('\n'));
  }
  const components = discoverComponentsFromGraph(componentGraph, stripPrefix);
  return {
    components,
    helpers: discoverHelperExportsFromGraph(
      publicGraph,
      new Set(components.map((component) => component.folder)),
      components,
    ),
    externalExports: discoverExternalExportsFromGraph(publicGraph),
  };
}

/**
 * Emit the synthesised declaration (`<declarationFileName>.d.ts`) for the
 * generated entry, so the package's `./react` / `./vue` types resolve even
 * though the entry itself is generated (and therefore not seen by `tsc`).
 */
export function jsxComponentsEntryDtsPlugin(options: JsxComponentsEntryDtsOptions): Plugin {
  const declarationModule = options.declarationModule ?? './components';
  const stripPrefix = options.stripPrefix ?? 'Forge';

  return {
    name: '@mission-platform/vite-plugin-forge:entry-dts',
    generateBundle() {
      const { components, helpers, externalExports } = discoverGeneratedEntrySources(
        options.componentsModule,
        options.publicEntryModule,
        stripPrefix,
        options.sourceRoot,
      );
      this.emitFile({
        type: 'asset',
        fileName: `${options.declarationFileName}.d.ts`,
        source: generateEntryDeclaration(options.framework, declarationModule, components, helpers, externalExports),
      });
    },
  };
}

/** Options for {@link jsxComponentsDtsPlugin}. */
export interface JsxComponentsDtsOptions {
  /** The framework of the generated source tree — selects the source extensions + declaration toolchain. */
  framework: JsxFramework;
  /**
   * Absolute path of the generated per-framework source tree (the `outDir`
   * handed to {@link generateFrameworkSources}): React/Solid `.tsx` modules,
   * Vue/Svelte SFCs (`.vue` / `.svelte`), or Web-Components `.ts` modules,
   * plus their shared helper `.ts` modules and the entry.
   */
  generatedDir: string;
  /**
   * Absolute path of the directory the emitted `.d.ts` files are written to
   * (e.g. `dist/react`, `dist/vue`, `dist/solid`, `dist/svelte`, `dist/web-components`).
   */
  outDir: string;
  /**
   * Absolute path of the `vue-tsc` CLI (`vue-tsc/bin/vue-tsc.js`), used to emit
   * declarations for the Vue `.vue` tree. **Required** when `framework` is
   * `'vue'` (plain `tsc` cannot read single-file components); ignored otherwise.
   */
  vueTscBin?: string;
  /**
   * Path to the neutral components barrel module. Used by the Svelte path to
   * synthesise a fallback `index.d.ts` (via {@link generateEntryDeclaration})
   * when `svelte2tsx`'s `emitDts` does not leave a usable one behind.
   */
  componentsModule?: string;
  /**
   * Absolute path of the package public entry used when a declaration toolchain
   * falls back to synthesising `index.d.ts`. Native declaration emit otherwise
   * follows the generated framework entry, which already contains this surface.
   */
  publicEntryModule?: string;
  /** Owning neutral source root used for graph alias resolution. */
  sourceRoot?: string;
}

const CSS_MODULE_SHIM = [
  "declare module '*.module.scss' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.module.css' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.scss' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.css' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.svelte' { const component: any; export default component; }",
  "declare module '*.flint' {",
  '  interface ForgeFlintExports { readonly [name: string]: (value: string) => string; }',
  '  const manifest: Readonly<Record<string, unknown>>;',
  '  function load(): Promise<ForgeFlintExports>;',
  '  function loadSync(): ForgeFlintExports;',
  '  export { manifest, load, loadSync };',
  '}',
  "declare module '*.flt' {",
  '  interface ForgeFlintExports { readonly [name: string]: (value: string) => string; }',
  '  const manifest: Readonly<Record<string, unknown>>;',
  '  function load(): Promise<ForgeFlintExports>;',
  '  function loadSync(): ForgeFlintExports;',
  '  export { manifest, load, loadSync };',
  '}',
  "declare module '*.fws' {",
  '  interface ForgeFwsExports { readonly [name: string]: (value: string) => string; }',
  '  const manifest: Readonly<Record<string, unknown>>;',
  '  function load(): Promise<ForgeFwsExports>;',
  '  function loadSync(): ForgeFwsExports;',
  '  export { manifest, load, loadSync };',
  '}',
  '',
].join('\n');

const CSS_MODULE_SHIM_FILE = '__mp-css-shim.d.ts';

function hasDeclarationFiles(directory: string): boolean {
  if (!existsSync(directory)) return false;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.d.ts')) return true;
    if (entry.isDirectory() && hasDeclarationFiles(path.join(directory, entry.name))) return true;
  }
  return false;
}

const FRAMEWORK_DTS_CONDITION: Record<JsxFramework, string> = {
  vue: 'mp:vue',
  react: 'mp:react',
  solid: 'mp:solid',
  svelte: 'mp:svelte',
  'web-components': 'mp:web-component',
};

function selfReferencePaths(generatedDir: string): Record<string, string[]> {
  let directory = generatedDir;
  while (true) {
    const manifestPath = path.join(directory, 'package.json');
    if (existsSync(manifestPath)) {
      const name = (JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string }).name;
      const neutralDeclaration = path.join(directory, 'dist', 'index.d.ts');
      if (name === undefined || !existsSync(neutralDeclaration)) {
        return {};
      }
      return { [name]: [neutralDeclaration] };
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      return {};
    }
    directory = parent;
  }
}

function parseJsoncObject(text: string): Record<string, unknown> | undefined {
  try {
    const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const value = JSON.parse(stripped) as unknown;
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function resolveTscBin(): string {
  const packageJson = createRequire(import.meta.url).resolve('typescript/package.json');
  return path.join(path.dirname(packageJson), 'lib', 'tsc.js');
}

function packageAliasCompilerOptions(generatedDir: string): { paths?: Record<string, string[]> } {
  let packageDirectory = generatedDir;
  while (true) {
    const manifestPath = path.join(packageDirectory, 'package.json');
    if (existsSync(manifestPath)) {
      break;
    }
    const parent = path.dirname(packageDirectory);
    if (parent === packageDirectory) {
      return {};
    }
    packageDirectory = parent;
  }

  const configFileName = [
    path.join(packageDirectory, 'tsconfig.build.json'),
    path.join(packageDirectory, 'tsconfig.json'),
  ].find((file) => existsSync(file));
  if (configFileName === undefined) {
    return {};
  }

  const config = parseJsoncObject(readFileSync(configFileName, 'utf8'));
  const compilerOptions = (config?.compilerOptions ?? undefined) as
    { baseUrl?: string; paths?: Record<string, string[]> } | undefined;
  if (compilerOptions?.paths === undefined) {
    return {};
  }

  const sourceRoot = path.resolve(packageDirectory, 'src');
  const configBaseUrl = compilerOptions.baseUrl ?? '.';
  const baseUrl = path.resolve(path.dirname(configFileName), configBaseUrl);
  const paths = Object.fromEntries(
    Object.entries(compilerOptions.paths).map(([pattern, targets]) => [
      pattern,
      targets.flatMap((target) => {
        const wildcard = target.indexOf('*');
        const targetPrefix = wildcard === -1 ? target : target.slice(0, wildcard);
        const targetPath = path.resolve(baseUrl, targetPrefix);
        if (targetPath === sourceRoot || targetPath.startsWith(`${sourceRoot}${path.sep}`)) {
          const relativeToSource = path.relative(sourceRoot, targetPath);
          return [path.join(generatedDir, relativeToSource, target.slice(targetPrefix.length))];
        }
        return [path.resolve(baseUrl, target)];
      }),
    ]),
  );

  return { paths };
}

const COMPONENT_DTS_COMPILER_OPTIONS = {
  module: 'ESNext',
  moduleResolution: 'bundler',
  target: 'ES2023',
  lib: ['ES2023', 'DOM', 'DOM.Iterable'],
  jsx: 'preserve',
  skipLibCheck: true,
  esModuleInterop: true,
  strict: true,
  declaration: true,
  emitDeclarationOnly: true,
  noEmitOnError: false,
  types: [] as string[],
} as const;

function emitTscComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
  compilerOverrides: Record<string, unknown> = {},
): void {
  writeFileSync(path.join(options.generatedDir, CSS_MODULE_SHIM_FILE), CSS_MODULE_SHIM, 'utf8');

  const { paths } = packageAliasCompilerOptions(options.generatedDir);
  const tsconfig = {
    compilerOptions: {
      ...COMPONENT_DTS_COMPILER_OPTIONS,
      customConditions: [FRAMEWORK_DTS_CONDITION[options.framework]],
      paths: { ...paths, ...selfReferencePaths(options.generatedDir) },
      ...compilerOverrides,
      rootDir: options.generatedDir,
      outDir: options.outDir,
      declarationDir: options.outDir,
    },
    include: ['**/*.ts', '**/*.tsx'],
  };
  const tsconfigPath = path.join(options.generatedDir, 'tsconfig.dts.json');
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, undefined, 2), 'utf8');

  try {
    execFileSync(process.execPath, [resolveTscBin(), '-p', tsconfigPath], {
      cwd: options.generatedDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const report = error as { stdout?: string; stderr?: string };
    const message = [report.stdout, report.stderr].filter(Boolean).join('\n').trim();
    const hasDeclarations = hasDeclarationFiles(options.outDir);
    if (!hasDeclarations) {
      throw new Error(`Forge declaration generation failed${message.length > 0 ? `:\n${message}` : '.'}`);
    }
    this.warn(`Forge declaration generation reported diagnostics:\n${message}`);
  }
}

function emitReactComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options);
}

function emitSolidComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options, {
    jsx: 'preserve',
    jsxImportSource: 'solid-js',
  });
}

function emitWebComponentsComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options);
}

function emitVueComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  if (options.vueTscBin === undefined) {
    throw new Error('jsxComponentsDtsPlugin: `vueTscBin` is required to emit declarations for the Vue tree.');
  }
  writeFileSync(path.join(options.generatedDir, CSS_MODULE_SHIM_FILE), CSS_MODULE_SHIM, 'utf8');
  const { paths } = packageAliasCompilerOptions(options.generatedDir);

  const tsconfig = {
    compilerOptions: {
      module: 'esnext',
      moduleResolution: 'bundler',
      target: 'es2023',
      lib: ['es2023', 'dom', 'dom.iterable'],
      jsx: 'preserve',
      jsxImportSource: 'vue',
      customConditions: [FRAMEWORK_DTS_CONDITION.vue],
      paths: { ...paths, ...selfReferencePaths(options.generatedDir) },
      skipLibCheck: true,
      esModuleInterop: true,
      strict: true,
      declaration: true,
      emitDeclarationOnly: true,
      noEmitOnError: false,
      types: [],
      rootDir: options.generatedDir,
      outDir: options.outDir,
      declarationDir: options.outDir,
    },
    include: ['**/*.ts', '**/*.vue'],
  };
  const tsconfigPath = path.join(options.generatedDir, 'tsconfig.dts.json');
  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, undefined, 2), 'utf8');

  try {
    execFileSync(process.execPath, [options.vueTscBin, '-p', tsconfigPath], {
      cwd: options.generatedDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const report = error as { stdout?: string; stderr?: string };
    const message = [report.stdout, report.stderr].filter(Boolean).join('\n').trim();
    const hasDeclarations = hasDeclarationFiles(options.outDir);
    if (!hasDeclarations) {
      throw new Error(`Forge declaration generation failed${message.length > 0 ? `:\n${message}` : '.'}`);
    }
    this.warn(`Forge declaration generation reported diagnostics:\n${message}`);
  }
}

function svelteDtsOutputIsUsable(outDir: string): boolean {
  const indexDtsPath = path.join(outDir, 'index.d.ts');
  if (!existsSync(indexDtsPath) || readFileSync(indexDtsPath, 'utf8').trim().length === 0) {
    return false;
  }
  const sidecarFiles = readdirSync(outDir).filter((file) => file.endsWith('.svelte.d.ts'));
  if (sidecarFiles.length === 0) {
    return false;
  }
  return sidecarFiles.every((file) => {
    const content = readFileSync(path.join(outDir, file), 'utf8');
    const propsTypeMatch = /\bComponent<(\w+)/.exec(content);
    if (propsTypeMatch === null) {
      return true;
    }
    const propsType = propsTypeMatch[1];
    const isDeclared = new RegExp(`\\b(?:interface|type|class)\\s+${propsType}\\b`).test(content);
    const isImported = new RegExp(`\\bimport\\b[^;]*[{,]\\s*(?:type\\s+)?${propsType}\\b`).test(content);
    return isDeclared || isImported;
  });
}

async function emitSvelteComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): Promise<void> {
  writeFileSync(path.join(options.generatedDir, CSS_MODULE_SHIM_FILE), CSS_MODULE_SHIM, 'utf8');
  const packageAliases = packageAliasCompilerOptions(options.generatedDir);

  const tsconfig = {
    compilerOptions: {
      module: 'esnext',
      moduleResolution: 'bundler',
      target: 'es2023',
      lib: ['es2023', 'dom', 'dom.iterable'],
      customConditions: [FRAMEWORK_DTS_CONDITION.svelte],
      ...packageAliases,
      paths: { ...packageAliases.paths, ...selfReferencePaths(options.generatedDir) },
      skipLibCheck: true,
      strict: true,
      declaration: true,
      emitDeclarationOnly: true,
      noEmitOnError: false,
      types: [],
      rootDir: '.',
      declarationDir: options.outDir,
    },
    include: ['**/*.ts', '**/*.svelte'],
  };
  const tsconfigFileName = 'tsconfig.dts.json';
  writeFileSync(path.join(options.generatedDir, tsconfigFileName), JSON.stringify(tsconfig, undefined, 2), 'utf8');

  try {
    await emitDts({
      declarationDir: options.outDir,
      svelteShimsPath: createRequire(import.meta.url).resolve('svelte2tsx/svelte-shims-v4.d.ts'),
      libRoot: options.generatedDir,
      tsconfig: tsconfigFileName,
    });
  } catch (error) {
    this.warn(error instanceof Error ? error.message : String(error));
  }

  if (svelteDtsOutputIsUsable(options.outDir)) {
    return;
  }
  this.warn(
    "jsxComponentsDtsPlugin: svelte2tsx's emitDts did not produce usable declarations " +
      '(dangling props-type references in the generated .svelte.d.ts sidecars); ' +
      'falling back to the synthesised entry declaration for the Svelte build.',
  );
  if (existsSync(options.outDir)) {
    for (const file of readdirSync(options.outDir).filter((entry) => entry.endsWith('.d.ts'))) {
      rmSync(path.join(options.outDir, file));
    }
  }
  if (options.componentsModule === undefined) {
    return;
  }
  const { components, helpers, externalExports } = discoverGeneratedEntrySources(
    options.componentsModule,
    options.publicEntryModule,
    'Forge',
    options.sourceRoot,
  );
  const dtsContent = generateEntryDeclaration(options.framework, '../components', components, helpers, externalExports);
  mkdirSync(options.outDir, { recursive: true });
  writeFileSync(path.join(options.outDir, 'index.d.ts'), dtsContent, 'utf8');
}

/**
 * A post-build Vite plugin that emits genuine, per-framework declarations
 * for a neutral components package's generated source tree.
 */
export function jsxComponentsDtsPlugin(options: JsxComponentsDtsOptions): Plugin {
  return {
    name: '@mission-platform/vite-plugin-forge:components-dts',
    async closeBundle() {
      switch (options.framework) {
        case 'react': {
          emitReactComponentDeclarations.call(this, options);
          break;
        }
        case 'vue': {
          emitVueComponentDeclarations.call(this, options);
          break;
        }
        case 'solid': {
          emitSolidComponentDeclarations.call(this, options);
          break;
        }
        case 'web-components': {
          emitWebComponentsComponentDeclarations.call(this, options);
          break;
        }
        case 'svelte': {
          await emitSvelteComponentDeclarations.call(this, options);
          break;
        }
        default: {
          if (options.componentsModule) {
            const { components, helpers, externalExports } = discoverGeneratedEntrySources(
              options.componentsModule,
              options.publicEntryModule,
              'Forge',
              options.sourceRoot,
            );
            const dtsContent = generateEntryDeclaration(
              options.framework,
              './components',
              components,
              helpers,
              externalExports,
            );
            this.emitFile({
              type: 'asset',
              fileName: 'index.d.ts',
              source: dtsContent,
            });
          }
          break;
        }
      }
    },
  };
}
