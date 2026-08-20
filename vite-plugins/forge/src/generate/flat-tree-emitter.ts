import { mkdirSync } from 'node:fs';
import path from 'node:path';

import type { ForgeArtifactWriter } from '../compiler/artifact-writer.js';
import type { GeneratedModule } from '@mission-platform/forge-plugin-api';

const KNOWN_MODULE_EXT = /(\.d\.ts|\.vue|\.svelte|\.tsx|\.ts|\.jsx|\.js)$/;

type RewriteTarget = {
  readonly file: string;
  readonly dir: string;
  readonly sourceId?: string;
};

export interface ForgeFlatTreeEmitter {
  readonly moduleRegistry: Map<string, { dir: string; file: string }>;
  readonly moduleRegistryCollisions: Set<string>;
  readonly sourceModuleRegistry: Map<string, { dir: string; file: string }>;
  readonly rewriteTargets: RewriteTarget[];

  readonly moduleBase: (fileName: string) => string;
  readonly mirrorDir: (sourceAbsPath: string) => string;
  readonly mirrorHelperDir: (sourceAbsPath: string) => string;
  readonly relSpecifier: (fromDir: string, targetDir: string, fileName: string) => string;

  writeModule: (dir: string, fileName: string, code: string, sourceId?: string) => void;
  copyAsset: (dir: string, fileName: string, sourcePath: string, sourceId?: string) => void;
  writeCompiledModule: (
    dir: string,
    fileName: string,
    compiled: GeneratedModule,
    sourceId?: string,
  ) => void;
}

export function createFlatTreeEmitter(input: {
  readonly outDir: string;
  readonly sourceRoot: string;
  readonly writer: ForgeArtifactWriter;
}): ForgeFlatTreeEmitter {
  const { outDir, sourceRoot, writer } = input;

  const toPosix = (value: string): string => value.split(path.sep).join('/');
  const normaliseDir = (dir: string): string => (dir === '.' || dir === '' ? '' : toPosix(dir));

  const mirrorDir = (sourceAbsPath: string): string => {
    const relative = toPosix(path.relative(sourceRoot, path.dirname(sourceAbsPath)));
    return relative.startsWith('..') ? '' : normaliseDir(relative);
  };
  const mirrorHelperDir = (sourceAbsPath: string): string => mirrorDir(sourceAbsPath);

  const moduleBase = (fileName: string): string => fileName.replace(KNOWN_MODULE_EXT, '');

  const moduleRegistry = new Map<string, { dir: string; file: string }>();
  const moduleRegistryCollisions = new Set<string>();
  const sourceModuleRegistry = new Map<string, { dir: string; file: string }>();
  const rewriteTargets: RewriteTarget[] = [];

  const registerModule = (fileName: string, target: { dir: string; file: string }): void => {
    const base = moduleBase(fileName);
    const previous = moduleRegistry.get(base);
    if (previous !== undefined && (previous.dir !== target.dir || previous.file !== target.file)) {
      moduleRegistryCollisions.add(base);
    } else if (!moduleRegistryCollisions.has(base)) {
      moduleRegistry.set(base, target);
    }
  };

  const relSpecifier = (fromDir: string, targetDir: string, fileName: string): string => {
    const rel = path.posix.relative(fromDir, path.posix.join(targetDir, fileName));
    return rel.startsWith('.') ? rel : `./${rel}`;
  };

  const writeModule = (dir: string, fileName: string, code: string, sourceId?: string): void => {
    const normalised = normaliseDir(dir);
    const destination = path.join(outDir, normalised, fileName);
    mkdirSync(path.dirname(destination), { recursive: true });
    writer.writeText(path.relative(outDir, destination), code, 'module');
    const target = { dir: normalised, file: fileName };
    registerModule(fileName, target);

    // Directory imports such as `../../../utils` resolve to an index module;
    // register the directory base as an alias so target emitters can use their
    // flat `./utils` form before the final relative-path rewrite.
    if (moduleBase(fileName) === 'index' && normalised !== '') {
      registerModule(path.posix.basename(normalised), target);
    }

    if (sourceId !== undefined) {
      sourceModuleRegistry.set(path.resolve(sourceId), target);
    }
    rewriteTargets.push({ file: destination, dir: normalised, sourceId });
  };

  const copyAsset = (dir: string, fileName: string, sourcePath: string, sourceId?: string): void => {
    const normalised = normaliseDir(dir);
    const destination = path.join(outDir, normalised, fileName);
    mkdirSync(path.dirname(destination), { recursive: true });
    writer.copyFile(
      path.relative(outDir, destination),
      sourcePath,
      fileName.endsWith('.d.ts') ? 'declaration' : 'asset',
    );
    const target = { dir: normalised, file: fileName };
    registerModule(fileName, target);
    if (sourceId !== undefined) {
      sourceModuleRegistry.set(path.resolve(sourceId), target);
    }
  };

  const writeCompiledModule = (
    dir: string,
    fileName: string,
    compiled: GeneratedModule,
    sourceId?: string,
  ): void => {
    writeModule(dir, `${fileName}.${compiled.lang}`, compiled.code, sourceId);
    for (const extra of compiled.extraModules ?? []) {
      writeModule(dir, `${extra.name}.${extra.lang}`, extra.code);
    }
    if (compiled.map !== undefined) {
      const map = typeof compiled.map === 'string' ? compiled.map : JSON.stringify(compiled.map);
      writeModule(dir, `${fileName}.map`, map);
    }
    for (const declaration of compiled.declarations ?? []) {
      writeModule(dir, declaration.name, declaration.code);
    }
  };

  return {
    moduleRegistry,
    moduleRegistryCollisions,
    sourceModuleRegistry,
    rewriteTargets,
    moduleBase,
    mirrorDir,
    mirrorHelperDir,
    relSpecifier,
    writeModule,
    copyAsset,
    writeCompiledModule,
  };
}
