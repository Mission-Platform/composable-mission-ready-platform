/**
 * Stage-1 driver + declaration synthesis for a neutral components package.
 *
 * {@link generateFrameworkSources} reads a package's neutral components barrel
 * (`src/components/index.ts`), compiles every component to the target framework
 * (React `.tsx` / Vue `.vue`) with {@link compileComponentModule}, writes them as
 * a **flat** generated tree plus a public entry module, and returns that entry
 * path so it can be handed straight to Vite's `lib.entry`. Stage 2 (the
 * framework's own Vite plugins) then compiles that tree natively.
 *
 * Because the generated entry is not a source file `tsc` sees, its public
 * `./react` / `./vue` declarations would be missing — {@link jsxComponentsEntryDtsPlugin}
 * synthesises them at build time from the same neutral barrel, importing the
 * props types from the neutral components' own emitted declarations.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { emitDts } from 'svelte2tsx';
import ts from 'typescript';

import {
  LOCAL_EFFECT_FILE,
  LOCAL_JSX_TYPES_FILE,
  localEffectModuleSource,
  localJsxTypesModuleSource,
  moduleTargetsFramework,
  parseTsx,
  readComponentImports,
  readNeutralImports,
  readStyleImports,
} from './compiler/ast.js';
import { compileComponentModule, compileHookModule, type JsxFramework } from './compiler/compile.js';
import {
  discoverComponents,
  discoverHelperExports,
  type DiscoveredComponent,
  type DiscoveredHelperExport,
} from './compiler/discover.js';
import {
  analyzeStoryblokComponent,
  emitBlokDataType,
  emitStoryblokBlokWrapper,
  type AnalyzedStoryblokComponent,
  type StoryblokComponent,
  // eslint-disable-next-line import-x/no-useless-path-segments -- explicit `/index.js` keeps the directory barrel resolvable by Node ESM at runtime
} from './generators/storyblok/index.js';

import type { Plugin } from 'vite';

/**
 * Retry options for the recursive `rmSync` that wipes a generated tree before a
 * fresh Stage-1 emit.
 *
 * A recursive delete drains the tree entry-by-entry and then `rmdir`s the
 * directory; if the tree is still being touched — a sibling framework build
 * writing under the same package's `node_modules/.cache`, or macOS/APFS lag
 * (Spotlight, fsevents) — the final `rmdir` intermittently fails with
 * `ENOTEMPTY` (also `EBUSY`/`EPERM`). Node's built-in linear backoff retries the
 * operation on exactly those errors, turning a hard crash into a transient
 * settle-and-retry.
 */
const RM_RETRY_OPTIONS = { maxRetries: 5, retryDelay: 100 } as const;

/** Options for {@link generateFrameworkSources}. */
export interface GenerateFrameworkSourcesOptions {
  /** Target framework the neutral components are compiled to. */
  framework: JsxFramework;
  /** Absolute path of the neutral components barrel (e.g. `src/components/index.ts`). */
  componentsModule: string;
  /** Absolute path of the directory the generated sources + entry are written to. */
  outDir: string;
  /** Prefix stripped from each neutral export name to form its public name. Defaults to `Forge`. */
  stripPrefix?: string;
}

/** Re-export one helper module's value + type bindings from the mirrored tree. */
function helperReExportLine(helper: DiscoveredHelperExport): string {
  const names = [...helper.values, ...helper.types.map((type) => `type ${type}`)];
  const relativePath = helper.relativePath
    .replace(/^\.\//, '')
    .replace(/^\.\.\//, '')
    .replace(/^components\//, '');
  return `export { ${names.join(', ')} } from './${relativePath}';`;
}

/**
 * Re-export one compiled component under a given export name.
 *
 * React re-exports the neutral function binding (`ForgeBadge`) under the target
 * name; Vue re-exports the SFC's `default` export.
 */
function componentReExportLine(framework: JsxFramework, component: DiscoveredComponent, as: string): string {
  if (framework === 'vue') {
    return `export { default as ${as} } from './${component.folder}.vue';`;
  }
  if (framework === 'svelte') {
    return `export { default as ${as} } from './${component.folder}.svelte';`;
  }
  if (framework === 'web-components') {
    return `export { ${component.neutralName}Element as ${as} } from './${component.folder}';`;
  }
  return `export { ${component.neutralName} as ${as} } from './${component.folder}';`;
}

/**
 * Where a companion type is actually declared in the generated **flat** tree.
 *
 * A type re-exported alongside a component in the neutral barrel may be declared
 * either in the component's own module (`isComponent: true`, e.g. `AccordionSize`)
 * or in a sibling **helper** module carried into the flat tree (`isComponent:
 * false`, e.g. `DateRange` from `date-time`). The re-export must point at the
 * module that truly exports it, so it is neither dangling nor lost.
 */
export interface TypeOrigin {
  /** The flat-tree module base that exports the type (a component folder or a copied helper). */
  base: string;
  /** `true` when the base is a compiled component (Vue → `./<base>.vue`); `false` for a plain helper (`./<base>`). */
  isComponent: boolean;
}

/** Resolve which flat-tree module a component's companion type is declared in, or `undefined` if unresolved. */
export type TypeOriginResolver = (folder: string, typeName: string) => TypeOrigin | undefined;

/**
 * Default {@link TypeOriginResolver}: assume every companion type is declared in
 * its own component's module. The full driver ({@link generateFrameworkSources})
 * supplies an origin-accurate resolver instead; this keeps {@link generateEntry}
 * usable in isolation (e.g. unit tests) where the common case holds.
 */
const defaultTypeOriginResolver: TypeOriginResolver = (folder) => ({ base: folder, isComponent: true });

/**
 * Re-export a group of public **types** from the flat-tree module that declares
 * them, so they ride through the package entry — and therefore through the `tsc`
 * / `vue-tsc`-emitted `index.d.ts` — exactly as the neutral barrel exports them.
 * A component's own module carries them as declared (React `.tsx`) or `export`ed
 * `<script setup>` declarations (Vue `.vue`); a helper module (`isComponent:
 * false`) is a plain `.ts` re-exported without the `.vue` suffix.
 */
function componentTypesReExportLine(framework: JsxFramework, origin: TypeOrigin, types: readonly string[]): string {
  const ext = framework === 'vue' ? '.vue' : framework === 'svelte' ? '.svelte' : '';
  const specifier = origin.isComponent ? `./${origin.base}${ext}` : `./${origin.base}`;
  const names = types.map((type) => `type ${type}`).join(', ');
  return `export { ${names} } from '${specifier}';`;
}

/**
 * Generate the public entry module re-exporting each compiled component under
 * both its public name (`Badge`) **and** its neutral `Base`-prefixed name
 * (`ForgeBadge`), so the package can be consumed under either convention. Every
 * public **type** a component ships alongside it (variants, option shapes, props
 * interfaces, …) is re-exported too — from the flat-tree module that actually
 * declares it (via {@link TypeOriginResolver}) — so the entry, and the
 * declaration emitted from it, carries the full public surface the neutral
 * barrel exposes, not just the component bindings.
 */
export function generateEntry(
  framework: JsxFramework,
  components: readonly DiscoveredComponent[],
  helpers: readonly DiscoveredHelperExport[] = [],
  resolveTypeOrigin: TypeOriginResolver = defaultTypeOriginResolver,
): string {
  const componentLines = components.flatMap((component) => {
    const lines = [componentReExportLine(framework, component, component.publicName)];
    // Also ship the neutral `Base*` name as an alias of the same component.
    if (component.neutralName !== component.publicName) {
      lines.push(componentReExportLine(framework, component, component.neutralName));
    }
    return lines;
  });
  // Group each component's companion types by the flat-tree module that truly
  // declares them (their own module, or a copied helper such as `date-time`), so
  // no re-export dangles and types shared by that module collapse to one line.
  // Insertion order is preserved; a type that resolves nowhere is skipped rather
  // than emitted as a broken re-export.
  const typesByModule = new Map<string, { origin: TypeOrigin; types: string[] }>();
  for (const component of components) {
    for (const type of component.typeExports) {
      const origin = resolveTypeOrigin(component.folder, type);
      if (origin === undefined) {
        continue;
      }
      const group = typesByModule.get(origin.base) ?? { origin, types: [] };
      if (!group.types.includes(type)) {
        group.types.push(type);
      }
      typesByModule.set(origin.base, group);
    }
  }
  const typeLines = [...typesByModule.values()].map((group) =>
    componentTypesReExportLine(framework, group.origin, group.types),
  );
  // Forward shared helper-module APIs (e.g. the toast store) so consumers drive
  // the same per-framework singleton the components use.
  const helperLines = helpers.map((helper) => helperReExportLine(helper));
  return `${[...componentLines, ...typeLines, ...helperLines].join('\n')}\n`;
}

/**
 * Collect the **type** names a module exports — declared exported type aliases,
 * interfaces and enums, plus the members of any named `export { type … }` /
 * `export type { … } from '…'` statement. Used to resolve which flat-tree module
 * a companion type is actually declared in (a component's own module, or a
 * sibling helper such as `date-time`), so the entry re-exports it from there.
 */
function readExportedTypeNames(parsed: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const isExported = (node: ts.HasModifiers): boolean =>
    (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
  for (const statement of parsed.statements) {
    if (
      (ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      isExported(statement)
    ) {
      names.add(statement.name.text);
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        if (statement.isTypeOnly || element.isTypeOnly) {
          names.add(element.name.text);
        }
      }
    }
  }
  return names;
}

/**
 * The name of the first exported PascalCase function declaration in a module —
 * a neutral component's function. Used to discover co-located **sibling
 * components** authored beside a primary in the same folder.
 */
function findExportedComponentName(sourceFile: ts.SourceFile): string | undefined {
  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name !== undefined &&
      /^[A-Z]/.test(statement.name.text) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
    ) {
      return statement.name.text;
    }
  }
  return undefined;
}

/**
 * Compile a neutral components package to its per-framework source tree (Stage 1),
 * returning the generated entry module path.
 */
export function generateFrameworkSources(options: GenerateFrameworkSourcesOptions): string {
  const stripPrefix = options.stripPrefix ?? 'Forge';
  const componentsDir = path.dirname(options.componentsModule);
  const sourceRoot = path.dirname(componentsDir);
  // Framework-gated components (opening with a `"use react";` / `"use vue";`
  // directive) are emitted only for the framework they target; drop the rest so
  // they neither compile nor get re-exported from this framework's entry.
  const components = discoverComponents(readFileSync(options.componentsModule, 'utf8'), stripPrefix).filter(
    (component) => {
      const sourcePath = path.join(componentsDir, component.sourceDir, `${component.folder}.tsx`);
      return moduleTargetsFramework(parseTsx(sourcePath, readFileSync(sourcePath, 'utf8')), options.framework);
    },
  );
  // The folder bases of every discovered component — used to tell sibling
  // **component** imports (rendered as Vue `./<base>.vue` children) apart from
  // plain **helper module** imports (kept as named `./<base>` imports and copied
  // verbatim into the flat tree below).
  const componentFolders = new Set(components.map((component) => component.folder));

  rmSync(options.outDir, { recursive: true, force: true, ...RM_RETRY_OPTIONS });
  mkdirSync(options.outDir, { recursive: true });

  // Locale declarations augment i18next's selector types ambiently, so they
  // cannot be discovered by following the components' explicit imports. Carry
  // them into the Stage-2 source tree where tsc / vue-tsc includes them.
  const localesDir = path.join(path.dirname(componentsDir), 'locales');
  if (existsSync(localesDir)) {
    cpSync(localesDir, path.join(options.outDir, 'locales'), { recursive: true });
  }

  // Type-origin resolution inputs (see `generateEntry`'s `TypeOriginResolver`):
  // the type names each component's own module declares, and those each copied
  // helper module exports — so a companion type re-exported in the barrel is
  // re-exported from the flat-tree module that actually declares it.
  const componentOwnTypes = new Map<string, Set<string>>();
  const helperExportedTypes = new Map<string, Set<string>>();

  // Structure-preserving cache: every generated module is written under its
  // source-relative directory (`<outDir>/<sourceDir>/…`) instead of a flat tree.
  // A registry maps each module's base name to its mirrored directory (POSIX,
  // `''` = tree root) so the generators' flat `./<base>` import specifiers — and
  // the entry barrel's — can be rewritten to the correct nested relative path in
  // a final pass, leaving each generator's own emitter untouched.
  const moduleRegistry = new Map<string, { dir: string; file: string }>();
  const rewriteTargets: { file: string; dir: string }[] = [];
  const toPosix = (value: string): string => value.split(path.sep).join('/');
  const normaliseDir = (dir: string): string => (dir === '.' || dir === '' ? '' : toPosix(dir));
  // The mirrored directory (relative to the tree root) a source file maps to. A
  // path outside the components dir (a distant shared helper) is clamped to the
  // root so nothing is ever written outside `outDir`.
  const mirrorDir = (sourceAbsPath: string): string => {
    const relative = toPosix(path.relative(componentsDir, path.dirname(sourceAbsPath)));
    return relative.startsWith('..') ? '' : normaliseDir(relative);
  };
  const mirrorHelperDir = (sourceAbsPath: string): string => {
    const relativeToComponents = toPosix(path.relative(componentsDir, path.dirname(sourceAbsPath)));
    if (!relativeToComponents.startsWith('..')) {
      return normaliseDir(relativeToComponents);
    }
    const relativeToSource = toPosix(path.relative(sourceRoot, path.dirname(sourceAbsPath)));
    return relativeToSource.startsWith('..') ? '' : normaliseDir(relativeToSource);
  };
  const KNOWN_MODULE_EXT = /(\.d\.ts|\.module\.scss|\.module\.css|\.vue|\.svelte|\.tsx|\.ts|\.jsx|\.js|\.scss|\.css)$/;
  const moduleBase = (fileName: string): string => fileName.replace(KNOWN_MODULE_EXT, '');
  // Write a generated module under its mirrored directory, register its base →
  // dir, and mark it for the import-rewrite pass.
  const writeModule = (dir: string, fileName: string, code: string): void => {
    const normalised = normaliseDir(dir);
    const destination = path.join(options.outDir, normalised, fileName);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, code, 'utf8');
    moduleRegistry.set(moduleBase(fileName), { dir: normalised, file: fileName });
    rewriteTargets.push({ file: destination, dir: normalised });
  };
  // Copy a static asset (e.g. a stylesheet) under its mirrored directory and
  // register its base so importers resolve to the nested location.
  const copyAsset = (dir: string, fileName: string, sourcePath: string): void => {
    const normalised = normaliseDir(dir);
    const destination = path.join(options.outDir, normalised, fileName);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(sourcePath, destination);
    moduleRegistry.set(moduleBase(fileName), { dir: normalised, file: fileName });
  };
  // Resolve a flat `./<base>[.ext]` specifier, encountered in a module living in
  // `fromDir`, to the nested relative path of its registered target.
  const relSpecifier = (fromDir: string, targetDir: string, fileName: string): string => {
    const rel = path.posix.relative(fromDir, path.posix.join(targetDir, fileName));
    return rel.startsWith('.') ? rel : `./${rel}`;
  };
  const rewriteFlatImports = (code: string, fromDir: string): string => {
    const rewrite = (specifier: string): string => {
      const rest = specifier.slice(2);
      const fileName = path.posix.basename(rest);
      const target = moduleRegistry.get(moduleBase(fileName));
      if (target === undefined) {
        return specifier;
      }
      const targetFile = path.extname(fileName) !== '' ? target.file : moduleBase(target.file);
      return relSpecifier(fromDir, target.dir, targetFile);
    };
    return code
      .replace(
        /(\bfrom\s+)(['"])(\.\/[^'"]+)(['"])/g,
        (_match, pre, quote, specifier) => `${pre}${quote}${rewrite(specifier)}${quote}`,
      )
      .replace(
        /(\bimport\s+)(['"])(\.\/[^'"]+)(['"])/g,
        (_match, pre, quote, specifier) => `${pre}${quote}${rewrite(specifier)}${quote}`,
      );
  };

  // Carry a shared **helper module** (a relative value import that is not itself
  // a component) into the flat generated tree so the re-pointed `./<base>` import
  // resolves at Stage 2. A helper that authors against `@mission-platform/forge`
  // (a composable or a `createContext` module) is a *neutral* module, so it is
  // compiled per-framework via {@link compileHookModule} (React `.tsx` / Vue
  // `.ts`) just like a hook-library module; a purely framework-agnostic helper
  // (no neutral/JSX import — e.g. a ported store) is copied verbatim. Either way
  // the helper's own relative (non-component) imports are carried transitively,
  // so a composable that reads another composable or a shared context resolves.
  const carriedHelpers = new Set<string>();
  const carryHelperModule = (sourcePath: string): void => {
    const sourceKey = path.resolve(sourcePath);
    if (carriedHelpers.has(sourceKey)) {
      return;
    }
    carriedHelpers.add(sourceKey);

    if (path.basename(sourcePath, path.extname(sourcePath)) === 'index') {
      const helperDirectory = path.dirname(sourcePath);
      const helperBase = path.basename(helperDirectory);
      const helperDir = mirrorHelperDir(sourcePath);
      const indexSource = readFileSync(sourcePath, 'utf8');
      const indexParsed = parseTsx(sourcePath, indexSource);
      const indexNeutral = readNeutralImports(indexParsed);
      if (indexNeutral.values.length > 0 || indexNeutral.types.length > 0) {
        const compiled = compileHookModule(indexSource, { framework: options.framework, fileName: sourcePath });
        writeModule(helperDir, `index.${compiled.lang}`, compiled.code);
      } else {
        writeModule(helperDir, 'index.ts', indexSource);
      }
      helperExportedTypes.set('index', readExportedTypeNames(indexParsed));
      for (const entry of readdirSync(helperDirectory, { withFileTypes: true })) {
        if (!entry.isFile() || !/\.(?:ts|tsx)$/.test(entry.name) || /(?:\.spec|\.test)\.(?:ts|tsx)$/.test(entry.name)) {
          continue;
        }
        carryHelperModule(path.join(helperDirectory, entry.name));
      }
      const helperParent = path.posix.dirname(toPosix(helperDir));
      const aliasPath = path.join(options.outDir, helperParent, `${helperBase}.ts`);
      mkdirSync(path.dirname(aliasPath), { recursive: true });
      writeFileSync(aliasPath, `export * from './${helperBase}/index';\n`, 'utf8');
      moduleRegistry.set(helperBase, { dir: helperDir, file: helperBase });
      return;
    }
    const base = path.basename(sourcePath, path.extname(sourcePath));

    const source = readFileSync(sourcePath, 'utf8');
    const parsed = parseTsx(sourcePath, source);
    const neutral = readNeutralImports(parsed);
    const usesNeutral = neutral.values.length > 0 || neutral.types.length > 0;
    if (usesNeutral) {
      const compiled = compileHookModule(source, { framework: options.framework, fileName: sourcePath });
      writeModule(mirrorHelperDir(sourcePath), `${base}.${compiled.lang}`, compiled.code);
    } else {
      // Verbatim helpers keep their authored relative imports; the mirrored tree
      // makes `../`-climbing specifiers resolve as-is, and any flat `./sibling`
      // is nested by the shared rewrite pass below.
      writeModule(mirrorHelperDir(sourcePath), path.basename(sourcePath), source);
    }

    // Record the helper's exported types so companion types declared there
    // resolve to it rather than dangling off a component module.
    if (!helperExportedTypes.has(base)) {
      helperExportedTypes.set(base, readExportedTypeNames(parsed));
    }

    // Follow the helper's own relative (non-component) imports transitively.
    const helperDir = path.dirname(sourcePath);
    for (const relativeImport of readComponentImports(parsed)) {
      if (componentFolders.has(relativeImport.base)) {
        continue;
      }
      for (const extension of ['ts', 'tsx'] as const) {
        const nestedPath = path.join(helperDir, `${relativeImport.specifier}.${extension}`);
        if (existsSync(nestedPath)) {
          carryHelperModule(nestedPath);
          break;
        }
        const nestedIndexPath = path.join(helperDir, relativeImport.specifier, `index.${extension}`);
        if (existsSync(nestedIndexPath)) {
          carryHelperModule(nestedIndexPath);
          break;
        }
      }
    }
  };

  // Discover co-located **sibling components**: a component folder may ship
  // focused child components authored beside the primary (e.g. `forge-tree-view/`
  // holds `forge-tree-view.tsx` + `forge-tree-view-item.tsx`). They are not
  // re-exported from the package barrel, so they are found by following each
  // component's relative **PascalCase** value imports to a co-located neutral
  // component `.tsx`, then compiled as first-class components. Their folder base
  // is added to `componentFolders` so the parent's `<Child/>` tag (and the
  // child's own recursion) resolves to a sibling component, not a helper.
  const siblingComponents: DiscoveredComponent[] = [];
  const discoveredFolders = new Set(components.map((component) => component.folder));
  const discoveryQueue: DiscoveredComponent[] = [...components];
  while (discoveryQueue.length > 0) {
    const current = discoveryQueue.shift() as DiscoveredComponent;
    const currentDir = path.join(componentsDir, current.sourceDir);
    const currentPath = path.join(currentDir, `${current.folder}.tsx`);
    if (!existsSync(currentPath)) {
      continue;
    }
    const currentParsed = parseTsx(currentPath, readFileSync(currentPath, 'utf8'));
    for (const relativeImport of readComponentImports(currentParsed)) {
      if (discoveredFolders.has(relativeImport.base) || !relativeImport.names.some((name) => /^[A-Z]/.test(name))) {
        continue;
      }
      const childPath = path.resolve(currentDir, `${relativeImport.specifier}.tsx`);
      if (!existsSync(childPath)) {
        continue;
      }
      const childParsed = parseTsx(childPath, readFileSync(childPath, 'utf8'));
      const childNeutral = readNeutralImports(childParsed);
      const childName = findExportedComponentName(childParsed);
      if (
        (childNeutral.values.length === 0 && childNeutral.types.length === 0) ||
        childName === undefined ||
        !moduleTargetsFramework(childParsed, options.framework)
      ) {
        continue;
      }
      const childPublicName = childName.startsWith(stripPrefix) ? childName.slice(stripPrefix.length) : childName;
      const childCandidate = `${childPublicName}Properties`;
      const childTypeNames = readExportedTypeNames(childParsed);
      const child: DiscoveredComponent = {
        neutralName: childName,
        publicName: childPublicName,
        propertiesType: childTypeNames.has(childCandidate) ? childCandidate : undefined,
        typeExports: [...childTypeNames],
        folder: relativeImport.base,
        sourceDir: toPosix(path.relative(componentsDir, path.dirname(childPath))),
      };
      discoveredFolders.add(child.folder);
      componentFolders.add(child.folder);
      siblingComponents.push(child);
      discoveryQueue.push(child);
    }
  }

  // Primaries are compiled + re-exported from the entry; sibling components are
  // compiled too (so their `.vue`/`.tsx`/… module exists), but stay off the
  // public entry barrel — they are internal children of their primary.
  for (const component of [...components, ...siblingComponents]) {
    const componentDir = path.join(componentsDir, component.sourceDir);
    const sourcePath = path.join(componentDir, `${component.folder}.tsx`);
    const source = readFileSync(sourcePath, 'utf8');
    const parsed = parseTsx(sourcePath, source);
    componentOwnTypes.set(component.folder, readExportedTypeNames(parsed));
    const compiled = compileComponentModule(source, {
      framework: options.framework,
      componentName: component.neutralName,
      fileName: sourcePath,
      componentFolders,
    });
    writeModule(component.sourceDir, `${component.folder}.${compiled.lang}`, compiled.code);

    // Auxiliary SFCs the emitter generated alongside the primary module (e.g. a
    // recursive helper component extracted from a self-recursive render helper)
    // are written next to it in the flat tree so Stage 2 compiles them and the
    // primary SFC's `./<name>.vue` import resolves.
    for (const extra of compiled.extraModules ?? []) {
      writeModule(component.sourceDir, `${extra.name}.${extra.lang}`, extra.code);
    }

    // Carry each shared **helper module** the component imports (a relative value
    // import that is not itself a component) into the flat generated tree via the
    // recursive carrier, which compiles neutral composables/context per-framework
    // and copies framework-agnostic helpers verbatim (transitively).
    for (const relativeImport of readComponentImports(parsed)) {
      if (componentFolders.has(relativeImport.base)) {
        continue;
      }
      for (const extension of ['ts', 'tsx'] as const) {
        const helperPath = path.join(componentDir, `${relativeImport.specifier}.${extension}`);
        if (existsSync(helperPath)) {
          carryHelperModule(helperPath);
          break;
        }
        const helperIndexPath = path.join(componentDir, relativeImport.specifier, `index.${extension}`);
        if (existsSync(helperIndexPath)) {
          carryHelperModule(helperIndexPath);
          break;
        }
      }
    }

    // Carry each component's own stylesheet (e.g. its CSS Module) into the flat
    // generated tree so the re-pointed `./<base>` import resolves at Stage 2 and
    // the component ships its own CSS. The Vue emitter inlines CSS-Module imports
    // (default import) directly as an SFC `<style>` block, so those are not
    // copied for Vue; bare side-effect CSS imports (and all React imports) still are.
    for (const styleImport of readStyleImports(parsed)) {
      const inlinedInVueSfc = options.framework === 'vue' && styleImport.name !== undefined;
      if (inlinedInVueSfc) {
        continue;
      }
      const stylePath = path.join(componentDir, styleImport.specifier);
      if (existsSync(stylePath)) {
        copyAsset(mirrorDir(stylePath), styleImport.base, stylePath);
      }
    }
  }

  // Shared helper modules re-exported from the barrel (e.g. the toast store) are
  // forwarded through the entry; their source files are already carried into the
  // flat tree by the per-component helper-import copy above.
  const helpers = discoverHelperExports(readFileSync(options.componentsModule, 'utf8'), componentFolders);
  for (const helper of helpers) {
    const helperCandidates = [
      path.resolve(componentsDir, helper.relativePath),
      path.resolve(sourceRoot, helper.relativePath),
      path.resolve(sourceRoot, helper.relativePath.replace(/^components\//, '')),
    ];
    const helperBase = helperCandidates.find((candidate) =>
      ['ts', 'tsx'].some(
        (extension) =>
          existsSync(`${candidate}.${extension}`) || existsSync(path.join(candidate, `index.${extension}`)),
      ),
    );
    if (helperBase === undefined) {
      continue;
    }
    for (const extension of ['ts', 'tsx'] as const) {
      const helperFile = `${helperBase}.${extension}`;
      const helperIndex = path.join(helperBase, `index.${extension}`);
      if (existsSync(helperFile)) {
        carryHelperModule(helperFile);
        break;
      }
      if (existsSync(helperIndex)) {
        carryHelperModule(helperIndex);
        break;
      }
    }
  }

  // The co-located local JSX types module: framework-specific variants of the
  // neutral render/props primitives (`MpProperties`, `MpRenderProperty`) the
  // emitters redirect those two type imports to (see `LOCAL_JSX_TYPE_NAMES`), so
  // the generated components carry no neutral `@mission-platform/forge` render/props
  // type import. Written once per tree; only referenced via `import type`, so it
  // adds no runtime chunk and simply emits its own `.d.ts` alongside the build.
  writeModule('', LOCAL_JSX_TYPES_FILE, localJsxTypesModuleSource(options.framework));

  // The co-located effect helper module: the Vue-only generalised watcher
  // (`mpEffect`) the Vue emitter routes every `useEffect` through (built on
  // native `watch`/lifecycle). Written once per tree, exactly like the local JSX
  // types module. It is Vue-only, so `localEffectModuleSource` returns an empty
  // string for React and nothing is written for the React build.
  const effectModuleSource = localEffectModuleSource(options.framework);
  if (effectModuleSource.length > 0) {
    writeModule('', LOCAL_EFFECT_FILE, effectModuleSource);
  }

  // Resolve each companion type to the flat-tree module that declares it: the
  // component's own module if it declares the type, else the first copied helper
  // that exports it; unresolved types are skipped (never re-exported broken).
  const resolveTypeOrigin: TypeOriginResolver = (folder, typeName) => {
    if (componentOwnTypes.get(folder)?.has(typeName)) {
      return { base: folder, isComponent: true };
    }
    for (const [base, types] of helperExportedTypes) {
      if (types.has(typeName)) {
        return { base, isComponent: false };
      }
    }
    return undefined;
  };

  const entryFile = path.join(options.outDir, options.framework === 'react' ? 'index.tsx' : 'index.ts');
  writeFileSync(entryFile, generateEntry(options.framework, components, helpers, resolveTypeOrigin), 'utf8');
  rewriteTargets.push({ file: entryFile, dir: '' });

  // Final pass: rewrite every generated module's (and the entry's) flat
  // `./<base>` import specifiers to the nested relative path of the mirrored
  // tree, so imports still resolve now that files are no longer co-located.
  for (const target of rewriteTargets) {
    const code = readFileSync(target.file, 'utf8');
    const rewritten = rewriteFlatImports(code, target.dir);
    if (rewritten !== code) {
      writeFileSync(target.file, rewritten, 'utf8');
    }
  }
  return entryFile;
}

/** Options for {@link generateStoryblokBloks}. */
export interface GenerateStoryblokBloksOptions {
  /**
   * Framework the emitted blok wrappers target (`react`/`solid` → `.tsx`,
   * `vue` → `.vue`, `svelte` → `.svelte`, `web-components` → `.ts`).
   */
  framework: JsxFramework;
  /** Absolute path of the neutral components barrel (e.g. `src/components/index.ts`). */
  componentsModule: string;
  /** Absolute path of the directory the JSON config, wrappers, and entry are written to. */
  outDir: string;
  /**
   * Import specifier the generated wrappers import the **built** framework
   * components from, e.g. `@mission-platform/components`.
   */
  componentsImport: string;
  /** Prefix stripped from each neutral export name to form its public name. Defaults to `Forge`. */
  stripPrefix?: string;
}

/** Generate the entry barrel re-exporting each generated blok wrapper. */
function generateBlokEntry(framework: JsxFramework, components: readonly DiscoveredComponent[]): string {
  const lines = components.map((component) => {
    switch (framework) {
      // Vue/Svelte SFC wrappers export the component as the module default.
      case 'vue': {
        return `export { default as ${component.publicName}Blok } from './${component.folder}.vue';`;
      }
      case 'svelte': {
        return `export { default as ${component.publicName}Blok } from './${component.folder}.svelte';`;
      }
      // React/Solid `.tsx` and the Web-Component `.ts` wrapper are named exports.
      default: {
        return `export { ${component.publicName}Blok } from './${component.folder}';`;
      }
    }
  });
  return `${lines.join('\n')}\n`;
}

/** The generated blok-wrapper file extension for each target framework. */
const BLOK_WRAPPER_LANG: Readonly<Record<JsxFramework, string>> = {
  react: 'tsx',
  vue: 'vue',
  solid: 'tsx',
  svelte: 'svelte',
  'web-components': 'ts',
};

/** A generated blok wrapper paired with the analysis its declaration is derived from. */
interface AnalyzedBlok {
  /** The public component name (e.g. `Badge`); the wrapper exports `<publicName>Blok`. */
  publicName: string;
  /** The component's Storyblok analysis, used to type the wrapper's `blok` prop. */
  analyzed: AnalyzedStoryblokComponent;
}

/** Per-framework imports for the synthesised blok-wrapper declarations. */
const BLOK_DECLARATION = {
  react: { componentType: 'FunctionComponent', frameworkImport: 'react', storyblokImport: '@storyblok/react' },
  vue: { componentType: 'DefineComponent', frameworkImport: 'vue', storyblokImport: '@storyblok/vue' },
  svelte: { componentType: 'any', frameworkImport: 'svelte', storyblokImport: '@storyblok/svelte' },
  solid: { componentType: 'Component', frameworkImport: 'solid-js', storyblokImport: '@storyblok/solid' },
  'web-components': { componentType: 'any', frameworkImport: 'ts', storyblokImport: '@storyblok/js' },
} as const;

/**
 * Synthesise the generated blok-wrapper entry's `index.d.ts`.
 *
 * The generated entry barrel is not a `tsc`-visible source file, so — as for the
 * framework entries — its declarations are synthesised here. Every wrapper is a
 * framework component taking a single Storyblok `blok` prop, but that prop is now
 * **precisely typed** via {@link emitBlokDataType} (`SbBlokData & { … }`, one
 * member per schema field) instead of an open `Record<string, unknown>`.
 */
function generateBlokEntryDeclarations(framework: JsxFramework, bloks: readonly AnalyzedBlok[]): string {
  const { componentType, frameworkImport, storyblokImport } = BLOK_DECLARATION[framework];
  return [
    `import type { ${componentType} } from '${frameworkImport}';`,
    `import type { SbBlokData } from '${storyblokImport}';`,
    ``,
    ...bloks.map(
      ({ publicName, analyzed }) =>
        `export declare const ${publicName}Blok: ${componentType}<{ blok: ${emitBlokDataType(analyzed)} }>;`,
    ),
    ``,
  ].join('\n');
}

/**
 * Project a neutral components package onto **Storyblok** (Stage 1).
 *
 * For every component this writes, into {@link GenerateStoryblokBloksOptions.outDir}:
 *
 * - `<folder>.json` — the Storyblok *component object* (`{ "component": … }`,
 *   the shape the Management API's create endpoint consumes), and
 * - `<folder>.{tsx,vue}` — the framework blok wrapper binding `blok.<field>`
 *   onto the built component imported from
 *   {@link GenerateStoryblokBloksOptions.componentsImport}.
 *
 * It also writes the aggregate `components.json` (`{ "components": [ … ] }`, the
 * shape `storyblok push-components` consumes), the wrapper entry barrel, and the
 * entry's synthesised `index.d.ts` (each wrapper precisely typed — `blok` is
 * `SbBlokData & { … }`, derived per component by {@link emitBlokDataType}). The
 * entry barrel path is returned so it can be handed straight to Vite's
 * `lib.entry` for Stage 2 (the framework's own toolchain compiles the wrappers
 * natively).
 */
export function generateStoryblokBloks(options: GenerateStoryblokBloksOptions): string {
  const stripPrefix = options.stripPrefix ?? 'Forge';
  const components = discoverComponents(readFileSync(options.componentsModule, 'utf8'), stripPrefix);
  const componentsDir = path.dirname(options.componentsModule);

  rmSync(options.outDir, { recursive: true, force: true, ...RM_RETRY_OPTIONS });
  mkdirSync(options.outDir, { recursive: true });

  const bloks: StoryblokComponent[] = [];
  const analyzedBloks: AnalyzedBlok[] = [];

  for (const component of components) {
    const sourcePath = path.join(componentsDir, component.sourceDir, `${component.folder}.tsx`);
    const sourceFile = parseTsx(sourcePath, readFileSync(sourcePath, 'utf8'));
    const analyzed = analyzeStoryblokComponent(sourceFile, {
      neutralName: component.neutralName,
      publicName: component.publicName,
      propertiesType: component.propertiesType,
    });
    bloks.push(analyzed.component);
    analyzedBloks.push({ publicName: component.publicName, analyzed });

    // The Storyblok component object (create-endpoint shape).
    writeFileSync(
      path.join(options.outDir, `${component.folder}.json`),
      `${JSON.stringify({ component: analyzed.component }, undefined, 2)}\n`,
      'utf8',
    );

    // The framework blok wrapper for the built component.
    const wrapper = emitStoryblokBlokWrapper(analyzed, component.publicName, {
      framework: options.framework,
      componentsImport: options.componentsImport,
    });
    const lang = BLOK_WRAPPER_LANG[options.framework];
    writeFileSync(path.join(options.outDir, `${component.folder}.${lang}`), wrapper, 'utf8');
  }

  // The aggregate push-components file.
  writeFileSync(
    path.join(options.outDir, 'components.json'),
    `${JSON.stringify({ components: bloks }, undefined, 2)}\n`,
    'utf8',
  );

  const entryFile = path.join(options.outDir, options.framework === 'react' ? 'index.tsx' : 'index.ts');
  writeFileSync(entryFile, generateBlokEntry(options.framework, components), 'utf8');

  // The synthesised, precisely typed declaration of the wrapper entry barrel
  // (the entry is not a `tsc`-visible source file). Consumers ship this verbatim.
  writeFileSync(
    path.join(options.outDir, 'index.d.ts'),
    generateBlokEntryDeclarations(options.framework, analyzedBloks),
    'utf8',
  );

  return entryFile;
}

/** Options for {@link jsxComponentsEntryDtsPlugin}. */
export interface JsxComponentsEntryDtsOptions {
  /** Framework the synthesised declaration targets. */
  framework: JsxFramework;
  /** Absolute path of the neutral components barrel (e.g. `src/components/index.ts`). */
  componentsModule: string;
  /** Base name (no extension) of the synthesised declaration file, e.g. `vue`. */
  declarationFileName: string;
  /** Import specifier for the props types inside the emitted `.d.ts`. Defaults to `./components`. */
  declarationModule?: string;
  /** Prefix stripped from each neutral export name to form its public name. Defaults to `Forge`. */
  stripPrefix?: string;
}

/**
 * Re-link per-component CSS to its JS chunk.
 *
 * A Vite **library** build with `cssCodeSplit` extracts one CSS asset per chunk
 * but — unlike an app build — does not inject the matching `import './x.css'`
 * into the JS chunk, so a consumer importing a single component would get its
 * JS without its styles. This plugin restores that link: for every emitted
 * chunk it prepends a side-effect import of each CSS file Vite associated with
 * it (`chunk.viteMetadata.importedCss`), so importing one component pulls in
 * exactly that component's stylesheet (and tree-shakes the rest of the library,
 * styles included).
 *
 * It runs with `enforce: 'post'` so its `generateBundle` hook executes **after**
 * Vite's own CSS plugin has populated `importedCss` — otherwise the metadata is
 * still empty (which is why the Vue scoped-style assets, emitted under
 * `preserveModules`, were previously left orphaned and the components rendered
 * unstyled).
 *
 * Only CSS files that were actually emitted into the bundle are re-linked. Under
 * `preserveModules` Vite deduplicates byte-identical CSS assets — e.g. the shared
 * `size`/`spacing` utility modules imported by many components collapse to a
 * single emitted stylesheet — and drops the duplicates, yet still leaves their
 * provisional per-chunk names in `importedCss`. Emitting `import './x.css'` for a
 * dropped name produces a dangling reference that breaks every downstream
 * consumer's build (unresolved import), so such names are filtered out; the
 * deduplicated styles still ship via the one chunk that retained them (and the
 * package's `./vue` / `./react` barrels pull in that chunk).
 *
 * Finally, each CSS-Module stylesheet is emitted under its **source** name —
 * `foo.module.css` — with the class-name hashing already applied and the
 * resolved names baked into the sibling `foo.module.js` class map. Shipping it
 * with that `.module.css` suffix is a trap: every *downstream* bundler (e.g. the
 * React Storybook's own Vite) recognises `*.module.css` as a CSS Module and
 * runs the CSS-Modules transform over it **a second time**, re-hashing the
 * selectors so they no longer match the (already-hashed) class names baked into
 * the JS — the component then renders unstyled. The stylesheet must be processed
 * once, here, when the framework code is compiled — not again downstream. So
 * every emitted `*.module.css` asset is renamed to a plain `*.css` (a global
 * stylesheet consumers ship verbatim), and the re-linked import points at the
 * renamed file.
 */
export function jsxComponentsCssImportPlugin(): Plugin {
  return {
    name: '@mission-platform/vite-plugin-forge:css-imports',
    enforce: 'post',
    generateBundle(_options, bundle) {
      // Rename every emitted `*.module.css` asset to a plain `*.css` so a
      // downstream bundler does not re-process (and re-hash) it as a CSS Module.
      // A new bundle file must be added through `this.emitFile` (directly adding
      // a key to `bundle` here is not honoured by the writer); the original,
      // `.module.css`-suffixed asset is then dropped. The mapping records the new
      // name so the re-linked import below points at the renamed, plain `.css`.
      const renamedCss = new Map<string, string>();
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.module.css')) {
          continue;
        }
        const renamed = `${file.fileName.slice(0, -'.module.css'.length)}.css`;
        // Never clobber a stylesheet that already ships under the plain name.
        if (Object.hasOwn(bundle, renamed)) {
          continue;
        }
        this.emitFile({ type: 'asset', fileName: renamed, source: file.source });
        delete bundle[file.fileName];
        renamedCss.set(file.fileName, renamed);
      }
      // The plain names the `.module.css` assets were just re-emitted under; they
      // are guaranteed present in the output even though `this.emitFile` does not
      // add them to `bundle` synchronously, so they are always safe to re-link.
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
          // A renamed `.module.css` is guaranteed emitted (under its plain name),
          // so it is always re-linked; any other name is only re-linked when it
          // survived into the bundle (deduplicated duplicates are dropped).
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
function generateEntryDeclaration(
  framework: JsxFramework,
  declarationModule: string,
  components: readonly DiscoveredComponent[],
  helpers: readonly DiscoveredHelperExport[] = [],
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
  for (const component of components) {
    const properties = component.propertiesType ?? 'Record<string, unknown>';
    lines.push(`export declare const ${component.publicName}: ${componentType}<${properties}>;`);
    // Declare the neutral `Base*` name as an alias of the same typed component,
    // matching the runtime entry's dual export.
    if (component.neutralName !== component.publicName) {
      lines.push(`export declare const ${component.neutralName}: ${componentType}<${properties}>;`);
    }
  }
  // Re-export every public type each component ships alongside it (variants,
  // option shapes, props interfaces, …) from the neutral declarations, so
  // consumers can import them from the framework entry too.
  const componentTypes = [...new Set(components.flatMap((component) => component.typeExports))];
  if (componentTypes.length > 0) {
    lines.push(`export type { ${componentTypes.join(', ')} } from ${JSON.stringify(declarationModule)};`);
  }
  // Re-export each shared helper module's API from its `tsc`-emitted declaration
  // (e.g. `./components/toast-store`), matching the entry's runtime re-exports.
  for (const helper of helpers) {
    const names = [...helper.values, ...helper.types.map((type) => `type ${type}`)];
    lines.push(`export { ${names.join(', ')} } from ${JSON.stringify(`${declarationModule}/${helper.base}`)};`);
  }
  lines.push('');
  return lines.join('\n');
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
      const barrelSource = readFileSync(options.componentsModule, 'utf8');
      const components = discoverComponents(barrelSource, stripPrefix);
      const helpers = discoverHelperExports(barrelSource, new Set(components.map((component) => component.folder)));
      this.emitFile({
        type: 'asset',
        fileName: `${options.declarationFileName}.d.ts`,
        source: generateEntryDeclaration(options.framework, declarationModule, components, helpers),
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
}

/**
 * An ambient module shim so the declaration compiler can resolve the components'
 * co-located CSS-module imports (`import styles from './x.module.scss'`), which
 * only the Vite CSS pipeline understands. It carries no runtime and, being a
 * `.d.ts`, never itself emits a declaration.
 */
const CSS_MODULE_SHIM = [
  "declare module '*.module.scss' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.module.css' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.scss' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.css' { const classes: Record<string, string>; export default classes; }",
  "declare module '*.svelte' { const component: any; export default component; }",
  '',
].join('\n');

/** File name of the CSS-module shim written into a generated tree before declaration emit. */
const CSS_MODULE_SHIM_FILE = '__mp-css-shim.d.ts';

/**
 * The custom export condition each framework's build is published under. The
 * generated per-framework sources import sibling workspace packages by their
 * **bare** specifier (`@mission-platform/icons`, `@mission-platform/components`,
 * …), so the declaration compilers must resolve with the matching condition or
 * they would pick up the packages' neutral (`MpElement`-returning) types instead
 * of the framework build's. Mirrors `frameworkCondition()` in
 * `@mission-platform/vite-config` and the `customConditions` tsconfig presets.
 */
const FRAMEWORK_DTS_CONDITION: Record<JsxFramework, string> = {
  vue: 'mp:vue',
  react: 'mp:react',
  solid: 'mp:solid',
  svelte: 'mp:svelte',
  'web-components': 'mp:web-component',
};

/**
 * `paths` overrides mapping the **owning package's own** bare specifier back to
 * its neutral source.
 *
 * A generated tree frequently re-imports its own package by name — the barcode /
 * qr-code / matrix-code / code-scanner components import their encode/decode
 * helpers from `@mission-platform/<pkg>`, and the Storyblok wrappers import the
 * component library they wrap. Those specifiers must keep resolving to the
 * package's **neutral** entry: under {@link FRAMEWORK_DTS_CONDITION} they would
 * otherwise resolve to the package's own framework build, which re-exports only
 * the components (so the helpers vanish) and whose type aliases circle back on
 * the ones being declared (`TS2303: Circular definition of import alias`).
 *
 * The mapping targets the package's already-built **neutral declaration**
 * (`dist/index.d.ts`, emitted by the neutral `defineTsdownLibrary` config that
 * runs before the framework configs) rather than its `src/`: a `.d.ts` is exempt
 * from the `rootDir` containment rule, whereas pulling real source into the
 * program would fail with `TS6059`.
 *
 * Returns an empty object when there is no owning `package.json`, or when its
 * neutral declaration has not been emitted yet — leaving resolution unchanged.
 */
function selfReferencePaths(generatedDir: string): ts.MapLike<string[]> {
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

/**
 * Base compiler options for emitting a generated component tree's declarations
 * (mirrors the packages' `tsconfig.build.json`). `jsx: preserve` keeps the
 * classic-`h` React tree's JSX agnostic to the runtime factory during emit, and
 * `noEmitOnError: false` guarantees a `.d.ts` is produced even though the
 * generated components' JSX bodies are checked against React's stricter JSX
 * typing. Those body-level mismatches never reach the emitted `.d.ts` (every
 * function body is elided) and are filtered out by {@link isElidedDiagnostic}
 * so only genuine, declaration-affecting diagnostics surface as build warnings.
 */
const COMPONENT_DTS_COMPILER_OPTIONS: ts.CompilerOptions = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2023,
  lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  jsx: ts.JsxEmit.Preserve,
  skipLibCheck: true,
  esModuleInterop: true,
  strict: true,
  declaration: true,
  emitDeclarationOnly: true,
  noEmitOnError: false,
  types: [],
};

/**
 * Whether a diagnostic originates in a position that declaration emit **elides**,
 * so it never affects the emitted `.d.ts` and must not surface as a build warning:
 *
 * - Inside a function/method/arrow **body** (JSX only ever appears in one). These
 *   are the neutral tree's JSX bodies being type-checked against the framework's
 *   stricter JSX vocabulary — native `Event` handlers vs React's `SyntheticEvent`,
 *   lowercase DOM attributes (`tabindex`, `onMouseenter`) vs React's camelCase,
 *   `MpElement` children vs `ReactNode`, `RefObject<HTMLElement>` vs
 *   `Ref<HTMLDivElement>`, …
 * - Inside a **class property initializer** whose property carries an explicit
 *   type annotation. The initializer is dropped from the `.d.ts` (only the
 *   annotation is kept), so a name it references that is out of scope — e.g. the
 *   Web-Components element synthesiser seeding a reactive-state field from a
 *   destructured prop default (`openIds: any = defaultOpen`) — is invisible to
 *   consumers, exactly like a body-level reference.
 *
 * Genuinely declaration-affecting diagnostics (a duplicate export, an unresolved
 * import, a non-portable exported signature, a dangling type in a kept
 * interface) are *not* elided and remain reported.
 */
function isElidedDiagnostic(diagnostic: ts.Diagnostic): boolean {
  const { file, start } = diagnostic;
  if (file === undefined || start === undefined) {
    return false;
  }
  const findInnermost = (node: ts.Node): ts.Node => {
    const child = ts.forEachChild(node, (candidate) =>
      candidate.getStart(file) <= start && start < candidate.getEnd() ? candidate : undefined,
    );
    return child === undefined ? node : findInnermost(child);
  };
  let node: ts.Node | undefined = findInnermost(file);
  while (node !== undefined && node !== file) {
    const parent: ts.Node | undefined = node.parent;
    if (parent !== undefined && ts.isFunctionLike(parent) && (parent as ts.FunctionLikeDeclarationBase).body === node) {
      return true;
    }
    // A class-property initializer is elided from the `.d.ts` when the property
    // has an explicit type annotation (the annotation is emitted, the value is
    // not), so a name it references cannot reach a consumer.
    if (
      parent !== undefined &&
      ts.isPropertyDeclaration(parent) &&
      parent.type !== undefined &&
      parent.initializer === node
    ) {
      return true;
    }
    node = parent;
  }
  return false;
}

/**
 * Emit declarations for a generated `.ts`/`.tsx` tree in-process with the
 * TypeScript compiler API, writing the CSS-module shim first so co-located
 * style imports resolve. Shared by every in-process toolchain (React, Solid,
 * Web-Components): each passes the `compilerOverrides` its own JSX dialect
 * needs — React relies on the base options' `jsx: preserve` as-is, Solid
 * additionally points the JSX namespace at `solid-js`, and Web-Components
 * needs no override at all (its generated tree is plain Lit `.ts`, no JSX).
 * Diagnostics rooted in an elided position (a function body, or a typed class
 * property's initializer) are filtered by {@link isElidedDiagnostic} (they
 * never reach the `.d.ts`); genuine, declaration-affecting diagnostics surface
 * as build warnings.
 */
function emitTscComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
  compilerOverrides: ts.CompilerOptions = {},
): void {
  const shimPath = path.join(options.generatedDir, CSS_MODULE_SHIM_FILE);
  writeFileSync(shimPath, CSS_MODULE_SHIM, 'utf8');

  const rootNames = readdirSync(options.generatedDir)
    .filter((file) => (file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.d.ts'))
    .map((file) => path.join(options.generatedDir, file));

  const program = ts.createProgram([...rootNames, shimPath], {
    ...COMPONENT_DTS_COMPILER_OPTIONS,
    customConditions: [FRAMEWORK_DTS_CONDITION[options.framework]],
    paths: selfReferencePaths(options.generatedDir),
    ...compilerOverrides,
    rootDir: options.generatedDir,
    outDir: options.outDir,
    declarationDir: options.outDir,
  });
  const emitResult = program.emit(undefined, undefined, undefined, true);

  const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
  for (const diagnostic of diagnostics) {
    // Skip diagnostics rooted in a function body: they are the neutral tree's
    // JSX bodies checked against the framework's stricter JSX types and never
    // reach the emitted (body-elided) `.d.ts`. Genuine, declaration-affecting
    // diagnostics (duplicate exports, unresolved imports, non-portable
    // signatures) remain.
    if (isElidedDiagnostic(diagnostic)) {
      continue;
    }
    this.warn(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
}

/** Emit React declarations for the generated `.tsx` tree in-process with the TypeScript compiler API. */
function emitReactComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options);
}

/**
 * Emit Solid declarations for the generated `.tsx` tree in-process with the
 * TypeScript compiler API. The Solid emitter renders genuine Solid JSX
 * (`<div onClick={…}>`, no synthetic event system), so the JSX namespace must
 * resolve against `solid-js` (`jsxImportSource: 'solid-js'`) rather than the
 * base options' implicit `JSX` global — otherwise every element is reported
 * untyped. Body-level JSX diagnostics are filtered exactly as for React; the
 * generated `index.tsx` entry yields `index.d.ts`.
 */
function emitSolidComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options, {
    jsx: ts.JsxEmit.Preserve,
    jsxImportSource: 'solid-js',
  });
}

/**
 * Emit Web-Components declarations for the generated `.ts` tree in-process
 * with the TypeScript compiler API. The generated tree carries no JSX at all
 * (each component is a Lit `LitElement` subclass authored in plain `.ts`), so
 * the shared toolchain needs no compiler overrides — it is the same emitter
 * React uses, run over a tree that happens to be JSX-free. The generated
 * `index.ts` entry re-exports each `<Neutral>Element` class, so `tsc` emits
 * `index.d.ts` from it.
 */
function emitWebComponentsComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  emitTscComponentDeclarations.call(this, options);
}

/**
 * Emit Vue declarations for the generated `.vue` tree by running the `vue-tsc`
 * CLI (plain `tsc` cannot read single-file components) over a synthesised
 * tsconfig. `vue-tsc` exits non-zero when the tree has type diagnostics (it
 * does — the neutral `MpElement` return type is not Vue-JSX-valid), so its
 * output is captured and surfaced as build warnings rather than aborting the
 * build, mirroring the React path.
 */
function emitVueComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  if (options.vueTscBin === undefined) {
    throw new Error('jsxComponentsDtsPlugin: `vueTscBin` is required to emit declarations for the Vue tree.');
  }
  writeFileSync(path.join(options.generatedDir, CSS_MODULE_SHIM_FILE), CSS_MODULE_SHIM, 'utf8');

  const tsconfig = {
    compilerOptions: {
      module: 'esnext',
      moduleResolution: 'bundler',
      target: 'es2023',
      lib: ['es2023', 'dom', 'dom.iterable'],
      // The generated SFCs are `<script setup lang="tsx">`; the render-closure /
      // scoped-slot fallbacks emit JSX, and `vue-tsc` compiles each `<template>`
      // into virtual TSX too. Point the JSX namespace at Vue's own runtime
      // (`vue/jsx-runtime`) so `vue-tsc` resolves `JSX.IntrinsicElements` against
      // Vue's element vocabulary — otherwise every element is reported untyped
      // (`TS7026`, Vue 3 registers no global `JSX` namespace). A hand-rolled
      // permissive global namespace is not an option: it would also govern the
      // template virtual code and break component/prop checking wholesale.
      jsx: 'preserve',
      jsxImportSource: 'vue',
      // Bare `@mission-platform/*` imports in the generated SFCs must resolve to
      // each package's Vue build, exactly as a consuming app resolves them.
      customConditions: [FRAMEWORK_DTS_CONDITION.vue],
      paths: selfReferencePaths(options.generatedDir),
      skipLibCheck: true,
      esModuleInterop: true,
      strict: true,
      declaration: true,
      emitDeclarationOnly: true,
      noEmitOnError: false,
      types: [],
      rootDir: '.',
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
    // `vue-tsc` exits non-zero on type diagnostics but has still emitted the
    // declarations; surface its report as a warning instead of failing.
    const report = error as { stdout?: string; stderr?: string };
    const message = [report.stdout, report.stderr].filter(Boolean).join('\n').trim();
    if (message.length > 0) {
      this.warn(message);
    }
  }
}

/**
 * Whether `svelte2tsx`'s `emitDts` output in `outDir` is actually usable.
 *
 * `emitDts` writes a `.svelte.d.ts` sidecar per component that types the
 * default export as `Component<XxxProperties, …>`, where `XxxProperties` is
 * the props interface the component itself declares (via `export interface`)
 * inside its (non-`module`) `<script lang="ts">` block. In practice `emitDts`
 * reliably *references* that type name in the sidecar without ever
 * *declaring or importing* it there — every such sidecar ships a dangling
 * `Component<XxxProperties, …>` that fails with `TS2304: Cannot find name
 * 'XxxProperties'` for any real consumer. This is checked directly (does the
 * identifier fed to `Component<…>` appear anywhere else — as a declaration or
 * an import — in the same file?) rather than assumed, so a future
 * `svelte2tsx` fix is picked up automatically instead of a permanent bypass.
 */
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

/**
 * Emit Svelte declarations for the generated `.svelte` + `.ts` tree using
 * `svelte2tsx`'s async `emitDts`, the Svelte-language-tools' own SFC-aware
 * declaration emitter (the `.svelte` counterpart of `vue-tsc`'s emit above):
 * it converts each SFC to virtual TSX, type-checks the whole tree, and writes
 * a `.svelte.d.ts` sidecar per component plus `index.d.ts` from the generated
 * `index.ts` entry.
 *
 * Unlike `vue-tsc`, `emitDts` takes no compiler options directly — it searches
 * for a tsconfig at `libRoot` (the generated tree) — so one is written there
 * first, mirroring the Vue tsconfig's shape. The CSS-module shim is written
 * beforehand for the same reason the React/Vue paths write it: so `import
 * styles from './x.module.scss'` resolves.
 *
 * `emitDts` can throw rather than cleanly surface diagnostics the way the
 * other toolchains do here, so any error is caught and surfaced as a warning
 * instead of failing the build. The output is then verified with {@link
 * svelteDtsOutputIsUsable}: as of the `svelte2tsx` version this plugin
 * currently depends on, every emitted `.svelte.d.ts` sidecar ships a dangling
 * `Component<XxxProperties, …>` reference the file never declares or imports
 * (`XxxProperties` is the component's own props interface, declared in its
 * `<script>` block — `emitDts` does not surface it in the sidecar), which
 * breaks for real consumers with `TS2304: Cannot find name`. Until that is
 * fixed upstream, this **falls back to the synthesised entry declaration**
 * ({@link generateEntryDeclaration}) for Svelte, which re-exports each
 * component's props type from the neutral tree's own (already-valid) `tsc`
 * declarations instead of from the broken `.svelte.d.ts` sidecars, so the
 * Svelte build always ships a valid `index.d.ts`.
 */
async function emitSvelteComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): Promise<void> {
  writeFileSync(path.join(options.generatedDir, CSS_MODULE_SHIM_FILE), CSS_MODULE_SHIM, 'utf8');

  const tsconfig = {
    compilerOptions: {
      module: 'esnext',
      moduleResolution: 'bundler',
      target: 'es2023',
      lib: ['es2023', 'dom', 'dom.iterable'],
      // Resolve bare `@mission-platform/*` imports to each package's Svelte build.
      customConditions: [FRAMEWORK_DTS_CONDITION.svelte],
      paths: selfReferencePaths(options.generatedDir),
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
  // Discard whatever broken sidecars `emitDts` left behind (they are unused by
  // the synthesised entry declaration below and would otherwise ship dead,
  // dangling `.d.ts` files alongside the real, valid `index.d.ts`).
  if (existsSync(options.outDir)) {
    for (const file of readdirSync(options.outDir).filter((entry) => entry.endsWith('.d.ts'))) {
      rmSync(path.join(options.outDir, file));
    }
  }
  if (options.componentsModule === undefined) {
    return;
  }
  const barrelSource = readFileSync(options.componentsModule, 'utf8');
  const components = discoverComponents(barrelSource, 'Forge');
  const helpers = discoverHelperExports(barrelSource, new Set(components.map((c) => c.folder)));
  const dtsContent = generateEntryDeclaration(options.framework, '../components', components, helpers);
  mkdirSync(options.outDir, { recursive: true });
  writeFileSync(path.join(options.outDir, 'index.d.ts'), dtsContent, 'utf8');
}

/**
 * A post-build Vite plugin that emits **genuine, per-framework** declarations
 * for a neutral components package's generated source tree.
 *
 * Each framework build ({@link generateFrameworkSources} + the framework's
 * Stage-2 bundler) produces JS but no declarations, since the generated tree is
 * not a `tsc`-visible source file. Rather than synthesise a single entry
 * declaration whose props types are re-imported from the **shared neutral**
 * declarations (so every framework's consumers would see the same `MpChild` /
 * `MpRef`), this plugin runs each framework's own declaration toolchain over
 * the generated tree in `closeBundle` and writes the resulting `.d.ts` files
 * into the build's own `outDir`:
 *
 * - **React** — the TypeScript compiler API over the `.tsx` tree, in-process.
 *   Because the React emitter already rewrites the neutral render/hook types to
 *   their React equivalents (`MpChild` → `ReactNode`, `MpRef` → `RefObject`,
 *   `MpDependencyList` → `DependencyList`), the emitted declarations read
 *   idiomatically for React.
 * - **Vue** — the `vue-tsc` CLI over the `.vue` tree, which emits each SFC's
 *   precise `DefineComponent` (props, slots, emits) plus its `.vue.d.ts`
 *   sidecar.
 * - **Solid** — the same in-process TypeScript compiler API as React, over the
 *   generated `.tsx` tree, but with the JSX namespace pointed at `solid-js` so
 *   the Solid-flavoured JSX the emitter renders resolves against Solid's own
 *   `JSX.Element` vocabulary.
 * - **Web-Components** — the same in-process TypeScript compiler API, over the
 *   generated (JSX-free) `.ts` tree of `LitElement` subclasses.
 * - **Svelte** — attempts `svelte2tsx`'s async `emitDts` over the generated
 *   `.svelte` + `.ts` tree first (the SFC-aware declaration emitter from the
 *   Svelte language tools), but as of the currently depended-on `svelte2tsx`
 *   version its per-component `.svelte.d.ts` sidecars ship a dangling
 *   props-type reference they never declare or import (see {@link
 *   svelteDtsOutputIsUsable}), so this currently always falls back to the
 *   synthesised entry declaration for a valid `index.d.ts`.
 *
 * Type diagnostics are surfaced as build warnings rather than failures so a
 * `.d.ts` is always produced (mirroring {@link hookLibraryDtsPlugin}).
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
            const barrelSource = readFileSync(options.componentsModule, 'utf8');
            const components = discoverComponents(barrelSource, 'Forge');
            const helpers = discoverHelperExports(barrelSource, new Set(components.map((c) => c.folder)));
            const dtsContent = generateEntryDeclaration(options.framework, '../components', components, helpers);
            mkdirSync(options.outDir, { recursive: true });
            writeFileSync(path.join(options.outDir, 'index.d.ts'), dtsContent, 'utf8');
          }
        }
      }
    },
  };
}
