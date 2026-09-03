import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type * as Writer from '../src/scaffold/writer.ts';

const root = mkdtempSync(join(tmpdir(), 'mcp-scaffold-'));
const outside = mkdtempSync(join(tmpdir(), 'mcp-scaffold-outside-'));
process.env['MISSION_REPO_ROOT'] = root;
writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
mkdirSync(join(root, 'packages'), { recursive: true });

// @ts-expect-error Node test query import intentionally isolates the temporary repository root.
const { writeIntoPackage, writeScaffold } = (await import('../src/scaffold/writer.ts?security-tests')) as typeof Writer;

test('scaffold rejects a symlinked new target before mutation', () => {
  const linkedTarget = join(root, 'packages', 'linked-package');
  symlinkSync(outside, linkedTarget);

  assert.throws(
    () => writeScaffold({ group: 'packages', name: 'linked-package', files: { 'README.md': 'unsafe' }, apply: true }),
    /symlink|outside/i,
  );
  assert.equal(existsSync(join(outside, 'README.md')), false);
});

test('scaffold writes regular targets inside the repository', () => {
  const result = writeScaffold({
    group: 'packages',
    name: 'regular-package',
    files: { 'README.md': 'safe' },
    apply: true,
  });

  assert.equal(result.applied, true);
  assert.equal(existsSync(join(root, 'packages', 'regular-package', 'README.md')), true);
});

test('scaffold keeps sorted paths paired with their original contents', () => {
  const result = writeScaffold({
    group: 'packages',
    name: 'ordered-package',
    files: { 'z-file.txt': 'z-content', 'a-file.txt': 'a-content' },
    apply: true,
  });

  assert.deepEqual(result.files, ['a-file.txt', 'z-file.txt']);
  assert.equal(readFileSync(join(root, 'packages', 'ordered-package', 'a-file.txt'), 'utf8'), 'a-content');
  assert.equal(readFileSync(join(root, 'packages', 'ordered-package', 'z-file.txt'), 'utf8'), 'z-content');
});

test('in-package scaffold rejects traversal before mutation', () => {
  const packageDir = join(root, 'packages', 'traversal-package');
  mkdirSync(packageDir);
  const outsideFile = join(outside, 'escaped.ts');

  assert.throws(
    () =>
      writeIntoPackage({
        packageDir,
        relativePackageDir: 'packages/traversal-package',
        files: { '../escaped.ts': 'unsafe' },
        apply: true,
      }),
    /within the repository root|outside/i,
  );
  assert.equal(existsSync(outsideFile), false);
});
