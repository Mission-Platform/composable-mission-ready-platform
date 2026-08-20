import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  createForgeArtifactManifest,
  type ForgeArtifactKind,
  type ForgeArtifactManifest,
  type ForgeArtifactRecord,
} from './artifact-manifest.js';

const MANIFEST_FILE = '.forge-artifact-manifest.json';

export interface ForgeArtifactWriter {
  writeText(relativeName: string, contents: string, kind: ForgeArtifactKind): void;
  writeBinary(relativeName: string, contents: Buffer, kind: ForgeArtifactKind): void;
  copyFile(relativeName: string, sourcePath: string, kind: ForgeArtifactKind): void;
  readText(relativeName: string): string;
  finalize(entries?: readonly string[]): ForgeArtifactManifest;
}

function digest(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

function normaliseName(relativeName: string): string {
  const normalised = relativeName.split(path.sep).join('/').replace(/^\.\//, '');
  if (normalised.length === 0 || normalised.startsWith('../') || path.posix.isAbsolute(normalised)) {
    throw new Error(`Forge artifact path must stay inside the target tree: ${relativeName}`);
  }
  return normalised;
}

function readPreviousManifest(outDir: string): ForgeArtifactManifest | undefined {
  const manifestPath = path.join(outDir, MANIFEST_FILE);
  if (!existsSync(manifestPath)) return undefined;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ForgeArtifactManifest;
    return manifest.version === 1 && Array.isArray(manifest.artifacts) ? manifest : undefined;
  } catch {
    return undefined;
  }
}

function removeUnlistedFiles(outDir: string, retained: ReadonlySet<string>): void {
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(outDir, absolute).split(path.sep).join('/');
      if (relative === MANIFEST_FILE) continue;
      if (entry.isDirectory()) {
        visit(absolute);
        if (readdirSync(absolute).length === 0) rmSync(absolute, { recursive: true, force: true });
      } else if (!retained.has(relative)) {
        rmSync(absolute, { force: true });
      }
    }
  };
  visit(outDir);
}

export function createForgeArtifactWriter(outDir: string, targetId: string): ForgeArtifactWriter {
  const records = new Map<string, ForgeArtifactRecord>();
  const pending = new Map<string, Buffer>();
  const previous = readPreviousManifest(outDir);
  const manifestPath = path.join(outDir, MANIFEST_FILE);

  // A generated tree is owned by this writer. Never let an interrupted or
  // differently-targeted build become input to the next generation session:
  // without a complete matching manifest, there is no safe way to distinguish
  // current artifacts from stale modules left by an earlier target/build.
  if (previous === undefined) {
    if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  } else if (previous.targetId !== targetId) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });
  // The manifest is the commit marker for a complete generation. Remove it
  // before compiling so a failed session cannot leave stale output looking
  // valid to a later build; successful finalize() writes it back atomically.
  rmSync(manifestPath, { force: true });

  const previousForTarget = previous?.targetId === targetId ? previous : undefined;

  const write = (relativeName: string, contents: Buffer, kind: ForgeArtifactKind): void => {
    const fileName = normaliseName(relativeName);
    const hash = digest(contents);
    pending.set(fileName, contents);
    records.set(fileName, { fileName, kind, hash, size: contents.byteLength });
  };

  return {
    writeText(relativeName, contents, kind) {
      write(relativeName, Buffer.from(contents, 'utf8'), kind);
    },
    writeBinary(relativeName, contents, kind) {
      write(relativeName, contents, kind);
    },
    copyFile(relativeName, sourcePath, kind) {
      write(relativeName, readFileSync(sourcePath), kind);
    },
    readText(relativeName) {
      const fileName = normaliseName(relativeName);
      const contents = pending.get(fileName) ?? readFileSync(path.join(outDir, fileName));
      return contents.toString('utf8');
    },
    finalize(entries = []) {
      const manifest = createForgeArtifactManifest(targetId, [...records.values()], true);
      const retained = new Set(manifest.artifacts.map((artifact) => artifact.fileName));
      for (const artifact of previousForTarget?.artifacts ?? []) {
        if (!retained.has(artifact.fileName)) {
          rmSync(path.join(outDir, artifact.fileName), { force: true });
        }
      }
      removeUnlistedFiles(outDir, retained);
      for (const [fileName, contents] of pending) {
        const target = path.join(outDir, fileName);
        if (!existsSync(target) || digest(readFileSync(target)) !== digest(contents)) {
          mkdirSync(path.dirname(target), { recursive: true });
          writeFileSync(target, contents);
        }
      }
      const complete = createForgeArtifactManifest(targetId, [...records.values()], true);
      writeFileSync(
        path.join(outDir, MANIFEST_FILE),
        `${JSON.stringify({ ...complete, entries: [...entries].sort() }, null, 2)}\n`,
        'utf8',
      );
      return { ...complete, entries: [...entries].sort() };
    },
  };
}
