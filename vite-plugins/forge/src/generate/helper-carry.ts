import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { parseTsx, readNeutralImports, readStyleImports } from '../compiler/ast.js';

import type { ForgeGenerationContext } from '../compiler/generation-context.js';
import type { ForgeFileGraph } from '../compiler/graph.js';
import type { GeneratedModule } from '@mission-platform/forge-plugin-api';
import type { SourceFile } from 'typescript';

export function createHelperModuleCarrier(input: {
  /** Graphs for the public package entry and transformed component barrel. */
  readonly graphs: readonly ForgeFileGraph[];
  readonly context: ForgeGenerationContext;
  readonly router: Parameters<ForgeGenerationContext['compile']>[0]['router'];
  readonly routerPlugins: Parameters<ForgeGenerationContext['compile']>[0]['routerPlugins'];
  readonly routerConditions: Parameters<ForgeGenerationContext['compile']>[0]['routerConditions'];
  readonly mirrorHelperDir: (sourceAbsPath: string) => string;
  readonly writeCompiledModule: (dir: string, fileName: string, compiled: GeneratedModule, sourceId?: string) => void;
  readonly writeModule: (dir: string, fileName: string, code: string, sourceId?: string) => void;
  readonly copyAsset: (dir: string, fileName: string, sourcePath: string, sourceId?: string) => void;
  readonly carriedHelpers: Set<string>;
  readonly pendingIndexSources: Set<string>;
  readonly helperExportedTypes: Map<string, Set<string>>;
  readonly readExportedTypeNames: (parsed: SourceFile) => Set<string>;
}): (sourcePath: string) => void {
  const {
    graphs,
    context,
    router,
    routerPlugins,
    routerConditions,
    mirrorHelperDir,
    writeCompiledModule,
    writeModule,
    copyAsset,
    carriedHelpers,
    pendingIndexSources,
    helperExportedTypes,
    readExportedTypeNames,
  } = input;

  const graphForSource = (sourcePath: string): ForgeFileGraph | undefined =>
    graphs.find((candidate) => candidate.nodes.has(path.resolve(sourcePath)));

  const carriedForgeWebScriptAssets = new Set<string>();

  const carryForgeWebScriptAsset = (sourcePath: string): void => {
    const sourceKey = path.resolve(sourcePath);
    if (carriedForgeWebScriptAssets.has(sourceKey)) {
      return;
    }
    carriedForgeWebScriptAssets.add(sourceKey);

    copyAsset(mirrorHelperDir(sourcePath), path.basename(sourcePath), sourcePath, sourcePath);
    const declarationPath = `${sourcePath}.d.ts`;
    if (existsSync(declarationPath)) {
      copyAsset(mirrorHelperDir(sourcePath), path.basename(declarationPath), declarationPath, declarationPath);
    }

    const source = readFileSync(sourcePath, 'utf8');
    const importPattern = /\bimport\s+["'](\.{1,2}\/[^"']+\.fws)["']/g;
    for (const match of source.matchAll(importPattern)) {
      const nestedPath = path.resolve(path.dirname(sourcePath), match[1] as string);
      if (existsSync(nestedPath)) {
        carryForgeWebScriptAsset(nestedPath);
      }
    }
  };

  const carryHelperModule = (sourcePath: string): void => {
    const sourceKey = path.resolve(sourcePath);
    if (carriedHelpers.has(sourceKey)) {
      return;
    }
    carriedHelpers.add(sourceKey);

    if (path.basename(sourcePath, path.extname(sourcePath)) === 'index') {
      const indexSource = readFileSync(sourcePath, 'utf8');
      const indexParsed = parseTsx(sourcePath, indexSource);
      helperExportedTypes.set('index', readExportedTypeNames(indexParsed));
      const graph = graphForSource(sourcePath);
      for (const edge of (graph?.edges ?? []).filter(
        (candidate) => candidate.from === sourcePath && candidate.resolved && candidate.to !== undefined,
      )) {
        const nestedNode = graph?.nodes.get(edge.to as string);
        if (nestedNode?.kind === 'asset' && path.extname(nestedNode.id) === '.fws') {
          carryForgeWebScriptAsset(nestedNode.id);
          continue;
        }
        if (
          nestedNode !== undefined &&
          nestedNode.kind !== 'component' &&
          nestedNode.kind !== 'style' &&
          nestedNode.kind !== 'asset'
        ) {
          carryHelperModule(nestedNode.id);
        }
      }
      pendingIndexSources.add(sourcePath);
      return;
    }

    const base = path.basename(sourcePath, path.extname(sourcePath));
    const source = readFileSync(sourcePath, 'utf8');
    const parsed = parseTsx(sourcePath, source);
    const neutral = readNeutralImports(sourcePath, source);
    const usesNeutral = neutral.values.length > 0 || neutral.types.length > 0;

    if (usesNeutral) {
      const compiled = context.compile({
        source,
        fileName: sourcePath,
        moduleKind: 'composable',
        router,
        routerPlugins,
        routerConditions,
      });
      writeCompiledModule(mirrorHelperDir(sourcePath), base, compiled, sourcePath);
    } else {
      // Verbatim helpers keep their authored relative imports; the mirrored tree
      // makes `../`-climbing specifiers resolve as-is, and any flat `./sibling`
      // is nested by the shared rewrite pass below.
      writeModule(mirrorHelperDir(sourcePath), path.basename(sourcePath), source, sourcePath);
    }

    // Record the helper's exported types so companion types declared there
    // resolve to it rather than dangling off a component module.
    if (!helperExportedTypes.has(base)) {
      helperExportedTypes.set(base, readExportedTypeNames(parsed));
    }

    // Follow the helper's own relative (non-component) imports transitively.
    const graph = graphForSource(sourcePath);
    for (const edge of (graph?.edges ?? []).filter(
      (candidate) => candidate.from === sourcePath && candidate.resolved && candidate.to !== undefined,
    )) {
      const nestedNode = graph?.nodes.get(edge.to as string);
      if (nestedNode?.kind === 'asset' && path.extname(nestedNode.id) === '.fws') {
        carryForgeWebScriptAsset(nestedNode.id);
        continue;
      }
      if (
        nestedNode !== undefined &&
        nestedNode.kind !== 'component' &&
        nestedNode.kind !== 'style' &&
        nestedNode.kind !== 'asset'
      ) {
        carryHelperModule(nestedNode.id);
      }
    }
  };

  return carryHelperModule;
}

/**
 * Resolve a relative Sass `@use` / `@forward` / `@import` specifier to a file on
 * disk, including the underscore partial convention (`./name` → `_name.scss`).
 */
function resolveScssPartial(fromDirectory: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) {
    return undefined;
  }
  const resolved = path.resolve(fromDirectory, specifier);
  const directory = path.dirname(resolved);
  const base = path.basename(resolved);
  const candidates = [
    resolved,
    `${resolved}.scss`,
    `${resolved}.sass`,
    path.join(directory, `_${base}.scss`),
    path.join(directory, `_${base}.sass`),
    path.join(directory, `_${base}`),
  ];
  return candidates.find((candidate) => existsSync(candidate) && !existsSync(candidate + '/'));
}

/** Collect transitive relative Sass partials referenced from a stylesheet. */
function collectScssPartials(stylePath: string, seen: Set<string> = new Set()): readonly string[] {
  if (seen.has(stylePath) || !existsSync(stylePath)) {
    return [];
  }
  seen.add(stylePath);
  const source = readFileSync(stylePath, 'utf8');
  const directory = path.dirname(stylePath);
  const deps: string[] = [];
  const usePattern = /@(?:use|forward|import)\s+['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(usePattern)) {
    const partial = resolveScssPartial(directory, match[1] ?? '');
    if (partial === undefined) {
      continue;
    }
    deps.push(partial, ...collectScssPartials(partial, seen));
  }
  return deps;
}

export function copyComponentOwnStyles(input: {
  readonly graph: ForgeFileGraph;
  readonly source: string;
  readonly sourcePath: string;
  readonly sourceRoot: string;
  readonly targetId: string;
  readonly mirrorDir: (sourceAbsPath: string) => string;
  readonly copyAsset: (dir: string, fileName: string, sourcePath: string, sourceId?: string) => void;
}): void {
  const { graph, source, sourcePath, sourceRoot, targetId, mirrorDir, copyAsset } = input;

  for (const edge of graph.edges.filter(
    (candidate) =>
      candidate.from === sourcePath &&
      candidate.resolved &&
      candidate.to !== undefined &&
      candidate.relation === 'style',
  )) {
    const styleNode = graph.nodes.get(edge.to as string);
    if (styleNode === undefined) {
      continue;
    }
    const styleImport = readStyleImports(sourcePath, source, sourceRoot).find(
      (entry) => entry.specifier === edge.specifier,
    );
    const inlinedInVueSfc = targetId === 'vue' && styleImport?.name !== undefined;
    if (inlinedInVueSfc) {
      continue;
    }
    copyAsset(mirrorDir(styleNode.id), path.basename(styleNode.id), styleNode.id, styleNode.id);
    // Carry co-located Sass partials referenced via @use/@forward/@import so
    // generated framework trees can resolve `@use './component-properties'`.
    for (const partial of collectScssPartials(styleNode.id)) {
      copyAsset(mirrorDir(partial), path.basename(partial), partial, partial);
    }
  }
}

export function carrySpriteHelpers(input: {
  readonly sourceRoot: string;
  readonly carryHelperModule: (sourcePath: string) => void;
}): void {
  const { sourceRoot, carryHelperModule } = input;
  const spriteDir = path.join(sourceRoot, 'sprite');
  const carrySpriteHelpersRecursively = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        carrySpriteHelpersRecursively(entryPath);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
        carryHelperModule(entryPath);
      }
    }
  };

  try {
    // Sprite tree is optional.
    readdirSync(spriteDir, { withFileTypes: true });
    carrySpriteHelpersRecursively(spriteDir);
  } catch {
    // noop
  }
}
