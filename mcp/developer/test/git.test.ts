import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import {
  readGitBlame,
  readGitBranches,
  readGitChangedFiles,
  readGitDiff,
  readGitGrep,
  readGitLsFiles,
  readGitLog,
  readGitRemotes,
  readGitShow,
  readGitStatus,
  readGitTags,
  sanitizeGitRemoteUrl,
} from '../src/git/index.ts';
import { createServer } from '../src/index.ts';

let client: Client;

before(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverTransport);
  client = new Client({ name: 'git-test-client', version: '1.0.0' });
  await client.connect(clientTransport);
});

async function callTool(
  name: string,
  arguments_: Record<string, unknown> = {},
): Promise<{ text: string; isError: boolean }> {
  const result = await client.callTool({ name, arguments: arguments_ });
  const content = result.content as { type: string; text: string; isError?: boolean }[];
  return {
    text: content.map((entry) => entry.text).join('\n'),
    isError: result.isError === true || content.some((entry) => !!entry.isError),
  };
}

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

describe('read-only Git tools', () => {
  it('returns structured changed-file status', () => {
    const changed = readGitChangedFiles({ maxOutputBytes: 32 * 1024 });
    assert.equal(changed.operation, 'changed-files');
    assert.equal(changed.success, true);
    assert.ok(Array.isArray(changed.files));
    for (const file of changed.files) {
      assert.equal(typeof file.path, 'string');
      assert.equal(typeof file.staged, 'boolean');
      assert.equal(typeof file.unstaged, 'boolean');
      assert.equal(typeof file.untracked, 'boolean');
    }
  });

  it('reads repository status and branches', () => {
    const status = readGitStatus({ maxOutputBytes: 32 * 1024 });
    assert.equal(status.operation, 'status');
    assert.equal(status.success, true);
    assert.deepEqual(status.command.slice(0, 2), ['git', 'status']);

    const branches = readGitBranches({ maxOutputBytes: 32 * 1024 });
    assert.equal(branches.operation, 'branches');
    assert.equal(branches.success, true);
  });

  it('reads bounded diffs and history', () => {
    const diff = readGitDiff({ path: 'package.json', stat: true, maxOutputBytes: 32 * 1024 });
    assert.equal(diff.operation, 'diff');
    assert.equal(diff.success, true);
    assert.ok(diff.command.includes('package.json'));

    const log = readGitLog({ limit: 1, path: 'package.json', maxOutputBytes: 32 * 1024 });
    assert.equal(log.operation, 'log');
    assert.equal(log.success, true);
  });

  it('reads literal and regex content matches', () => {
    const literal = readGitGrep({ pattern: '"name"', path: 'package.json', maxMatches: 2, maxOutputBytes: 32 * 1024 });
    assert.equal(literal.operation, 'grep');
    assert.equal(literal.success, true);
    assert.match(literal.stdout, /package\.json/);
    assert.ok(literal.command.includes('--fixed-strings'));
    assert.ok(literal.command.includes('--max-count=2'));

    const regex = readGitGrep({ pattern: '^[[:space:]]*"name"', regex: true, path: 'package.json' });
    assert.equal(regex.success, true);
    assert.ok(regex.command.includes('--extended-regexp'));
  });

  it('reads bounded blame provenance', () => {
    const blame = readGitBlame({
      revision: 'HEAD',
      path: 'package.json',
      startLine: 1,
      endLine: 2,
      maxOutputBytes: 32 * 1024,
    });
    assert.equal(blame.operation, 'blame');
    assert.equal(blame.success, true);
    assert.deepEqual(blame.command.slice(-4), ['HEAD', '--end-of-options', '--', 'package.json']);
    assert.ok(blame.command.includes('-L'));
    assert.ok(blame.command.includes('1,2'));
  });

  it('lists tracked files by default and can include standard-excluded untracked files', () => {
    const tracked = readGitLsFiles({ path: 'package.json', maxOutputBytes: 32 * 1024 });
    assert.equal(tracked.operation, 'ls-files');
    assert.equal(tracked.success, true);
    assert.match(tracked.stdout, /package\.json/);
    assert.ok(tracked.command.includes('--cached'));
    assert.ok(!tracked.command.includes('--others'));

    const allFiles = readGitLsFiles({ includeUntracked: true, includeStages: true, maxOutputBytes: 1024 * 1024 });
    assert.equal(allFiles.success, true);
    assert.ok(allFiles.command.includes('--stage'));
    assert.ok(allFiles.command.includes('--others'));
    assert.ok(allFiles.command.includes('--exclude-standard'));
    assert.deepEqual(tracked.command.slice(-2), ['--', 'package.json']);
  });

  it('reads bounded local tag metadata with optional filtering', () => {
    const tags = readGitTags({ pattern: '@mission-platform/*', limit: 2, maxOutputBytes: 32 * 1024 });
    assert.equal(tags.operation, 'tags');
    assert.equal(tags.success, true);
    assert.ok(tags.command.includes('--count=2'));
    assert.ok(tags.command.includes('refs/tags/@mission-platform/*'));

    const lines = tags.stdout.trim().split('\n').filter(Boolean);
    assert.ok(lines.length <= 2);
  });

  it('reads local remote metadata and redacts URL credentials', () => {
    const remotes = readGitRemotes({ maxOutputBytes: 32 * 1024 });
    assert.equal(remotes.operation, 'remotes');
    assert.equal(remotes.success, true);
    assert.deepEqual(remotes.command, ['git', 'remote', '--verbose']);
    assert.doesNotMatch(remotes.stdout, /:[^\s@]+@/);

    assert.equal(
      sanitizeGitRemoteUrl('https://alice:secret@example.com/org/repo.git'),
      'https://example.com/org/repo.git',
    );
    assert.equal(sanitizeGitRemoteUrl('ssh://alice:secret@example.com/org/repo.git'), 'ssh://example.com/org/repo.git');
    assert.equal(sanitizeGitRemoteUrl('git@github.com:org/repo.git'), 'github.com:org/repo.git');
    assert.equal(sanitizeGitRemoteUrl('user:secret@example.com:path/repo.git'), 'example.com:path/repo.git');
    assert.equal(sanitizeGitRemoteUrl('user@example.com:path/repo.git'), 'example.com:path/repo.git');
  });

  it('reads a revision without enabling write operations', () => {
    const show = readGitShow({ revision: 'HEAD', path: 'package.json', maxOutputBytes: 32 * 1024 });
    assert.equal(show.operation, 'show');
    assert.equal(show.success, true);
    assert.ok(show.command.includes('--end-of-options'));
    assert.deepEqual(show.command.slice(-2), ['--', 'package.json']);
  });

  it('rejects paths outside the repository', () => {
    assert.throws(() => readGitDiff({ path: '../outside' }), /must remain within the repository root/);
    assert.throws(() => readGitGrep({ pattern: 'name', path: '../outside' }), /must remain within the repository root/);
    assert.throws(() => readGitBlame({ path: '../outside' }), /must remain within the repository root/);
  });

  it('validates time, output, history, and revision bounds', () => {
    assert.throws(() => readGitStatus({ timeoutMs: 9 }), /timeoutMs must be an integer/);
    assert.throws(() => readGitStatus({ maxOutputBytes: 0 }), /maxOutputBytes must be an integer/);
    assert.throws(() => readGitLog({ limit: 0 }), /limit must be an integer/);
    assert.throws(() => readGitShow({ revision: '  \0  ' }), /revision must be a non-empty value/);
    assert.throws(() => readGitGrep({ pattern: '  ' }), /pattern must be a non-empty value/);
    assert.throws(() => readGitGrep({ pattern: 'match', ref: '' }), /revision must be a non-empty value/);
    assert.throws(() => readGitGrep({ pattern: 'match', path: '' }), /Git path must be a non-empty value/);
    assert.throws(() => readGitGrep({ pattern: 'match', maxMatches: 0 }), /maxMatches must be an integer/);
    assert.throws(() => readGitGrep({ pattern: 'match', maxMatches: 1.5 }), /maxMatches must be an integer/);
    assert.throws(() => readGitTags({ limit: 0 }), /limit must be an integer/);
    assert.throws(() => readGitTags({ limit: 1.5 }), /limit must be an integer/);
    assert.throws(() => readGitTags({ pattern: '\0' }), /pattern must be a non-empty value/);
    assert.throws(() => readGitLsFiles({ path: '../outside' }), /must remain within the repository root/);
    assert.throws(() => readGitBlame({ path: 'package.json', startLine: 2, endLine: 1 }), /line range/);
    assert.throws(
      () => readGitBlame({ path: 'package.json', startLine: 1.5 }),
      /startLine and endLine must be integers/,
    );
    assert.throws(() => readGitBlame({ path: 'package.json', startLine: 1, endLine: 10_002 }), /line range/);
    assert.throws(() => readGitBlame({ path: 'package.json', revision: '-HEAD' }), /must not begin/);
  });

  it('bounds command output', () => {
    const result = readGitLog({ limit: 500, maxOutputBytes: 64 });
    assert.ok(Buffer.byteLength(result.stdout, 'utf8') <= 64);
    assert.ok(result.outputTruncated);

    const grep = readGitGrep({ pattern: 'e', maxMatches: 500, maxOutputBytes: 64 });
    assert.ok(Buffer.byteLength(grep.stdout, 'utf8') <= 64);
    assert.ok(grep.outputTruncated);

    const blame = readGitBlame({ path: 'package.json', maxOutputBytes: 64 });
    assert.ok(Buffer.byteLength(blame.stdout, 'utf8') <= 64);
    assert.ok(blame.outputTruncated);

    const files = readGitLsFiles({ maxOutputBytes: 64 });
    assert.ok(Buffer.byteLength(files.stdout, 'utf8') <= 64);
    assert.ok(files.outputTruncated);

    const tags = readGitTags({ limit: 500, maxOutputBytes: 64 });
    assert.ok(Buffer.byteLength(tags.stdout, 'utf8') <= 64);
    assert.ok(tags.outputTruncated);
  });

  it('keeps revisions and paths after Git option terminators', () => {
    const diff = readGitDiff({ ref: 'HEAD', path: 'package.json' });
    assert.deepEqual(diff.command.slice(-2), ['--', 'package.json']);
    assert.deepEqual(diff.command.slice(-4, -2), ['--end-of-options', 'HEAD']);

    const log = readGitLog({ ref: 'HEAD', path: 'package.json' });
    assert.deepEqual(log.command.slice(-2), ['--', 'package.json']);
    assert.deepEqual(log.command.slice(-4, -2), ['--end-of-options', 'HEAD']);

    const grep = readGitGrep({ pattern: 'name', ref: 'HEAD', path: 'package.json' });
    assert.deepEqual(grep.command.slice(-2), ['--', 'package.json']);
    assert.deepEqual(grep.command.slice(-4, -2), ['--end-of-options', 'HEAD']);
  });

  it('serves every read-only Git operation through MCP', async () => {
    const calls: readonly [string, Record<string, unknown>, string][] = [
      ['git_status', {}, 'status'],
      ['git_changed_files', {}, 'changed-files'],
      ['git_diff', { path: 'package.json', stat: true }, 'diff'],
      ['git_log', { limit: 1, path: 'package.json' }, 'log'],
      ['git_show', { revision: 'HEAD', path: 'package.json' }, 'show'],
      ['git_branches', {}, 'branches'],
      ['git_grep', { pattern: 'name', path: 'package.json', maxMatches: 2 }, 'grep'],
      ['git_blame', { revision: 'HEAD', path: 'package.json', startLine: 1, endLine: 2 }, 'blame'],
      ['git_ls_files', { path: 'package.json' }, 'ls-files'],
      ['git_tags', { limit: 2 }, 'tags'],
      ['git_remotes', {}, 'remotes'],
    ];

    for (const [name, arguments_, operation] of calls) {
      const { text, isError } = await callTool(name, arguments_);
      assert.equal(isError, false, `${name} should not return an MCP error: ${text}`);
      const result = JSON.parse(text) as { operation: string; success: boolean; command: string[] };
      assert.equal(result.operation, operation);
      assert.equal(result.success, true);
      assert.equal(result.command[0], 'git');
    }
  });
});

describe('two-phase Git commit tools', () => {
  it('plans and rejects a stale selected-path apply through MCP', async () => {
    const tools = await client.listTools();
    const toolNames = new Set(tools.tools.map((tool) => tool.name));
    assert.ok(toolNames.has('git_commit_plan'));
    assert.ok(toolNames.has('git_commit_apply'));

    const packagePath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
    const original = readFileSync(packagePath, 'utf8');
    const planned = await callTool('git_commit_plan', {
      type: 'test',
      scope: 'mcp',
      description: 'preview a local commit',
      mode: { kind: 'paths', paths: ['mcp/developer/package.json'] },
    });
    assert.equal(planned.isError, false, planned.text);
    const plan = JSON.parse(planned.text) as {
      planId: string;
      message: string;
      mode: { kind: string; paths: string[] };
      snapshot: string;
      preview: { command: string[]; files: string[] };
    };
    assert.match(plan.planId, /^[0-9a-f-]{36}$/);
    assert.equal(plan.message, 'test(mcp): preview a local commit');
    assert.deepEqual(plan.mode, { kind: 'paths', paths: ['mcp/developer/package.json'] });
    assert.equal(plan.preview.files[0], 'mcp/developer/package.json');
    assert.match(plan.snapshot, /^sha256:[0-9a-f]{64}$/);
    assert.deepEqual(plan.preview.command.slice(0, 4), ['git', 'commit', '--only', '-F']);

    try {
      // Keep the selected file modified while changing its content, which is the stale-plan case.
      writeFileSync(packagePath, `${original}\n`);
      const applied = await callTool('git_commit_apply', { planId: plan.planId });
      assert.equal(applied.isError, false, applied.text);
      const result = JSON.parse(applied.text) as { success: boolean; stale: boolean; error: string };
      assert.equal(result.success, false);
      assert.equal(result.stale, true);
      assert.match(result.error, /no Git mutation was performed/);
    } finally {
      writeFileSync(packagePath, original);
    }
  });

  it('rejects an unknown or expired plan ID through MCP', async () => {
    const unknownId = '00000000-0000-0000-0000-000000000000';
    const result = await client.callTool({ name: 'git_commit_apply', arguments: { planId: unknownId } });
    assert.equal(result.isError, true);
    const text = (result.content as { type: string; text: string }[]).map((c) => c.text).join('\n');
    assert.match(text, /unknown or expired/i);
  });

  it('consumes a plan after successful fixture-isolated MCP apply', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'mcp-git-tool-'));
    const developerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    try {
      runFixtureGit(fixture, ['init', '--quiet']);
      runFixtureGit(fixture, ['config', 'user.name', 'MCP Test']);
      runFixtureGit(fixture, ['config', 'user.email', 'mcp-test@example.test']);
      writeFileSync(join(fixture, 'pnpm-workspace.yaml'), 'packages: []\n');
      writeFileSync(
        join(fixture, 'commitlint.config.mjs'),
        `export default {
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'style', 'chore', 'docs', 'test', 'build', 'ci', 'perf', 'revert']],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 72],
  },
};
`,
      );
      writeFileSync(join(fixture, 'tracked.txt'), 'initial\n');
      runFixtureGit(fixture, ['add', '--', 'pnpm-workspace.yaml', 'commitlint.config.mjs', 'tracked.txt']);
      runFixtureGit(fixture, ['commit', '--quiet', '-m', 'chore: fixture']);
      writeFileSync(join(fixture, 'tracked.txt'), 'updated\n');
      const initialHead = runFixtureGit(fixture, ['rev-parse', '--verify', 'HEAD']).trim();

      const child = spawnSync(
        process.execPath,
        [
          '--experimental-strip-types',
          '--input-type=module',
          '-e',
          String.raw`import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from './src/index.ts';
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const server = createServer();
await server.connect(serverTransport);
const client = new Client({ name: 'fixture-git-test', version: '1.0.0' });
await client.connect(clientTransport);
const text = (result) => result.content.map((entry) => entry.text).join('\\n');
const planned = await client.callTool({ name: 'git_commit_plan', arguments: {
  type: 'feat',
  scope: 'fixture',
  description: 'apply a fixture commit',
  mode: { kind: 'paths', paths: ['tracked.txt'] },
} });
if (planned.isError) throw new Error(text(planned));
const plan = JSON.parse(text(planned));
const applied = await client.callTool({ name: 'git_commit_apply', arguments: { planId: plan.planId } });
const reapplied = await client.callTool({ name: 'git_commit_apply', arguments: { planId: plan.planId } });
console.log(JSON.stringify({
  plan,
  applied: { isError: applied.isError === true, text: text(applied) },
  reapplied: { isError: reapplied.isError === true, text: text(reapplied) },
}));`,
        ],
        {
          cwd: developerRoot,
          encoding: 'utf8',
          env: { ...process.env, MISSION_REPO_ROOT: fixture },
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
      assert.equal(child.status, 0, child.stderr || child.stdout);
      const output = JSON.parse(child.stdout) as {
        plan: { planId: string; message: string; mode: { kind: string; paths: string[] } };
        applied: { isError: boolean; text: string };
        reapplied: { isError: boolean; text: string };
      };
      assert.match(output.plan.planId, /^[0-9a-f-]{36}$/);
      assert.equal(output.plan.message, 'feat(fixture): apply a fixture commit');
      assert.deepEqual(output.plan.mode, { kind: 'paths', paths: ['tracked.txt'] });
      assert.equal(output.applied.isError, false, output.applied.text);
      const appliedResult = JSON.parse(output.applied.text) as { success: boolean; stale: boolean; commitId?: string };
      assert.equal(appliedResult.success, true, output.applied.text);
      assert.equal(appliedResult.stale, false);
      assert.ok(appliedResult.commitId);
      assert.equal(output.reapplied.isError, true);
      assert.match(output.reapplied.text, /unknown or expired/i);
      const finalHead = runFixtureGit(fixture, ['rev-parse', '--verify', 'HEAD']).trim();
      assert.notEqual(finalHead, initialHead);
      assert.equal(finalHead, appliedResult.commitId);
      assert.equal(
        runFixtureGit(fixture, ['log', '-1', '--format=%s']).trim(),
        'feat(fixture): apply a fixture commit',
      );
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
