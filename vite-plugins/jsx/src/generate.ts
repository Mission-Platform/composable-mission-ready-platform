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
import path from 'node:path';

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

/** Options for {@link generateFrameworkSources}. */
export interface GenerateFrameworkSourcesOptions {
  /** Target framework the neutral components are compiled to. */
  framework: JsxFramework;
  /** Absolute path of the neutral components barrel (e.g. `src/components/index.ts`). */
  componentsModule: string;
  /** Absolute path of the directory the generated sources + entry are written to. */
  outDir: string;
  /** Prefix stripped from each neutral export name to form its public name. Defaults to `Base`. */
  stripPrefix?: string;
}

/** Re-export one helper module's value + type bindings from the flat generated tree. */
function helperReExportLine(helper: DiscoveredHelperExport): string {
  const names = [...helper.values, ...helper.types.map((type) => `type ${type}`)];
  return `export { ${names.join(', ')} } from './${helper.base}';`;
}

/**
 * Re-export one compiled component under a given export name.
 *
 * React re-exports the neutral function binding (`BaseBadge`) under the target
 * name; Vue re-exports the SFC's `default` export.
 */
function componentReExportLine(framework: JsxFramework, component: DiscoveredComponent, as: string): string {
  return framework === 'react'
    ? `export { ${component.neutralName} as ${as} } from './${component.folder}';`
    : `export { default as ${as} } from './${component.folder}.vue';`;
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
  const specifier = framework === 'react' || !origin.isComponent ? `./${origin.base}` : `./${origin.base}.vue`;
  const names = types.map((type) => `type ${type}`).join(', ');
  return `export { ${names} } from '${specifier}';`;
}

/**
 * Generate the public entry module re-exporting each compiled component under
 * both its public name (`Badge`) **and** its neutral `Base`-prefixed name
 * (`BaseBadge`), so the package can be consumed under either convention. Every
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
 * Compile a neutral components package to its per-framework source tree (Stage 1),
 * returning the generated entry module path.
 */
export function generateFrameworkSources(options: GenerateFrameworkSourcesOptions): string {
  const stripPrefix = options.stripPrefix ?? 'Base';
  const componentsDir = path.dirname(options.componentsModule);
  // Framework-gated components (opening with a `"use react";` / `"use vue";`
  // directive) are emitted only for the framework they target; drop the rest so
  // they neither compile nor get re-exported from this framework's entry.
  const components = discoverComponents(readFileSync(options.componentsModule, 'utf8'), stripPrefix).filter(
    (component) => {
      const sourcePath = path.join(componentsDir, component.folder, `${component.folder}.tsx`);
      return moduleTargetsFramework(parseTsx(sourcePath, readFileSync(sourcePath, 'utf8')), options.framework);
    },
  );
  // The folder bases of every discovered component — used to tell sibling
  // **component** imports (rendered as Vue `./<base>.vue` children) apart from
  // plain **helper module** imports (kept as named `./<base>` imports and copied
  // verbatim into the flat tree below).
  const componentFolders = new Set(components.map((component) => component.folder));

  rmSync(options.outDir, { recursive: true, force: true });
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

  // Carry a shared **helper module** (a relative value import that is not itself
  // a component) into the flat generated tree so the re-pointed `./<base>` import
  // resolves at Stage 2. A helper that authors against `@mission-platform/jsx`
  // (a composable or a `createContext` module) is a *neutral* module, so it is
  // compiled per-framework via {@link compileHookModule} (React `.tsx` / Vue
  // `.ts`) just like a hook-library module; a purely framework-agnostic helper
  // (no neutral/JSX import — e.g. a ported store) is copied verbatim. Either way
  // the helper's own relative (non-component) imports are carried transitively,
  // so a composable that reads another composable or a shared context resolves.
  const carriedHelpers = new Set<string>();
  const carryHelperModule = (sourcePath: string): void => {
    const base = path.basename(sourcePath, path.extname(sourcePath));
    if (carriedHelpers.has(base)) {
      return;
    }
    carriedHelpers.add(base);

    const source = readFileSync(sourcePath, 'utf8');
    const parsed = parseTsx(sourcePath, source);
    const neutral = readNeutralImports(parsed);
    const usesNeutral = neutral.values.length > 0 || neutral.types.length > 0;
    if (usesNeutral) {
      const compiled = compileHookModule(source, { framework: options.framework, fileName: sourcePath });
      writeFileSync(path.join(options.outDir, `${base}.${compiled.lang}`), compiled.code, 'utf8');
    } else {
      copyFileSync(sourcePath, path.join(options.outDir, path.basename(sourcePath)));
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
      }
    }
  };

  for (const component of components) {
    const componentDir = path.join(componentsDir, component.folder);
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
    writeFileSync(path.join(options.outDir, `${component.folder}.${compiled.lang}`), compiled.code, 'utf8');

    // Auxiliary SFCs the emitter generated alongside the primary module (e.g. a
    // recursive helper component extracted from a self-recursive render helper)
    // are written next to it in the flat tree so Stage 2 compiles them and the
    // primary SFC's `./<name>.vue` import resolves.
    for (const extra of compiled.extraModules ?? []) {
      writeFileSync(path.join(options.outDir, `${extra.name}.${extra.lang}`), extra.code, 'utf8');
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
        copyFileSync(stylePath, path.join(options.outDir, styleImport.base));
      }
    }
  }

  // Shared helper modules re-exported from the barrel (e.g. the toast store) are
  // forwarded through the entry; their source files are already carried into the
  // flat tree by the per-component helper-import copy above.
  const helpers = discoverHelperExports(readFileSync(options.componentsModule, 'utf8'), componentFolders);

  // The co-located local JSX types module: framework-specific variants of the
  // neutral render/props primitives (`MpProperties`, `MpRenderProperty`) the
  // emitters redirect those two type imports to (see `LOCAL_JSX_TYPE_NAMES`), so
  // the generated components carry no neutral `@mission-platform/jsx` render/props
  // type import. Written once per tree; only referenced via `import type`, so it
  // adds no runtime chunk and simply emits its own `.d.ts` alongside the build.
  writeFileSync(path.join(options.outDir, LOCAL_JSX_TYPES_FILE), localJsxTypesModuleSource(options.framework), 'utf8');

  // The co-located effect helper module: the Vue-only generalised watcher
  // (`mpEffect`) the Vue emitter routes every `useEffect` through (built on
  // native `watch`/lifecycle). Written once per tree, exactly like the local JSX
  // types module. It is Vue-only, so `localEffectModuleSource` returns an empty
  // string for React and nothing is written for the React build.
  const effectModuleSource = localEffectModuleSource(options.framework);
  if (effectModuleSource.length > 0) {
    writeFileSync(path.join(options.outDir, LOCAL_EFFECT_FILE), effectModuleSource, 'utf8');
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
  return entryFile;
}

/** Options for {@link generateStoryblokBloks}. */
export interface GenerateStoryblokBloksOptions {
  /** Framework the emitted blok wrappers target (`react` → `.tsx`, `vue` → `.vue`). */
  framework: JsxFramework;
  /** Absolute path of the neutral components barrel (e.g. `src/components/index.ts`). */
  componentsModule: string;
  /** Absolute path of the directory the JSON config, wrappers, and entry are written to. */
  outDir: string;
  /**
   * Import specifier the generated wrappers import the **built** framework
   * components from, e.g. `@mission-platform/components/vue`.
   */
  componentsImport: string;
  /** Prefix stripped from each neutral export name to form its public name. Defaults to `Base`. */
  stripPrefix?: string;
}

/** Generate the entry barrel re-exporting each generated blok wrapper. */
function generateBlokEntry(framework: JsxFramework, components: readonly DiscoveredComponent[]): string {
  const lines = components.map((component) =>
    framework === 'react'
      ? `export { ${component.publicName}Blok } from './${component.folder}';`
      : `export { default as ${component.publicName}Blok } from './${component.folder}.vue';`,
  );
  return `${lines.join('\n')}\n`;
}

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
  const stripPrefix = options.stripPrefix ?? 'Base';
  const components = discoverComponents(readFileSync(options.componentsModule, 'utf8'), stripPrefix);
  const componentsDir = path.dirname(options.componentsModule);

  rmSync(options.outDir, { recursive: true, force: true });
  mkdirSync(options.outDir, { recursive: true });

  const bloks: StoryblokComponent[] = [];
  const analyzedBloks: AnalyzedBlok[] = [];

  for (const component of components) {
    const sourcePath = path.join(componentsDir, component.folder, `${component.folder}.tsx`);
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
    const lang = options.framework === 'react' ? 'tsx' : 'vue';
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
  /** Prefix stripped from each neutral export name to form its public name. Defaults to `Base`. */
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
    name: '@mission-platform/vite-plugin-jsx:css-imports',
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
  const componentType = framework === 'react' ? 'FunctionComponent' : 'DefineComponent';
  const frameworkImport = framework === 'react' ? 'react' : 'vue';

  const propertyTypes = [...new Set(components.map((component) => component.propertiesType).filter(Boolean))];
  const lines: string[] = [`import type { ${componentType} } from ${JSON.stringify(frameworkImport)};`];
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
  const stripPrefix = options.stripPrefix ?? 'Base';

  return {
    name: '@mission-platform/vite-plugin-jsx:entry-dts',
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
   * handed to {@link generateFrameworkSources}): React `.tsx` modules, or Vue
   * `.vue` SFCs, plus their shared helper `.ts` modules and the entry.
   */
  generatedDir: string;
  /** Absolute path of the directory the emitted `.d.ts` files are written to (e.g. `dist/react`, `dist/vue`). */
  outDir: string;
  /**
   * Absolute path of the `vue-tsc` CLI (`vue-tsc/bin/vue-tsc.js`), used to emit
   * declarations for the Vue `.vue` tree. **Required** when `framework` is
   * `'vue'` (plain `tsc` cannot read single-file components); ignored for React.
   */
  vueTscBin?: string;
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
  '',
].join('\n');

/** File name of the CSS-module shim written into a generated tree before declaration emit. */
const CSS_MODULE_SHIM_FILE = '__mp-css-shim.d.ts';

/**
 * Base compiler options for emitting a generated component tree's declarations
 * (mirrors the packages' `tsconfig.build.json`). `jsx: preserve` keeps the
 * classic-`h` React tree's JSX agnostic to the runtime factory during emit, and
 * `noEmitOnError: false` guarantees a `.d.ts` is produced even though the
 * generated components' JSX bodies are checked against React's stricter JSX
 * typing. Those body-level mismatches never reach the emitted `.d.ts` (every
 * function body is elided) and are filtered out by {@link isBodyLevelDiagnostic}
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
 * Whether a diagnostic originates inside a function/method/arrow **body** (JSX
 * only ever appears inside one). Declaration emit elides every function body, so
 * such diagnostics never affect the emitted `.d.ts`: they are the neutral tree's
 * JSX bodies being type-checked against the framework's stricter JSX vocabulary
 * — native `Event` handlers vs React's `SyntheticEvent`, lowercase DOM
 * attributes (`tabindex`, `onMouseenter`) vs React's camelCase, `MpElement`
 * children vs `ReactNode`, `RefObject<HTMLElement>` vs `Ref<HTMLDivElement>`, …
 *
 * Top-level diagnostics (a duplicate export, an unresolved import, a
 * non-portable exported signature) are *not* body-level and remain reported.
 */
function isBodyLevelDiagnostic(diagnostic: ts.Diagnostic): boolean {
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
    node = parent;
  }
  return false;
}

/** Emit React declarations for the generated `.tsx` tree in-process with the TypeScript compiler API. */
function emitReactComponentDeclarations(
  this: { warn: (message: string) => void },
  options: JsxComponentsDtsOptions,
): void {
  const shimPath = path.join(options.generatedDir, CSS_MODULE_SHIM_FILE);
  writeFileSync(shimPath, CSS_MODULE_SHIM, 'utf8');

  const rootNames = readdirSync(options.generatedDir)
    .filter((file) => (file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.d.ts'))
    .map((file) => path.join(options.generatedDir, file));

  const program = ts.createProgram([...rootNames, shimPath], {
    ...COMPONENT_DTS_COMPILER_OPTIONS,
    rootDir: options.generatedDir,
    outDir: options.outDir,
    declarationDir: options.outDir,
  });
  const emitResult = program.emit(undefined, undefined, undefined, true);

  const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
  for (const diagnostic of diagnostics) {
    // Skip diagnostics rooted in a function body: they are the neutral tree's
    // JSX bodies checked against React's stricter JSX types and never reach the
    // emitted (body-elided) `.d.ts`. Genuine, declaration-affecting diagnostics
    // (duplicate exports, unresolved imports, non-portable signatures) remain.
    if (isBodyLevelDiagnostic(diagnostic)) {
      continue;
    }
    this.warn(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
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
 * A post-build Vite plugin that emits **genuine, per-framework** declarations
 * for a neutral components package's generated source tree.
 *
 * Each framework build ({@link generateFrameworkSources} + the framework's
 * Stage-2 bundler) produces JS but no declarations, since the generated tree is
 * not a `tsc`-visible source file. Rather than synthesise a single entry
 * declaration whose props types are re-imported from the **shared neutral**
 * declarations (so React and Vue consumers would both see `MpChild` / `MpRef`),
 * this plugin runs the framework's own declaration toolchain over the generated
 * tree in `closeBundle` and writes the resulting `.d.ts` files into the build's
 * own `outDir`:
 *
 * - **React** — the TypeScript compiler API over the `.tsx` tree, in-process.
 *   Because the React emitter already rewrites the neutral render/hook types to
 *   their React equivalents (`MpChild` → `ReactNode`, `MpRef` → `RefObject`,
 *   `MpDependencyList` → `DependencyList`), the emitted declarations read
 *   idiomatically for React.
 * - **Vue** — the `vue-tsc` CLI over the `.vue` tree, which emits each SFC's
 *   precise `DefineComponent` (props, slots, emits) plus its `.vue.d.ts`
 *   sidecar.
 *
 * Type diagnostics are surfaced as build warnings rather than failures so a
 * `.d.ts` is always produced (mirroring {@link hookLibraryDtsPlugin}).
 */
export function jsxComponentsDtsPlugin(options: JsxComponentsDtsOptions): Plugin {
  return {
    name: '@mission-platform/vite-plugin-jsx:components-dts',
    closeBundle() {
      if (options.framework === 'react') {
        emitReactComponentDeclarations.call(this, options);
      } else {
        emitVueComponentDeclarations.call(this, options);
      }
    },
  };
}
