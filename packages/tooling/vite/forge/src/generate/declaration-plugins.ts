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
import { oxcNodeText, parseOxcModule, type OxcParsedModule } from '../compiler/oxc.js';

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
  /** Package root directory, used to locate `dist/components` declarations. */
  packageRoot?: string;
  /** Isolated output root if executing under staged forge runner. */
  outputRoot?: string;
  /** Cached framework source directory containing generated framework sources. */
  generatedDirectory?: string;
}

/** Renames asset module css files to plain css files in the bundle. */
function renameCssAssets(
  bundle: Record<string, OutputAsset | OutputChunk>,
  emitFile: (file: { type: 'asset'; fileName: string; source: string | Uint8Array }) => void,
): Map<string, string> {
  const renamedCss = new Map<string, string>();
  for (const file of Object.values(bundle)) {
    if (file.type !== 'asset' || !file.fileName.endsWith('.module.css')) {
      continue;
    }
    const renamed = `${file.fileName.slice(0, -'.module.css'.length)}.css`;
    if (Object.hasOwn(bundle, renamed)) {
      continue;
    }
    emitFile({ type: 'asset', fileName: renamed, source: file.source });
    Reflect.deleteProperty(bundle, file.fileName);
    renamedCss.set(file.fileName, renamed);
  }
  return renamedCss;
}

/** Injects css import statements into generated JavaScript chunks. */
// skipcq: JS-R1005
function injectCssImportsIntoChunks(
  bundle: Record<string, OutputAsset | OutputChunk>,
  renamedCss: Map<string, string>,
): void {
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
    if (statements.length > 0) {
      file.code = `${statements}\n${file.code}`;
    }
  }
}

/**
 * Re-link per-component CSS to its JS chunk.
 */
export function jsxComponentsCssImportPlugin(): Plugin {
  return {
    name: '@mission-platform/vite-plugin-forge:css-imports',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const renamedCss = renameCssAssets(bundle, (file) => this.emitFile(file));
      injectCssImportsIntoChunks(bundle, renamedCss);
    },
  };
}

const HELPER_PREFIXES = ['utils/', 'composables/', 'styles/', 'components/'];

/** Check whether a cleaned path starts with a recognized helper subdirectory. */
function isStandardHelperPath(cleanPath: string): boolean {
  return HELPER_PREFIXES.some((prefix) => cleanPath.startsWith(prefix));
}

/** Resolves the import specifier for a helper module within the declaration file. */
function resolveHelperSpecifier(declarationModule: string, helperRelativePath: string): string {
  const cleanPath = helperRelativePath.startsWith('./') ? helperRelativePath.slice(2) : helperRelativePath;
  if (isStandardHelperPath(cleanPath) || !declarationModule) {
    return `./${cleanPath}`;
  }
  const cleanModule = declarationModule.replace(/\/+$/, '');
  return `${cleanModule}/${cleanPath}`;
}

/** Resolves framework component type and framework module import name. */
function resolveFrameworkDeclarationMeta(framework: JsxFramework): { componentType: string; frameworkImport: string } {
  switch (framework) {
    case 'react': {
      return { componentType: 'FunctionComponent', frameworkImport: 'react' };
    }
    case 'vue': {
      return { componentType: 'DefineComponent', frameworkImport: 'vue' };
    }
    case 'solid': {
      return { componentType: 'Component', frameworkImport: 'solid-js' };
    }
    case 'svelte': {
      return { componentType: 'Component', frameworkImport: 'svelte' };
    }
    default: {
      return { componentType: 'CustomElementConstructor', frameworkImport: '' };
    }
  }
}

/** Generate component export lines for entry declarations. */
// skipcq: JS-R1005
function generateComponentDeclarationLines(
  components: readonly DiscoveredComponent[],
  componentType: string,
  claimed: Set<string>,
): string[] {
  const lines: string[] = [];
  for (const component of components) {
    if (claimed.has(component.publicName)) {
      continue;
    }
    claimed.add(component.publicName);
    const properties = component.propertiesType
      ? component.propertiesType.startsWith('Readonly<')
        ? component.propertiesType
        : `Readonly<${component.propertiesType}>`
      : 'Record<string, unknown>';
    lines.push(`export declare const ${component.publicName}: ${componentType}<${properties}>;`);
    if (component.neutralName !== component.publicName && !claimed.has(component.neutralName)) {
      claimed.add(component.neutralName);
      lines.push(`export declare const ${component.neutralName}: ${componentType}<${properties}>;`);
    }
  }
  return lines;
}

/** Generate helper re-export lines for entry declarations. */
function generateHelperExportLines(
  helpers: readonly DiscoveredHelperExport[],
  declarationModule: string,
  claimed: Set<string>,
): string[] {
  const lines: string[] = [];
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
      const helperSpecifier = resolveHelperSpecifier(declarationModule, helper.relativePath);
      lines.push(`export { ${names.join(', ')} } from ${JSON.stringify(helperSpecifier)};`);
    }
  }
  return lines;
}

/** Generate external re-export lines for entry declarations. */
// skipcq: JS-R1005
function generateExternalExportLines(
  externalExports: readonly DiscoveredExternalExport[],
  claimed: Set<string>,
): string[] {
  const lines: string[] = [];
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
  return lines;
}

/** Generate the synthesised TypeScript declaration of the public entry. */
export function generateEntryDeclaration(
  framework: JsxFramework,
  declarationModule: string,
  components: readonly DiscoveredComponent[],
  helpers: readonly DiscoveredHelperExport[] = [],
  externalExports: readonly DiscoveredExternalExport[] = [],
): string {
  const { componentType, frameworkImport } = resolveFrameworkDeclarationMeta(framework);
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
  lines.push(...generateComponentDeclarationLines(components, componentType, claimed));

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

  lines.push(...generateHelperExportLines(helpers, declarationModule, claimed));
  lines.push(...generateExternalExportLines(externalExports, claimed));
  lines.push('');
  return lines.join('\n');
}

/** Discovers all components, helper modules, and external exports from module graphs. */
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

/** Finds the enclosing package root directory containing package.json. */
function findPackageRoot(startDir: string): string {
  let current = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
}

/** Recursively collects all declaration (.d.ts) files under a directory. */
// skipcq: JS-R1005
function collectAllDeclarationFiles(dir: string, baseDir = dir): { relativePath: string; fullPath: string }[] {
  if (!existsSync(dir)) return [];
  const results: { relativePath: string; fullPath: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectAllDeclarationFiles(fullPath, baseDir));
    } else if (entry.isFile() && /\.(?:d\.ts|d\.mts|d\.cts)$/.test(entry.name)) {
      const relativePath = path.relative(baseDir, fullPath).split(path.sep).join('/');
      results.push({ relativePath, fullPath });
    }
  }
  return results;
}

/** Find the first existing directory from a list of candidate paths that contains declaration files. */
function findFirstDeclarationDirectory(candidates: readonly string[]): string | undefined {
  for (const candidate of candidates) {
    if (existsSync(candidate) && hasDeclarationFiles(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/** Resolves candidate dist/components directories for package root and stage root. */
function getNeutralCandidateDirectories(packageRoot: string, outputRoot?: string): string[] {
  const stageRoot = outputRoot ?? process.env.FORGE_BUILD_STAGE_ROOT;
  return [
    stageRoot ? path.resolve(stageRoot, 'dist/components') : undefined,
    path.resolve(packageRoot, 'dist/components'),
  ].filter((c): c is string => c !== undefined);
}

/** Executes tsdown to build missing forge declarations in the neutral components directory. */
function buildNeutralDeclarationsFallback(packageRoot: string): void {
  const forgeConfig = path.join(packageRoot, 'tsdown.forge.config.ts');
  if (existsSync(forgeConfig)) {
    try {
      execFileSync('pnpm', ['exec', 'tsdown', '--config', 'tsdown.forge.config.ts'], {
        cwd: packageRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      // Ignore fallback failure
    }
  }
}

/**
 * Resolves the directory containing neutral component declaration files (.d.ts).
 * Falls back to triggering a forge build when declarations are not yet materialized.
 */
function resolveNeutralComponentsDirectory(packageRoot: string, outputRoot?: string): string | undefined {
  const candidates = getNeutralCandidateDirectories(packageRoot, outputRoot);
  const existing = findFirstDeclarationDirectory(candidates);
  if (existing !== undefined) {
    return existing;
  }

  buildNeutralDeclarationsFallback(packageRoot);
  const postBuildExisting = findFirstDeclarationDirectory(candidates);
  if (postBuildExisting !== undefined) {
    return postBuildExisting;
  }

  return candidates.find((c) => existsSync(c));
}

/** Extracts embedded TypeScript or JavaScript source from SFC component files. */
function extractScriptFromComponent(fullPath: string, source: string): string {
  if (fullPath.endsWith('.vue') || fullPath.endsWith('.svelte')) {
    const scriptMatches = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
    if (scriptMatches.length > 0) {
      return scriptMatches.map((m) => m[1]).join('\n');
    }
  }
  return source;
}

/** Filters a named import statement, retaining only specifiers referenced in body text. */
// skipcq: JS-R1005
function filterNamedImport(imp: string, namedMatch: RegExpMatchArray, bodyText: string): string | undefined {
  const isTypeImport = imp.startsWith('import type');
  const specifiers = namedMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const source = namedMatch[2];
  const keptSpecifiers: string[] = [];
  for (const spec of specifiers) {
    const clean = spec.replace(/^type\s+/, '');
    const local = clean.split(/\s+as\s+/)[1] ?? clean.split(/\s+as\s+/)[0];
    const regex = new RegExp(`\\b${local}\\b`);
    if (regex.test(bodyText)) {
      keptSpecifiers.push(spec);
    }
  }
  if (keptSpecifiers.length === 0) {
    return undefined;
  }
  const typePrefix = isTypeImport ? 'type ' : '';
  return `import ${typePrefix}{ ${keptSpecifiers.join(', ')} } from '${source}';`;
}

/** Filters a default import statement, retaining it only when referenced in body text. */
function filterDefaultImport(imp: string, defaultMatch: RegExpMatchArray, bodyText: string): string | undefined {
  const local = defaultMatch[1];
  const regex = new RegExp(`\\b${local}\\b`);
  return regex.test(bodyText) ? imp : undefined;
}

/** Filter a list of import statements, preserving only those whose imported specifiers appear in the body text. */
// skipcq: JS-R1005
function filterReferencedImports(importStatements: readonly string[], bodyText: string): string[] {
  const result: string[] = [];
  for (const imp of importStatements) {
    const namedMatch = imp.match(/^import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?$/);
    if (namedMatch) {
      const filtered = filterNamedImport(imp, namedMatch, bodyText);
      if (filtered !== undefined) {
        result.push(filtered);
      }
      continue;
    }

    const defaultMatch = imp.match(/^import\s+(?:type\s+)?([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+)['"];?$/);
    if (defaultMatch) {
      const filtered = filterDefaultImport(imp, defaultMatch, bodyText);
      if (filtered !== undefined) {
        result.push(filtered);
      }
      continue;
    }

    result.push(imp);
  }
  return result;
}

/** Collects raw import and type declarations from a component AST. */
// skipcq: JS-R1005
function collectComponentAstDeclarations(
  parsed: OxcParsedModule,
  scriptContent: string,
): { rawImports: string[]; types: string[]; typeNames: string[] } {
  const rawImports: string[] = [];
  const types: string[] = [];
  const typeNames: string[] = [];

  for (const stmt of parsed.program.body) {
    if (stmt.type === 'ImportDeclaration') {
      const src = stmt.source?.value;
      if (
        typeof src === 'string' &&
        !src.endsWith('.css') &&
        !src.endsWith('.scss') &&
        !src.endsWith('.sass') &&
        !src.endsWith('.less')
      ) {
        rawImports.push(oxcNodeText(scriptContent, stmt));
      }
    } else if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration) {
      const decl = stmt.declaration;
      if (
        decl.type === 'TSTypeAliasDeclaration' ||
        decl.type === 'TSInterfaceDeclaration' ||
        decl.type === 'TSEnumDeclaration'
      ) {
        types.push(oxcNodeText(scriptContent, stmt));
        const id = (decl as { id?: { name?: string } }).id?.name;
        if (id) {
          typeNames.push(id);
        }
      }
    } else if (
      stmt.type === 'TSTypeAliasDeclaration' ||
      stmt.type === 'TSInterfaceDeclaration' ||
      stmt.type === 'TSEnumDeclaration'
    ) {
      types.push(`export ${oxcNodeText(scriptContent, stmt)}`);
      const id = (stmt as { id?: { name?: string } }).id?.name;
      if (id) {
        typeNames.push(id);
      }
    }
  }

  return { rawImports, types, typeNames };
}

/** Resolves public and neutral component names from script or AST. */
// skipcq: JS-R1005
function resolveComponentNames(
  parsed: OxcParsedModule,
  scriptContent: string,
  stem: string,
): { neutralName: string; publicName: string } {
  const baseFileName = path.basename(stem);
  const parts = baseFileName.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  let neutralName = parts.join('');

  const nameMatch = scriptContent.match(/defineOptions\(\{\s*name:\s*['"]([^'"]+)['"]/);
  if (nameMatch) {
    neutralName = nameMatch[1];
  } else {
    for (const stmt of parsed.program.body) {
      if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration) {
        const declarationNode = stmt.declaration as { id?: { name?: string }; type?: string };
        const id = declarationNode.id?.name;
        if (
          id &&
          (declarationNode.type === 'FunctionDeclaration' || declarationNode.type === 'ClassDeclaration') &&
          id.startsWith('Forge')
        ) {
          neutralName = id.endsWith('Element') ? id.slice(0, -'Element'.length) : id;
          break;
        }
      }
    }
  }

  const publicName = neutralName.startsWith('Forge') ? neutralName.slice(5) : neutralName;
  return { neutralName, publicName };
}

/** Resolves the properties type for a component based on type names and naming conventions. */
function resolveComponentPropsType(typeNames: string[], publicName: string, neutralName: string): string {
  const candidates = [
    `${publicName}Properties`,
    `${neutralName}Properties`,
    `Forge${publicName}Properties`,
    `${publicName}Props`,
    `${neutralName}Props`,
    `Forge${publicName}Props`,
    'Properties',
    'Props',
  ];
  let matchedProps = candidates.find((c) => typeNames.includes(c));
  if (!matchedProps) {
    matchedProps = typeNames.find(
      (t) =>
        (t.endsWith('Properties') || t.endsWith('Props')) &&
        !t.endsWith('StyleProperties') &&
        !t.endsWith('CSSProperties') &&
        !t.endsWith('StyleProps'),
    );
  }

  return matchedProps
    ? matchedProps.startsWith('Readonly<')
      ? matchedProps
      : `Readonly<${matchedProps}>`
    : 'Record<string, unknown>';
}

/** Adapts children property definitions in exported types for the target framework. */
function adaptTypesForFramework(types: string[], framework: JsxFramework): string[] {
  switch (framework) {
    case 'react':
    case 'solid':
    case 'vue': {
      return types.map((t) =>
        t.replace(/(?:^[ \t]*\/\*\*[\s\S]*?\*\/\r?\n)?[ \t]*children\s*\??\s*:[^;]+;\r?\n?/gm, ''),
      );
    }
    case 'svelte': {
      return types.map((t) => t.replace(/children\s*\??\s*:[^;]+;/g, 'children?: Snippet;'));
    }
    default: {
      return types;
    }
  }
}

/** Renders framework-specific imports and component declaration statements. */
// skipcq: JS-R1005
function renderFrameworkComponentDeclarations(
  framework: JsxFramework,
  neutralName: string,
  publicName: string,
  propsType: string,
  hasChildren: boolean,
  typesText: string,
): { frameworkImportLines: string[]; compLines: string[] } {
  const frameworkImportLines: string[] = [];
  const compLines: string[] = [];

  switch (framework) {
    case 'react': {
      const reactImports = ['FunctionComponent'];
      if (hasChildren) {
        reactImports.push('PropsWithChildren');
      }
      if (/\bReactNode\b/.test(typesText)) {
        reactImports.push('ReactNode');
      }
      if (/\bReactElement\b/.test(typesText)) {
        reactImports.push('ReactElement');
      }
      frameworkImportLines.push(`import type { ${reactImports.join(', ')} } from "react";`);

      const compType = hasChildren
        ? `FunctionComponent<PropsWithChildren<${propsType}>>`
        : `FunctionComponent<${propsType}>`;
      compLines.push(`export declare const ${neutralName}: ${compType};`);
      if (publicName !== neutralName) {
        compLines.push(`export { ${neutralName} as ${publicName} };`);
      }
      break;
    }
    case 'vue': {
      frameworkImportLines.push('import type { DefineComponent } from "vue";');
      compLines.push(`declare const _default: DefineComponent<${propsType}>;`);
      compLines.push('export default _default;');
      compLines.push(`export declare const ${neutralName}: DefineComponent<${propsType}>;`);
      if (publicName !== neutralName) {
        compLines.push(`export { ${neutralName} as ${publicName} };`);
      }
      break;
    }
    case 'svelte': {
      const svelteImports = ['Component'];
      if (hasChildren || /\bSnippet\b/.test(typesText)) {
        svelteImports.push('Snippet');
      }
      frameworkImportLines.push(`import type { ${svelteImports.join(', ')} } from "svelte";`);
      compLines.push(`declare const _default: Component<${propsType}>;`);
      compLines.push('export default _default;');
      compLines.push(`export declare const ${neutralName}: Component<${propsType}>;`);
      if (publicName !== neutralName) {
        compLines.push(`export { ${neutralName} as ${publicName} };`);
      }
      break;
    }
    case 'solid': {
      const solidImports = hasChildren ? ['ParentComponent'] : ['VoidComponent'];
      if (/\bJSX\b/.test(typesText)) {
        solidImports.push('JSX');
      }
      frameworkImportLines.push(`import type { ${solidImports.join(', ')} } from "solid-js";`);
      const compType = hasChildren ? `ParentComponent<${propsType}>` : `VoidComponent<${propsType}>`;
      compLines.push(`export declare const ${neutralName}: ${compType};`);
      if (publicName !== neutralName) {
        compLines.push(`export { ${neutralName} as ${publicName} };`);
      }
      break;
    }
    case 'web-components': {
      frameworkImportLines.push('import type { ForgeElement } from "@mission-platform/forge-adapters/web-components";');
      compLines.push(`declare const ${neutralName}Element_base: typeof ForgeElement;`);
      compLines.push(`export declare class ${neutralName}Element extends ${neutralName}Element_base {}`);
      compLines.push(`export declare const ${neutralName}: typeof ${neutralName}Element;`);
      if (publicName !== neutralName) {
        compLines.push(`export { ${neutralName} as ${publicName} };`);
      }
      break;
    }
    default: {
      break;
    }
  }

  return { frameworkImportLines, compLines };
}

/** Emits the TypeScript declaration file (.d.ts) for a framework-specific component. */
function emitComponentDeclaration(
  framework: JsxFramework,
  fullPath: string,
  generatedDirectory: string,
  emit: (fileName: string, source: string) => void,
): void {
  const relativePath = path.relative(generatedDirectory, fullPath).split(path.sep).join('/');
  const stem = relativePath.replace(/\.(?:tsx|ts|vue|svelte)$/, '');
  const source = readFileSync(fullPath, 'utf8');
  const scriptContent = extractScriptFromComponent(fullPath, source);

  let parsed: OxcParsedModule;
  try {
    parsed = parseOxcModule(fullPath, scriptContent);
  } catch {
    return;
  }

  const { rawImports, types: rawTypes, typeNames } = collectComponentAstDeclarations(parsed, scriptContent);
  const { neutralName, publicName } = resolveComponentNames(parsed, scriptContent, stem);
  const propsType = resolveComponentPropsType(typeNames, publicName, neutralName);

  const childrenPropPattern = /(?:^[ \t]*\/\*\*[\s\S]*?\*\/\r?\n)?[ \t]*children\s*\??\s*:[^;]+;\r?\n?/m;
  const hasChildren = rawTypes.some((t) => childrenPropPattern.test(t));
  const types = adaptTypesForFramework(rawTypes, framework);
  const typesText = types.join('\n');

  const { frameworkImportLines, compLines } = renderFrameworkComponentDeclarations(
    framework,
    neutralName,
    publicName,
    propsType,
    hasChildren,
    typesText,
  );

  const bodyText = `${typesText}\n${compLines.join('\n')}`;
  const filteredImports = filterReferencedImports(rawImports, bodyText);
  const lines: string[] = [...frameworkImportLines, ...filteredImports, ...types, ...compLines];
  emit(`${stem}.d.ts`, `${lines.filter(Boolean).join('\n')}\n`);
}

/** Converts an AST export statement into a TypeScript declaration line. */
// skipcq: JS-R1005
function convertExportStatementToDeclaration(stmt: OxcNode, source: string): string[] {
  const lines: string[] = [];
  if (stmt.type !== 'ExportNamedDeclaration') {
    return lines;
  }
  if (!stmt.declaration) {
    if (stmt.specifiers) {
      lines.push(oxcNodeText(source, stmt));
    }
    return lines;
  }

  const decl = stmt.declaration as {
    type?: string;
    start?: number;
    body?: { start?: number };
    declarations?: Array<{ id?: { name?: string; typeAnnotation?: unknown } }>;
  };
  switch (decl.type) {
    case 'TSTypeAliasDeclaration':
    case 'TSInterfaceDeclaration':
    case 'TSEnumDeclaration': {
      lines.push(oxcNodeText(source, stmt));
      break;
    }
    case 'FunctionDeclaration': {
      const body = decl.body;
      const sig =
        body?.start !== undefined ? `${source.slice(decl.start ?? 0, body.start).trim()};` : oxcNodeText(source, decl);
      lines.push(`export declare ${sig.replace(/^export\s+/, '')}`);
      break;
    }
    case 'VariableDeclaration': {
      for (const declarator of decl.declarations ?? []) {
        const id = declarator.id?.name;
        const typeAnnotation = declarator.id?.typeAnnotation;
        const typeText = typeAnnotation ? oxcNodeText(source, typeAnnotation) : ': any';
        lines.push(`export declare const ${id}${typeText};`);
      }
      break;
    }
    default: {
      break;
    }
  }
  return lines;
}

/** Synthesizes a TypeScript declaration file for utility and helper modules. */
// skipcq: JS-R1005
function emitUtilityDeclaration(
  fullPath: string,
  generatedDirectory: string,
  emit: (fileName: string, source: string) => void,
): void {
  const relativePath = path.relative(generatedDirectory, fullPath).split(path.sep).join('/');
  const stem = relativePath.replace(/\.ts$/, '');
  const source = readFileSync(fullPath, 'utf8');

  let parsed: OxcParsedModule;
  try {
    parsed = parseOxcModule(fullPath, source);
  } catch {
    return;
  }

  const lines: string[] = [];
  for (const stmt of parsed.program.body) {
    if (stmt.type === 'ImportDeclaration') {
      const sourceSpecifier = stmt.source?.value;
      if (
        typeof sourceSpecifier === 'string' &&
        !sourceSpecifier.endsWith('.css') &&
        !sourceSpecifier.endsWith('.scss') &&
        !sourceSpecifier.endsWith('.sass') &&
        !sourceSpecifier.endsWith('.less')
      ) {
        lines.push(oxcNodeText(source, stmt));
      }
    } else {
      lines.push(...convertExportStatementToDeclaration(stmt, source));
    }
  }

  emit(`${stem}.d.ts`, `${lines.join('\n')}\n`);
}

/** Formats export specifier names for a component barrel line in cached declarations. */
// skipcq: JS-R1005
function formatComponentExportSpecifiers(rawSpecifiers: readonly string[], framework: JsxFramework): string {
  const typeSpecs: string[] = [];
  const valueIds: string[] = [];
  for (const spec of rawSpecifiers) {
    if (spec.startsWith('type ')) {
      typeSpecs.push(spec);
    } else {
      const clean = spec.replace(/^default\s+as\s+/, '');
      const id = clean.split(/\s+as\s+/)[0];
      valueIds.push(id);
    }
  }

  const neutralName = valueIds.find((id) => id.startsWith('Forge')) ?? valueIds[0];
  const names = new Set<string>();
  if (neutralName) {
    const pub = neutralName.startsWith('Forge') ? neutralName.slice(5) : neutralName;
    names.add(neutralName);
    if (pub !== neutralName) {
      names.add(`${neutralName} as ${pub}`);
    }
    if (framework === 'vue' || framework === 'svelte') {
      names.add(`default as ${neutralName}`);
      if (pub !== neutralName) {
        names.add(`default as ${pub}`);
      }
    }
  }
  for (const typeSpec of typeSpecs) {
    names.add(typeSpec);
  }
  return [...names].join(', ');
}

/** Matches utility and style re-export statements within declaration files. */
const CACHED_UTIL_RE_EXPORT_PATTERN =
  /^export\s+\{([^}]+)\}\s+from\s+['"](\.\/(?:utils|composables|styles)\/[^'"]+)['"];?$/;

/** Formats a component re-export declaration for the target framework. */
function formatCachedComponentReExport(
  rawSpecifiersText: string,
  subPathWithExt: string,
  framework: JsxFramework,
): string {
  const rawSpecifiers = rawSpecifiersText.split(',').map((s) => s.trim());
  const subPath = subPathWithExt.replace(/\.(?:vue|svelte|tsx|ts)$/, '');
  const isTypeExport = rawSpecifiers.every((s) => s.startsWith('type '));
  if (isTypeExport) {
    return `export { ${rawSpecifiers.join(', ')} } from "./components/${subPath}";`;
  }
  const specifiers = formatComponentExportSpecifiers(rawSpecifiers, framework);
  return `export { ${specifiers} } from "./components/${subPath}";`;
}

/** Formats relative non-component re-exports to reference the parent directory. */
function formatCachedRelativeReExport(trimmed: string): string | undefined {
  const relativeExportMatch = trimmed.match(/^export\s+(.+?)\s+from\s+['"]\.\/([^'"]+)['"];?$/);
  if (relativeExportMatch) {
    return `export ${relativeExportMatch[1]} from "../${relativeExportMatch[2]}";`;
  }
  return trimmed.startsWith('export ') ? trimmed : undefined;
}

/** Formats or redirects an entry re-export line for framework declaration output. */
// skipcq: JS-R1005
function formatCachedEntryLine(trimmed: string, framework: JsxFramework): string | undefined {
  const compMatch = trimmed.match(/^export\s+\{([^}]+)\}\s+from\s+['"]\.\/components\/([^'"]+)['"];?$/);
  if (compMatch) {
    return formatCachedComponentReExport(compMatch[1], compMatch[2], framework);
  }
  if (CACHED_UTIL_RE_EXPORT_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return formatCachedRelativeReExport(trimmed);
}

/** Synthesizes an index.d.ts entry declaration file from a cached framework source index. */
// skipcq: JS-R1005
function emitEntryDeclarationFromCache(
  framework: JsxFramework,
  generatedDirectory: string,
  declarationFileName: string,
  emit: (fileName: string, source: string) => void,
): void {
  const candidateEntries = [path.join(generatedDirectory, 'index.tsx'), path.join(generatedDirectory, 'index.ts')];
  const entryFile = candidateEntries.find((f) => existsSync(f));
  if (!entryFile) {
    return;
  }

  const entrySource = readFileSync(entryFile, 'utf8');
  const lines = entrySource.split('\n');
  const outLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      continue;
    }
    const formatted = formatCachedEntryLine(trimmed, framework);
    if (formatted !== undefined) {
      outLines.push(formatted);
    }
  }

  emit(`${declarationFileName}.d.ts`, `${outLines.join('\n')}\n`);
}

/** Recursively emits component index declaration files from the source components directory. */
// skipcq: JS-R1005
function walkSourceIndexes(
  sourceComponentsDir: string,
  currentDir: string,
  emit: (fileName: string, source: string) => void,
  emittedIndexFiles: Set<string>,
): void {
  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkSourceIndexes(sourceComponentsDir, fullPath, emit, emittedIndexFiles);
    } else if (entry.isFile() && (entry.name === 'index.ts' || entry.name === 'index.tsx')) {
      const relFromComponents = path.relative(sourceComponentsDir, fullPath).split(path.sep).join('/');
      const outName =
        relFromComponents === 'index.ts' || relFromComponents === 'index.tsx'
          ? 'components/index.d.ts'
          : `components/${relFromComponents.replace(/\.tsx?$/, '.d.ts')}`;
      emit(outName, readFileSync(fullPath, 'utf8'));
      emittedIndexFiles.add(outName);
    }
  }
}

/** Recursively discovers and emits declarations for framework component files. */
// skipcq: JS-R1005
function walkFrameworkComponents(
  currentDir: string,
  generatedDirectory: string,
  framework: JsxFramework,
  emit: (fileName: string, source: string) => void,
  emittedIndexFiles: Set<string>,
): void {
  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkFrameworkComponents(fullPath, generatedDirectory, framework, emit, emittedIndexFiles);
    } else if (
      entry.isFile() &&
      /\.(?:tsx|ts|vue|svelte)$/.test(entry.name) &&
      !/\.(?:d\.ts|test\.[^.]+|spec\.[^.]+)$/.test(entry.name)
    ) {
      if (entry.name === 'index.ts' || entry.name === 'index.tsx') {
        const relFromGenerated = path.relative(generatedDirectory, fullPath).split(path.sep).join('/');
        const outName = relFromGenerated.replace(/\.tsx?$/, '.d.ts');
        if (!emittedIndexFiles.has(outName)) {
          emit(outName, readFileSync(fullPath, 'utf8'));
          emittedIndexFiles.add(outName);
        }
      } else {
        emitComponentDeclaration(framework, fullPath, generatedDirectory, emit);
      }
    }
  }
}

/** Recursively discovers and emits utility declarations in a helper directory. */
// skipcq: JS-R1005
function walkFrameworkUtils(
  currentDir: string,
  generatedDirectory: string,
  emit: (fileName: string, source: string) => void,
): void {
  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkFrameworkUtils(fullPath, generatedDirectory, emit);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      emitUtilityDeclaration(fullPath, generatedDirectory, emit);
    }
  }
}

/** Emits declarations for all cached framework source files. */
// skipcq: JS-R1005
function emitCachedFrameworkDeclarations(
  options: JsxComponentsEntryDtsOptions,
  emit: (fileName: string, source: string) => void,
): void {
  const generatedDirectory = options.generatedDirectory;
  if (!generatedDirectory) {
    return;
  }
  const framework = options.framework;

  const mpJsxTypesFile = path.join(generatedDirectory, 'mp-jsx-types.ts');
  if (existsSync(mpJsxTypesFile)) {
    emit('mp-jsx-types.d.ts', readFileSync(mpJsxTypesFile, 'utf8'));
  }

  const emittedIndexFiles = new Set<string>();

  // 1. Walk source components directory to emit component barrel index.d.ts files matching source index.ts
  const candidateSourceDirs = [
    options.componentsModule ? path.dirname(options.componentsModule) : undefined,
    options.sourceRoot ? path.join(options.sourceRoot, 'components') : undefined,
    options.sourceRoot,
    options.packageRoot ? path.join(options.packageRoot, 'src', 'components') : undefined,
    options.packageRoot ? path.join(options.packageRoot, 'src') : undefined,
  ];
  const sourceComponentsDir = candidateSourceDirs.find((d): d is string => d !== undefined && existsSync(d));
  if (sourceComponentsDir && existsSync(sourceComponentsDir)) {
    walkSourceIndexes(sourceComponentsDir, sourceComponentsDir, emit, emittedIndexFiles);
  }

  if (
    options.componentsModule &&
    existsSync(options.componentsModule) &&
    !emittedIndexFiles.has('components/index.d.ts')
  ) {
    emit('components/index.d.ts', readFileSync(options.componentsModule, 'utf8'));
    emittedIndexFiles.add('components/index.d.ts');
  }

  const componentsDir = path.join(generatedDirectory, 'components');
  if (existsSync(componentsDir)) {
    walkFrameworkComponents(componentsDir, generatedDirectory, framework, emit, emittedIndexFiles);
  }

  for (const subDir of ['utils', 'composables', 'styles']) {
    const dirPath = path.join(generatedDirectory, subDir);
    if (existsSync(dirPath)) {
      walkFrameworkUtils(dirPath, generatedDirectory, emit);
    }
  }

  emitEntryDeclarationFromCache(framework, generatedDirectory, options.declarationFileName ?? 'index', emit);
}

/** Emits neutral component declaration files copied from dist/components. */
// skipcq: JS-R1005
function emitNeutralDeclarationFiles(
  neutralComponentsDir: string,
  emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void,
): void {
  const hasTopLevelComponents = existsSync(path.join(neutralComponentsDir, 'components'));
  const declarationFiles = collectAllDeclarationFiles(neutralComponentsDir);

  for (const file of declarationFiles) {
    if (
      file.relativePath === 'index.d.ts' ||
      file.relativePath === 'index.d.mts' ||
      file.relativePath === 'index.d.cts'
    ) {
      if (!hasTopLevelComponents) {
        emitFile({
          type: 'asset',
          fileName: `components/${file.relativePath}`,
          source: readFileSync(file.fullPath, 'utf8'),
        });
      }
      continue;
    }

    if (hasTopLevelComponents || file.relativePath.startsWith('utils/') || file.relativePath.startsWith('styles/')) {
      emitFile({
        type: 'asset',
        fileName: file.relativePath,
        source: readFileSync(file.fullPath, 'utf8'),
      });
    } else {
      emitFile({
        type: 'asset',
        fileName: `components/${file.relativePath}`,
        source: readFileSync(file.fullPath, 'utf8'),
      });
    }
  }
}

/** Emits dynamically discovered entry declarations and neutral declaration files. */
function emitDiscoveredEntryDeclarations(
  context: { emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void },
  options: JsxComponentsEntryDtsOptions,
  declarationModule: string,
  stripPrefix: string,
): void {
  const { components, helpers, externalExports } = discoverGeneratedEntrySources(
    options.componentsModule,
    options.publicEntryModule,
    stripPrefix,
    options.sourceRoot,
  );
  context.emitFile({
    type: 'asset',
    fileName: `${options.declarationFileName}.d.ts`,
    source: generateEntryDeclaration(options.framework, declarationModule, components, helpers, externalExports),
  });

  const packageRoot =
    options.packageRoot ??
    (options.sourceRoot ? findPackageRoot(options.sourceRoot) : findPackageRoot(options.componentsModule));
  const neutralComponentsDir = resolveNeutralComponentsDirectory(packageRoot, options.outputRoot);
  if (neutralComponentsDir && existsSync(neutralComponentsDir)) {
    emitNeutralDeclarationFiles(neutralComponentsDir, (file) => context.emitFile(file));
  }
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
      if (options.generatedDirectory && existsSync(options.generatedDirectory)) {
        emitCachedFrameworkDeclarations(options, (fileName, source) => {
          this.emitFile({ type: 'asset', fileName, source });
        });
        return;
      }
      emitDiscoveredEntryDeclarations(this, options, declarationModule, stripPrefix);
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

/** Check whether a directory contains any TypeScript declaration files (.d.ts). */
// skipcq: JS-R1005
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

/** Resolves self-referencing path aliases mapping a package name to its neutral declaration index. */
// skipcq: JS-R1005
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

/** Safely parses JSON with comments (JSONC) text into a record object. */
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

/** Resolves the absolute file path to the TypeScript compiler binary (tsc.js). */
function resolveTscBin(): string {
  const packageJson = createRequire(import.meta.url).resolve('typescript/package.json');
  return path.join(path.dirname(packageJson), 'lib', 'tsc.js');
}

/** Resolves compiler option path aliases mapped to the generated directory. */
// skipcq: JS-R1005
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

/** Invokes tsc to emit genuine declaration files for JSX/TSX component trees. */
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

/** Emits TypeScript declarations for generated React components using tsc. */
function emitReactComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options);
}

/** Emits TypeScript declarations for generated Solid components using tsc. */
function emitSolidComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options, {
    jsx: 'preserve',
    jsxImportSource: 'solid-js',
  });
}

/** Emits TypeScript declarations for generated Web Components using tsc. */
function emitWebComponentsComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options);
}

/** Emits TypeScript declarations for generated Vue SFC components using vue-tsc. */
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

/** Validates whether svelte2tsx emitted usable declarations without dangling type references. */
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

/** Emits declarations for generated Svelte components using svelte2tsx or fallback synthesis. */
// skipcq: JS-R1005
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
    "jsxComponentsDtsPlugin: svelte2tsx's emitDts did not produce usable declarations (dangling props-type references in the generated .svelte.d.ts sidecars); falling back to the synthesised entry declaration for the Svelte build.",
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

/** Emits synthesised fallback entry declarations when native toolchains are not configured. */
function emitFallbackFrameworkDeclarations(
  context: { emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void },
  options: JsxComponentsDtsOptions,
): void {
  if (!options.componentsModule) {
    return;
  }
  const { components, helpers, externalExports } = discoverGeneratedEntrySources(
    options.componentsModule,
    options.publicEntryModule,
    'Forge',
    options.sourceRoot,
  );
  const dtsContent = generateEntryDeclaration(options.framework, './components', components, helpers, externalExports);
  context.emitFile({
    type: 'asset',
    fileName: 'index.d.ts',
    source: dtsContent,
  });
}

/** Dispatches declaration emission for the selected framework target. */
// skipcq: JS-R1005
async function dispatchFrameworkDeclarations(
  context: {
    warn: (message: string) => void;
    emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void;
  },
  options: JsxComponentsDtsOptions,
): Promise<void> {
  switch (options.framework) {
    case 'react': {
      emitReactComponentDeclarations.call(context, options);
      break;
    }
    case 'vue': {
      emitVueComponentDeclarations.call(context, options);
      break;
    }
    case 'solid': {
      emitSolidComponentDeclarations.call(context, options);
      break;
    }
    case 'web-components': {
      emitWebComponentsComponentDeclarations.call(context, options);
      break;
    }
    case 'svelte': {
      await emitSvelteComponentDeclarations.call(context, options);
      break;
    }
    default: {
      emitFallbackFrameworkDeclarations(context, options);
      break;
    }
  }
}

/**
 * A post-build Vite plugin that emits genuine, per-framework declarations
 * for a neutral components package's generated source tree.
 */
export function jsxComponentsDtsPlugin(options: JsxComponentsDtsOptions): Plugin {
  return {
    name: '@mission-platform/vite-plugin-forge:components-dts',
    async closeBundle() {
      await dispatchFrameworkDeclarations(this, options);
    },
  };
}
