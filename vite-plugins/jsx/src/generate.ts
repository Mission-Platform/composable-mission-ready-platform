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
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { moduleTargetsFramework, parseTsx, readComponentImports, readStyleImports } from './compiler/ast.js';
import { compileComponentModule, type JsxFramework } from './compiler/compile.js';
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
 * Generate the public entry module re-exporting each compiled component under
 * both its public name (`Badge`) **and** its neutral `Base`-prefixed name
 * (`BaseBadge`), so the package can be consumed under either convention.
 */
function generateEntry(
  framework: JsxFramework,
  components: readonly DiscoveredComponent[],
  helpers: readonly DiscoveredHelperExport[] = [],
): string {
  const componentLines = components.flatMap((component) => {
    const lines = [componentReExportLine(framework, component, component.publicName)];
    // Also ship the neutral `Base*` name as an alias of the same component.
    if (component.neutralName !== component.publicName) {
      lines.push(componentReExportLine(framework, component, component.neutralName));
    }
    return lines;
  });
  // Forward shared helper-module APIs (e.g. the toast store) so consumers drive
  // the same per-framework singleton the components use.
  const helperLines = helpers.map((helper) => helperReExportLine(helper));
  return `${[...componentLines, ...helperLines].join('\n')}\n`;
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

  for (const component of components) {
    const componentDir = path.join(componentsDir, component.folder);
    const sourcePath = path.join(componentDir, `${component.folder}.tsx`);
    const source = readFileSync(sourcePath, 'utf8');
    const compiled = compileComponentModule(source, {
      framework: options.framework,
      componentName: component.neutralName,
      fileName: sourcePath,
      componentFolders,
    });
    writeFileSync(path.join(options.outDir, `${component.folder}.${compiled.lang}`), compiled.code, 'utf8');

    // Carry each shared **helper module** (a relative value import that is not
    // itself a component, e.g. a ported store) into the flat generated tree so
    // the re-pointed `./<base>` import resolves at Stage 2. Helpers are plain TS
    // copied verbatim (they must be framework-agnostic — no neutral/JSX imports).
    for (const relativeImport of readComponentImports(parseTsx(sourcePath, source))) {
      if (componentFolders.has(relativeImport.base)) {
        continue;
      }
      for (const extension of ['ts', 'tsx'] as const) {
        const helperPath = path.join(componentDir, `${relativeImport.specifier}.${extension}`);
        if (existsSync(helperPath)) {
          copyFileSync(helperPath, path.join(options.outDir, `${relativeImport.base}.${extension}`));
          break;
        }
      }
    }

    // Carry each component's own stylesheet (e.g. its CSS Module) into the flat
    // generated tree so the re-pointed `./<base>` import resolves at Stage 2 and
    // the component ships its own CSS. The Vue emitter inlines CSS-Module imports
    // (default import) directly as an SFC `<style>` block, so those are not
    // copied for Vue; bare side-effect CSS imports (and all React imports) still are.
    for (const styleImport of readStyleImports(parseTsx(sourcePath, source))) {
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

  const entryFile = path.join(options.outDir, options.framework === 'react' ? 'index.tsx' : 'index.ts');
  writeFileSync(entryFile, generateEntry(options.framework, components, helpers), 'utf8');
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
 */
export function jsxComponentsCssImportPlugin(): Plugin {
  return {
    name: '@mission-platform/vite-plugin-jsx:css-imports',
    enforce: 'post',
    generateBundle(_options, bundle) {
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
          .filter((cssFileName) => Object.hasOwn(bundle, cssFileName))
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
