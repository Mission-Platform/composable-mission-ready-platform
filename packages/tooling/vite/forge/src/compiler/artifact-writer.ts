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

/** Compute SHA-256 hex digest for the given buffer contents. */
function digest(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

/** Determine the default artifact kind based on file extension. */
function defaultArtifactKind(relativeName: string): ForgeArtifactKind {
  if (relativeName.endsWith('.d.ts')) return 'declaration';
  if (relativeName.endsWith('.map')) return 'map';
  if (relativeName.endsWith('.css')) return 'style';
  if (relativeName.endsWith('.js')) return 'module';
  return 'asset';
}

/** Read and parse a manifest file safely if present and valid JSON. */
function tryReadManifest(manifestPath: string): Partial<ForgeArtifactManifest> | undefined {
  if (!existsSync(manifestPath)) return undefined;
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8')) as Partial<ForgeArtifactManifest>;
  } catch {
    return undefined;
  }
}

/** Check artifact list for duplicate entries. */
function assertNoDuplicateArtifacts(artifacts: readonly { readonly fileName: string }[]): void {
  const names = new Set<string>();
  for (const artifact of artifacts) {
    validateForgeArtifactName(artifact.fileName);
    if (names.has(artifact.fileName)) {
      throw new Error(`Forge artifact manifest contains a duplicate: ${artifact.fileName}`);
    }
    names.add(artifact.fileName);
  }
}

/** Validate any existing manifest in the target directory before attempting a write. */
function validatePreviousManifest(outDir: string): void {
  const manifestPath = resolveForgeArtifactPath(outDir, MANIFEST_FILE);
  const manifest = tryReadManifest(manifestPath);
  if (manifest === undefined || manifest.version !== 1 || !Array.isArray(manifest.artifacts)) return;
  assertNoDuplicateArtifacts(manifest.artifacts);
}

interface ExistingArtifactTimes {
  readonly hash: string;
  readonly atimeMs: number;
  readonly mtimeMs: number;
}

/** Process an entry in the existing artifact directory for time collection. */
function recordExistingEntryTime(
  root: string,
  entry: import('node:fs').Dirent,
  directory: string,
  result: Map<string, ExistingArtifactTimes>,
): void {
  const absolute = path.join(directory, entry.name);
  const relative = path.relative(root, absolute).split(path.sep).join('/');
  if (relative === MANIFEST_FILE) return;
  if (lstatSync(absolute).isSymbolicLink()) {
    throw new Error(`Forge artifact path contains a symlink: ${relative}`);
  }
  if (entry.isDirectory()) {
    walkExistingArtifactTimes(root, absolute, result);
    return;
  }
  if (entry.isFile()) {
    const stat = statSync(absolute);
    result.set(relative, { hash: digest(readFileSync(absolute)), atimeMs: stat.atimeMs, mtimeMs: stat.mtimeMs });
  }
}

/** Recursively traverse a directory to record artifact modification times. */
function walkExistingArtifactTimes(root: string, directory: string, result: Map<string, ExistingArtifactTimes>): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    recordExistingEntryTime(root, entry, directory, result);
  }
}

/** Collect modification timestamps and hashes of existing published artifacts. */
function collectExistingArtifactTimes(root: string): Map<string, ExistingArtifactTimes> {
  const result = new Map<string, ExistingArtifactTimes>();
  if (!existsSync(root)) return result;
  walkExistingArtifactTimes(root, root, result);
  return result;
}

export interface ForgeArtifactWriterOptions {
  /** Caller-owned attempt directory. Defaults to a process-scoped sibling. */
  readonly attemptDirectory?: string;
}

/** Remove an attempt candidate directory if valid and not a symlink. */
function removeAttemptCandidate(parent: string, entryName: string, prefix: string): void {
  if (!entryName.startsWith(prefix)) return;
  const candidate = path.join(parent, entryName);
  if (lstatSync(candidate).isSymbolicLink()) return;
  rmSync(candidate, { recursive: true, force: true });
}

/** Remove abandoned attempts belonging to one generated target tree only. */
export function cleanupForgeArtifactAttempts(outDir: string, targetId: string): void {
  const safeTargetId = targetId.replaceAll('\\', '/').replaceAll('/', '-');
  const prefix = `.forge-attempt-${path.basename(path.resolve(outDir))}-${safeTargetId}-`;
  const parent = path.dirname(path.resolve(outDir));
  if (!existsSync(parent)) return;
  for (const entry of readdirSync(parent, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      removeAttemptCandidate(parent, entry.name, prefix);
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

/** Resolve fallback entry points from artifact records when no explicit entry is specified. */
function resolveFallbackEntries(records: ReadonlyMap<string, ForgeArtifactRecord>): readonly string[] {
  if (records.has('index.js')) return ['index.js'];
  const indexMatch = [...records.keys()].find((fileName) => /(?:^|\/)index\.js$/.test(fileName));
  if (indexMatch !== undefined) return [indexMatch];
  const jsMatch = [...records.keys()].find((fileName) => fileName.endsWith('.js'));
  return jsMatch !== undefined ? [jsMatch] : [];
}

/** Map candidate entry names to existing index or canonical file names. */
function normalizeEntryCandidate(stageDirectory: string, entry: string): string {
  const candidate = /(?:^|\/)entry(?:[:_])/.test(entry) ? 'index.js' : entry;
  return validateForgeArtifactName(existsSync(path.join(stageDirectory, candidate)) ? candidate : entry);
}

/** Record a single file artifact from the staging directory into the records map. */
function recordStageFile(
  stageDirectory: string,
  absolute: string,
  recordedEntryNames: ReadonlySet<string>,
  kindForFile: (relativeName: string) => ForgeArtifactKind,
  records: Map<string, ForgeArtifactRecord>,
): void {
  const relativeName = path.relative(stageDirectory, absolute).split(path.sep).join('/');
  if (relativeName === MANIFEST_FILE) return;
  if (lstatSync(absolute).isSymbolicLink()) {
    throw new Error(`Forge artifact path contains a symlink: ${relativeName}`);
  }
  const fileName = validateForgeArtifactName(relativeName);
  const contents = readFileSync(absolute);
  const kind = recordedEntryNames.has(fileName) ? 'entry' : kindForFile(fileName);
  records.set(fileName, { fileName, kind, hash: digest(contents), size: contents.byteLength });
}

/** Recursively traverse and record artifacts in the stage directory. */
function walkStageDirectory(
  stageDirectory: string,
  currentDirectory: string,
  recordedEntryNames: ReadonlySet<string>,
  kindForFile: (relativeName: string) => ForgeArtifactKind,
  records: Map<string, ForgeArtifactRecord>,
): void {
  for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
    const absolute = path.join(currentDirectory, entry.name);
    if (entry.isDirectory()) {
      walkStageDirectory(stageDirectory, absolute, recordedEntryNames, kindForFile, records);
    } else if (entry.isFile()) {
      recordStageFile(stageDirectory, absolute, recordedEntryNames, kindForFile, records);
    } else {
      const relativeName = path.relative(stageDirectory, absolute).split(path.sep).join('/');
      throw new Error(`Forge artifact path is not a regular file: ${relativeName}`);
    }
  }
}

/** Resolve effective entry points and promote fallback entry in artifact records if needed. */
function resolveRecordedEntries(
  recordedEntryNames: ReadonlySet<string>,
  records: Map<string, ForgeArtifactRecord>,
): string[] {
  const availableEntries = [...recordedEntryNames].filter((entry) => records.has(entry));
  if (availableEntries.length > 0) return availableEntries;
  const fallbackEntries = resolveFallbackEntries(records);
  const fallbackEntry = fallbackEntries[0];
  if (fallbackEntry === undefined) return [];
  const artifact = records.get(fallbackEntry);
  if (artifact !== undefined) records.set(fallbackEntry, { ...artifact, kind: 'entry' });
  return [fallbackEntry];
}

/** Resolve sorted, unique, and validated entry names for manifest validation. */
function resolveValidationEntries(
  entries: readonly string[],
  manifestEntries: readonly string[],
  records: ReadonlyMap<string, ForgeArtifactRecord>,
  targetId: string,
  stageDirectory: string,
): string[] {
  let candidateEntries = entries;
  if (candidateEntries.length === 0) {
    candidateEntries = manifestEntries.length > 0 ? manifestEntries : resolveFallbackEntries(records);
  }
  const safeEntries = [...new Set(candidateEntries.map((entry) => validateForgeArtifactName(entry)))].sort();
  if (safeEntries.length === 0) {
    throw new Error(`Forge artifact target "${targetId}" produced no entry points in ${stageDirectory}.`);
  }
  return safeEntries;
}

/** Verify that all declared entry names exist in the recorded artifacts set. */
function assertEntriesRecorded(entries: readonly string[], artifacts: ReadonlySet<string>): void {
  for (const entry of entries) {
    if (!artifacts.has(entry)) {
      throw new Error(`Forge artifact entry is not recorded: ${entry}`);
    }
  }
}

/** Verify that an on-disk artifact file exists and is a regular file. */
function assertArtifactFileExists(artifactPath: string, fileName: string): void {
  if (!existsSync(artifactPath) || !lstatSync(artifactPath).isFile()) {
    throw new Error(`Forge artifact is missing from the attempt: ${fileName}`);
  }
}

/** Verify that artifact file contents match recorded digest and byte size. */
function assertArtifactContentsMatch(contents: Buffer, artifact: ForgeArtifactRecord): void {
  if (digest(contents) !== artifact.hash || contents.byteLength !== artifact.size) {
    throw new Error(`Forge artifact failed validation: ${artifact.fileName}`);
  }
}

/** Verify that a single staged artifact matches its recorded metadata on disk. */
function assertSingleArtifactMatch(stageDirectory: string, artifact: ForgeArtifactRecord): void {
  const artifactPath = resolveForgeArtifactPath(stageDirectory, artifact.fileName);
  assertArtifactFileExists(artifactPath, artifact.fileName);
  assertArtifactContentsMatch(readFileSync(artifactPath), artifact);
}

/** Verify that on-disk files match recorded sizes and digests in the stage directory. */
function assertArtifactFilesMatch(stageDirectory: string, artifacts: readonly ForgeArtifactRecord[]): void {
  for (const artifact of artifacts) {
    assertSingleArtifactMatch(stageDirectory, artifact);
  }
}

/** Check whether published artifact exists on disk and its content hash is unchanged. */
function isArtifactContentUnchanged(filePath: string, expectedHash: string): boolean {
  return existsSync(filePath) && digest(readFileSync(filePath)) === expectedHash;
}

/** Restore previous access and modification timestamps for unchanged artifacts. */
function restoreUnchangedArtifactTimes(
  safeOutDir: string,
  previousTimes: ReadonlyMap<string, ExistingArtifactTimes>,
): void {
  for (const [fileName, previous] of previousTimes) {
    const currentPath = resolveForgeArtifactPath(safeOutDir, fileName);
    if (isArtifactContentUnchanged(currentPath, previous.hash)) {
      utimesSync(currentPath, previous.atimeMs / 1000, previous.mtimeMs / 1000);
    }
  }
}

/** Roll back staged output swap if committing the attempt fails. */
function rollbackCommittedStage(safeOutDir: string, backup: string, backedUp: boolean): void {
  if (existsSync(safeOutDir)) rmSync(safeOutDir, { recursive: true, force: true });
  if (backedUp && existsSync(backup)) renameSync(backup, safeOutDir);
}

/** Atomically swap the staged attempt directory into the published destination. */
function swapStageIntoPlace(
  stageDirectory: string,
  safeOutDir: string,
  backup: string,
  previousTimes: ReadonlyMap<string, ExistingArtifactTimes>,
): void {
  let backedUp = false;
  try {
    if (existsSync(safeOutDir)) {
      renameSync(safeOutDir, backup);
      backedUp = true;
    }
    renameSync(stageDirectory, safeOutDir);
    restoreUnchangedArtifactTimes(safeOutDir, previousTimes);
    if (backedUp) rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    rollbackCommittedStage(safeOutDir, backup, backedUp);
    throw error;
  }
}

/** Create an atomic artifact writer for staging and committing Forge artifacts. */
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

  /** Write a file buffer to the staging directory and record its artifact metadata. */
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
      const recordedEntryNames = new Set(entries.map((entry) => normalizeEntryCandidate(stageDirectory, entry)));
      walkStageDirectory(stageDirectory, stageDirectory, recordedEntryNames, kindForFile, records);
      entryNames = resolveRecordedEntries(recordedEntryNames, records);
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
      const safeEntries = resolveValidationEntries(entries, manifest.entries, records, targetId, stageDirectory);
      const artifactNames = new Set(manifest.artifacts.map((artifact) => artifact.fileName));
      assertEntriesRecorded(safeEntries, artifactNames);
      assertArtifactFilesMatch(stageDirectory, manifest.artifacts);
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
      swapStageIntoPlace(stageDirectory, safeOutDir, backup, previousTimes);
      committed = true;
      return manifest;
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
