import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  applyCommitPlan,
  buildCommitMessage,
  captureCommitSnapshot,
  createCommitPlan,
  normalizeCommitPath,
  validateCommitMessage,
} from '../src/git/commit.ts';
import { runGit } from '../src/git/runner.ts';

function runFixtureGit(cwd: string, args: readonly string[]): string {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

describe('Git commit core', () => {
  it('builds and validates a conventional commit with body and footers', async () => {
    const input = {
      type: 'feat' as const,
      scope: 'git',
      description: 'add commit planning',
      body: 'Keep planning read-only.',
      footers: ['Refs: #123'],
    };
    assert.equal(buildCommitMessage(input), 'feat(git): add commit planning\n\nKeep planning read-only.\n\nRefs: #123');
    const validation = await validateCommitMessage(input);
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.errors, []);
  });

  it('returns commitlint diagnostics for invalid types and headers', async () => {
    const invalidType = await validateCommitMessage({
      type: 'unknown' as 'feat',
      description: 'use an unsupported type',
    });
    assert.equal(invalidType.valid, false);
    assert.ok(invalidType.errors.some((error) => error.startsWith('type-enum:')));

    const invalidHeader = await validateCommitMessage({
      type: 'feat',
      scope: 'Upper',
      description: `${'a'.repeat(70)}.`,
    });
    assert.equal(invalidHeader.valid, false);
    assert.ok(invalidHeader.errors.some((error) => error.startsWith('header-max-length:')));
    assert.throws(() => buildCommitMessage({ type: 'feat', description: 'invalid', footers: ['not a footer'] }));
    assert.throws(() => buildCommitMessage({ type: 'feat', description: 'bad\0message' }));
  });

  it('rejects unsafe, absolute, duplicate, and empty commit paths', () => {
    assert.equal(normalizeCommitPath('package.json'), 'package.json');
    assert.throws(() => normalizeCommitPath('../package.json'), /must not traverse/);
    assert.throws(() => normalizeCommitPath('/tmp/outside'), /repository-relative/);
    assert.throws(() => normalizeCommitPath(String.raw`C:\outside`), /repository-relative/);
    assert.throws(() => normalizeCommitPath(''), /non-empty/);
    assert.throws(
      () => captureCommitSnapshot('feat: safe path', { kind: 'paths', paths: ['package.json', 'package.json'] }),
      /duplicates/,
    );
  });

  it('previews staged-only and explicit-path modes without staging', async () => {
    const fixture = mkdtempSync(join(tmpdir(), 'mcp-commit-preview-'));
    const previousRoot = process.env.MISSION_REPO_ROOT;
    try {
      runFixtureGit(fixture, ['init', '--quiet']);
      runFixtureGit(fixture, ['config', 'user.name', 'Commit Test']);
      runFixtureGit(fixture, ['config', 'user.email', 'commit-test@example.test']);
      writeFileSync(join(fixture, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writeFileSync(
        join(fixture, 'commitlint.config.mjs'),
        'export default { rules: { "subject-empty": [2, "never"] } };\n',
      );
      writeFileSync(join(fixture, 'staged.txt'), 'staged\n');
      runFixtureGit(fixture, ['add', '--', 'pnpm-workspace.yaml']);
      runFixtureGit(fixture, ['commit', '--quiet', '-m', 'chore: initial']);
      runFixtureGit(fixture, ['add', '--', 'staged.txt']);
      process.env.MISSION_REPO_ROOT = fixture;

      const staged = await createCommitPlan({
        type: 'test',
        scope: 'git',
        description: 'preview staged changes',
        mode: { kind: 'staged-only' },
      });
      assert.deepEqual(staged.preview.command, ['git', 'commit', '-F', '-']);
      assert.equal(
        staged.preview.actions.some((action) => action.command[1] === 'add'),
        false,
      );

      const paths = await createCommitPlan({
        type: 'test',
        scope: 'git',
        description: 'preview selected paths',
        mode: { kind: 'paths', paths: ['staged.txt'] },
      });
      assert.deepEqual(paths.preview.command, ['git', 'commit', '--only', '-F', '-', '--', 'staged.txt']);
      assert.deepEqual(paths.preview.actions[0]?.command, ['git', 'add', '--', 'staged.txt']);
    } finally {
      if (previousRoot === undefined) {
        delete process.env.MISSION_REPO_ROOT;
      } else {
        process.env.MISSION_REPO_ROOT = previousRoot;
      }
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('rejects stale snapshots before any commit command', async () => {
    const plan = await createCommitPlan({
      type: 'test',
      scope: 'git',
      description: 'check stale state',
      mode: { kind: 'paths', paths: ['package.json'] },
    });
    const result = applyCommitPlan({ ...plan, snapshot: 'sha256:not-current' });
    assert.equal(result.success, false);
    assert.equal(result.stale, true);
    assert.equal(result.commit, undefined);
    assert.match(result.error ?? '', /no Git mutation/);
  });

  it('rejects a real selected worktree content change as stale', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'mcp-commit-'));
    const developerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    try {
      runFixtureGit(fixture, ['init', '--quiet']);
      runFixtureGit(fixture, ['config', 'user.name', 'Commit Test']);
      runFixtureGit(fixture, ['config', 'user.email', 'commit-test@example.test']);
      writeFileSync(join(fixture, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      writeFileSync(join(fixture, 'tracked.txt'), 'initial\n');
      runFixtureGit(fixture, ['add', '--', 'pnpm-workspace.yaml', 'tracked.txt']);
      runFixtureGit(fixture, ['commit', '--quiet', '-m', 'chore: fixture']);

      // Move to 'M' state: file already modified once.
      writeFileSync(join(fixture, 'tracked.txt'), 'modified once\n');
      const initialHead = runFixtureGit(fixture, ['rev-parse', '--verify', 'HEAD']).trim();

      const child = spawnSync(
        process.execPath,
        [
          '--experimental-strip-types',
          '--input-type=module',
          '-e',
          String.raw`import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { captureCommitSnapshot, applyCommitPlan } from './src/git/commit.ts';
import { runGit } from './src/git/runner.ts';
const root = process.env.MISSION_REPO_ROOT;
if (!root) throw new Error('fixture root is missing');
const mode = { kind: 'paths', paths: ['tracked.txt'] };
const message = 'feat: fixture worktree';
// Capture plan while in 'M' state.
const captured = captureCommitSnapshot(message, mode);
// Modify again while still in 'M' state (same status, different content).
writeFileSync(join(root, 'tracked.txt'), 'modified twice\n');
const result = applyCommitPlan({ planId: 'fixture-plan', message, mode, snapshot: captured.snapshot, preview: { command: [], files: [], actions: [] } });
const head = runGit('fixture-head', ['rev-parse', '--verify', 'HEAD']);
console.log(JSON.stringify({ result, head: head.stdout.trim() }));`,
        ],
        {
          cwd: developerRoot,
          encoding: 'utf8',
          env: { ...process.env, MISSION_REPO_ROOT: fixture },
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
      assert.equal(child.status, 0, child.stderr);
      const output = JSON.parse(child.stdout) as {
        result: { success: boolean; stale: boolean; commit?: unknown };
        head: string;
      };
      assert.equal(output.result.success, false);
      assert.equal(output.result.stale, true);
      assert.equal(output.result.commit, undefined);
      assert.equal(output.head, initialHead);
      assert.equal(readFileSync(join(fixture, 'tracked.txt'), 'utf8'), 'modified twice\n');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('keeps Git execution bounded and reports truncation', () => {
    assert.throws(() => runGit('status', ['status'], { timeoutMs: 9 }), /timeoutMs must be an integer/);
    const result = runGit('status', ['status', '--short', '--branch', '--untracked-files=all'], { maxOutputBytes: 32 });
    assert.ok(Buffer.byteLength(result.stdout, 'utf8') <= 32);
    assert.ok(result.outputTruncated);
  });
});
