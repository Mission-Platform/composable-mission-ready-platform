import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
  createForgeArtifactManifest,
  type ForgeArtifactKind,
  type ForgeArtifactManifest,
  type ForgeArtifactRecord,
} from './artifact-manifest.js';
import {
  assertForgeArtifactRoot,
  ensureForgeArtifactDirectory,
  resolveForgeArtifactPath,
  validateForgeArtifactName,
} from './artifact-path.js';

const MANIFEST_FILE = '.forge-artifact-manifest.json';

export interface ForgeArtifactWriter {
  /** Directory containing the unpublished attempt. */
  readonly stageDirectory: string;
  writeText(relativeName: string, contents: string, kind: ForgeArtifactKind): void;
  writeBinary(relativeName: string, contents: Buffer, kind: ForgeArtifactKind): void;
  copyFile(relativeName: string, sourcePath: string, kind: ForgeArtifactKind): void;
  /** Record files emitted by a native bundler into this attempt's manifest. */
  recordTree(entries?: readonly string[], kindForFile?: (relativeName: string) => ForgeArtifactKind): void;
  readText(relativeName: string): string;
  /** Validate every recorded artifact and return the unpublished manifest. */
  validate(entries?: readonly string[]): ForgeArtifactManifest;
  /** Atomically replace the target output with the validated attempt. */
  commit(): ForgeArtifactManifest;
  /** Remove only this writer's unpublished attempt. */
  abort(): void;
  /** Compatibility convenience: validate and commit the attempt. */
  finalize(entries?: readonly string[]): ForgeArtifactManifest;
}

function digest(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

function defaultArtifactKind(relativeName: string): ForgeArtifactKind {
  if (relativeName.endsWith('.d.ts')) return 'declaration';
  if (relativeName.endsWith('.map')) return 'map';
  if (relativeName.endsWith('.css')) return 'style';
  if (relativeName.endsWith('.js')) return 'module';
  return 'asset';
}

function validatePreviousManifest(outDir: string): void {
  const manifestPath = resolveForgeArtifactPath(outDir, MANIFEST_FILE);
  if (!existsSync(manifestPath)) return;
  let manifest: Partial<ForgeArtifactManifest>;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Partial<ForgeArtifactManifest>;
  } catch {
    return;
  }
  if (manifest.version !== 1 || !Array.isArray(manifest.artifacts)) return;
  const names = new Set<string>();
  for (const artifact of manifest.artifacts) {
    validateForgeArtifactName(artifact.fileName);
    if (names.has(artifact.fileName)) {
      throw new Error(`Forge artifact manifest contains a duplicate: ${artifact.fileName}`);
    }
    names.add(artifact.fileName);
  }
}

interface ExistingArtifactTimes {
  readonly hash: string;
  readonly atimeMs: number;
  readonly mtimeMs: number;
}

function collectExistingArtifactTimes(root: string): Map<string, ExistingArtifactTimes> {
  const result = new Map<string, ExistingArtifactTimes>();
  if (!existsSync(root)) return result;
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (relative === MANIFEST_FILE) continue;
      if (lstatSync(absolute).isSymbolicLink()) {
        throw new Error(`Forge artifact path contains a symlink: ${relative}`);
      }
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        const stat = statSync(absolute);
        result.set(relative, { hash: digest(readFileSync(absolute)), atimeMs: stat.atimeMs, mtimeMs: stat.mtimeMs });
      }
    }
  };
  visit(root);
  return result;
}

export interface ForgeArtifactWriterOptions {
  /** Caller-owned attempt directory. Defaults to a process-scoped sibling. */
  readonly attemptDirectory?: string;
}

/** Remove abandoned attempts belonging to one generated target tree only. */
export function cleanupForgeArtifactAttempts(outDir: string, targetId: string): void {
  const safeTargetId = targetId.replaceAll('\\', '/').replaceAll('/', '-');
  const prefix = `.forge-attempt-${path.basename(path.resolve(outDir))}-${safeTargetId}-`;
  const parent = path.dirname(path.resolve(outDir));
  if (!existsSync(parent)) return;
  for (const entry of readdirSync(parent, { withFileTypes: true })) {
    if (!entry.name.startsWith(prefix)) continue;
    const candidate = path.join(parent, entry.name);
    if (entry.isDirectory() && !lstatSync(candidate).isSymbolicLink()) {
      rmSync(candidate, { recursive: true, force: true });
    }
  }
}

let attemptSequence = 0;

/** Allocate an owned sibling directory for a native target build attempt. */
export function forgeArtifactAttemptDirectory(outDir: string, targetId: string): string {
  const safeOutDir = assertForgeArtifactRoot(outDir);
  const safeTargetId = validateForgeArtifactName(targetId.replaceAll('\\', '/').replaceAll('/', '-'));
  return path.join(
    path.dirname(safeOutDir),
    `.forge-attempt-${path.basename(safeOutDir)}-${safeTargetId}-${process.pid}-${++attemptSequence}`,
  );
}

function resolveFallbackEntries(records: ReadonlyMap<string, ForgeArtifactRecord>): readonly string[] {
  if (records.has('index.js')) return ['index.js'];
  const indexMatch = [...records.keys()].find((fileName) => /(?:^|\/)index\.js$/.test(fileName));
  if (indexMatch !== undefined) return [indexMatch];
  const jsMatch = [...records.keys()].find((fileName) => fileName.endsWith('.js'));
  return jsMatch !== undefined ? [jsMatch] : [];
}

export function createForgeArtifactWriter(
  outDir: string,
  targetId: string,
  options: ForgeArtifactWriterOptions = {},
): ForgeArtifactWriter {
  const safeOutDir = assertForgeArtifactRoot(outDir);
  validatePreviousManifest(safeOutDir);
  const safeTargetId = validateForgeArtifactName(targetId.replaceAll('\\', '/').replaceAll('/', '-'));
  const stageDirectory = options.attemptDirectory ?? forgeArtifactAttemptDirectory(safeOutDir, safeTargetId);
  if (path.resolve(stageDirectory) === safeOutDir) {
    throw new Error('Forge artifact attempt directory must differ from its published output directory.');
  }
  const records = new Map<string, ForgeArtifactRecord>();
  const pending = new Map<string, Buffer>();
  const manifestPath = resolveForgeArtifactPath(stageDirectory, MANIFEST_FILE);
  let committed = false;
  let aborted = false;
  let validatedManifest: ForgeArtifactManifest | undefined;
  let entryNames: readonly string[] = [];

  // Never touch the last successful output while an attempt is being built.
  // The stage is owned by this invocation and can safely be discarded on any
  // generation, declaration, native-build, or promotion failure.
  if (existsSync(stageDirectory)) rmSync(stageDirectory, { recursive: true, force: true });
  ensureForgeArtifactDirectory(stageDirectory, stageDirectory);

  const write = (relativeName: string, contents: Buffer, kind: ForgeArtifactKind): void => {
    if (aborted) throw new Error('Forge artifact attempt has been aborted.');
    const fileName = validateForgeArtifactName(relativeName);
    const target = resolveForgeArtifactPath(stageDirectory, fileName);
    // Also inspect a same-named path in the published tree. A symlink there
    // must fail closed rather than being hidden by the new isolated attempt.
    if (existsSync(safeOutDir)) resolveForgeArtifactPath(safeOutDir, fileName);
    const hash = digest(contents);
    pending.set(fileName, contents);
    records.set(fileName, { fileName, kind, hash, size: contents.byteLength });
    ensureForgeArtifactDirectory(stageDirectory, path.dirname(target));
    writeFileSync(target, contents);
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
    recordTree(entries = [], kindForFile = defaultArtifactKind) {
      if (aborted) throw new Error('Forge artifact attempt has been aborted.');
      const recordedEntryNames = new Set(
        entries.map((entry) => {
          const candidate = /(?:^|\/)entry(?:[:_])/.test(entry) ? 'index.js' : entry;
          return validateForgeArtifactName(existsSync(path.join(stageDirectory, candidate)) ? candidate : entry);
        }),
      );
      const visit = (directory: string): void => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const absolute = path.join(directory, entry.name);
          const relativeName = path.relative(stageDirectory, absolute).split(path.sep).join('/');
          if (relativeName === MANIFEST_FILE) continue;
          if (lstatSync(absolute).isSymbolicLink()) {
            throw new Error(`Forge artifact path contains a symlink: ${relativeName}`);
          }
          if (entry.isDirectory()) {
            visit(absolute);
            continue;
          }
          if (!entry.isFile()) {
            throw new Error(`Forge artifact path is not a regular file: ${relativeName}`);
          }
          const fileName = validateForgeArtifactName(relativeName);
          const contents = readFileSync(absolute);
          const kind = recordedEntryNames.has(fileName) ? 'entry' : kindForFile(fileName);
          records.set(fileName, { fileName, kind, hash: digest(contents), size: contents.byteLength });
        }
      };
      visit(stageDirectory);
      const availableEntries = [...recordedEntryNames].filter((entry) => records.has(entry));
      const fallbackEntries = resolveFallbackEntries(records);
      const fallbackEntry = fallbackEntries[0];
      const resolvedEntries =
        availableEntries.length > 0 ? availableEntries : fallbackEntry === undefined ? [] : [fallbackEntry];
      if (availableEntries.length === 0 && fallbackEntry !== undefined) {
        const artifact = records.get(fallbackEntry);
        if (artifact !== undefined) records.set(fallbackEntry, { ...artifact, kind: 'entry' });
      }
      recordedEntryNames.clear();
      resolvedEntries.forEach((entry) => recordedEntryNames.add(entry));
      entryNames = [...recordedEntryNames];
    },
    readText(relativeName) {
      if (aborted) throw new Error('Forge artifact attempt has been aborted.');
      const fileName = validateForgeArtifactName(relativeName);
      const target = resolveForgeArtifactPath(stageDirectory, fileName);
      const contents = pending.get(fileName) ?? readFileSync(target);
      return contents.toString('utf8');
    },
    stageDirectory,
    validate(entries = entryNames) {
      if (aborted) throw new Error('Forge artifact attempt has been aborted.');
      if (committed) throw new Error('Forge artifact attempt has already been committed.');
      const manifest = createForgeArtifactManifest(targetId, [...records.values()], true);
      let candidateEntries = entries;
      if (candidateEntries.length === 0) {
        candidateEntries = manifest.entries.length > 0 ? manifest.entries : resolveFallbackEntries(records);
      }
      const safeEntries = [...new Set(candidateEntries.map((entry) => validateForgeArtifactName(entry)))].sort();
      if (safeEntries.length === 0) {
        throw new Error(`Forge artifact target "${targetId}" produced no entry points in ${stageDirectory}.`);
      }
      const artifacts = new Set(manifest.artifacts.map((artifact) => artifact.fileName));
      for (const entry of safeEntries) {
        if (!artifacts.has(entry)) throw new Error(`Forge artifact entry is not recorded: ${entry}`);
      }
      for (const artifact of manifest.artifacts) {
        const artifactPath = resolveForgeArtifactPath(stageDirectory, artifact.fileName);
        if (!existsSync(artifactPath) || !lstatSync(artifactPath).isFile()) {
          throw new Error(`Forge artifact is missing from the attempt: ${artifact.fileName}`);
        }
        const contents = readFileSync(artifactPath);
        if (digest(contents) !== artifact.hash || contents.byteLength !== artifact.size) {
          throw new Error(`Forge artifact failed validation: ${artifact.fileName}`);
        }
      }
      const complete = { ...manifest, entries: safeEntries };
      writeFileSync(manifestPath, `${JSON.stringify(complete, null, 2)}\n`, 'utf8');
      entryNames = safeEntries;
      validatedManifest = complete;
      return complete;
    },
    commit() {
      if (aborted) throw new Error('Forge artifact attempt has been aborted.');
      const manifest = validatedManifest ?? this.validate();
      if (committed) return manifest;
      const parent = path.dirname(safeOutDir);
      mkdirSync(parent, { recursive: true });
      const backup = `${safeOutDir}.forge-previous-${process.pid}-${attemptSequence}`;
      const previousTimes = collectExistingArtifactTimes(safeOutDir);
      let backedUp = false;
      try {
        if (existsSync(safeOutDir)) {
          renameSync(safeOutDir, backup);
          backedUp = true;
        }
        renameSync(stageDirectory, safeOutDir);
        committed = true;
        for (const [fileName, previous] of previousTimes) {
          const currentPath = resolveForgeArtifactPath(safeOutDir, fileName);
          if (existsSync(currentPath) && digest(readFileSync(currentPath)) === previous.hash) {
            utimesSync(currentPath, previous.atimeMs / 1000, previous.mtimeMs / 1000);
          }
        }
        if (backedUp) rmSync(backup, { recursive: true, force: true });
        return manifest;
      } catch (error) {
        if (existsSync(safeOutDir)) rmSync(safeOutDir, { recursive: true, force: true });
        if (backedUp && existsSync(backup)) renameSync(backup, safeOutDir);
        throw error;
      }
    },
    abort() {
      aborted = true;
      if (!committed) rmSync(stageDirectory, { recursive: true, force: true });
    },
    finalize(entries = []) {
      this.validate(entries);
      return this.commit();
    },
  };
}
