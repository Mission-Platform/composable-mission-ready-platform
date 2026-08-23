import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, mkdirSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import type * as Locales from './locales.ts';
import type * as Paths from './paths.ts';
import type * as Scanner from './scanner.ts';

const root = mkdtempSync(join(tmpdir(), 'mcp-repo-'));
const outside = mkdtempSync(join(tmpdir(), 'mcp-outside-'));
process.env['MISSION_REPO_ROOT'] = root;
writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
mkdirSync(join(root, 'packages'), {recursive: true});
mkdirSync(join(root, 'docs'), {recursive: true});
writeFileSync(join(outside, 'outside.md'), 'outside');

// @ts-expect-error Node test query import intentionally isolates the temporary repository root.
const paths = (await import('./paths.ts?security-tests')) as typeof Paths;
// @ts-expect-error Node test query import intentionally isolates the temporary repository root.
const scanner = (await import('./scanner.ts?security-tests')) as typeof Scanner;
// @ts-expect-error Node test query import intentionally isolates the temporary repository root.
const locales = (await import('./locales.ts?security-tests')) as typeof Locales;

test('repository path guard rejects traversal and symlink escapes', () => {
  assert.throws(() => paths.resolveRepoPath('../outside.txt', 'target'), /within the repository root/);

  const linked = join(root, 'docs', 'linked.md');
  symlinkSync(join(outside, 'outside.md'), linked);
  assert.throws(() => paths.resolveRepoPath(linked, 'target'), /within the repository root|symlink|outside/i);
});

test('scanner skips symlinked documents and workspace members', () => {
  writeFileSync(join(root, 'docs', 'regular.md'), 'regular');
  mkdirSync(join(outside, 'member'), {recursive: true});
  writeFileSync(join(outside, 'member', 'package.json'), JSON.stringify({name: '@outside/member'}));
  symlinkSync(join(outside, 'member'), join(root, 'packages', 'linked-member'));
  mkdirSync(join(root, 'packages', 'regular-member'));
  writeFileSync(join(root, 'packages', 'regular-member', 'package.json'), JSON.stringify({name: '@mission-platform/regular-member'}));

  assert.deepEqual(scanner.listDocs().map(({slug}) => slug), ['regular']);
  assert.deepEqual(scanner.listGroup('packages').map(({name}) => name), ['@mission-platform/regular-member']);
});

test('locale discovery ignores symlinked locale entries and writes fail closed', () => {
  const member = join(root, 'apps', 'website');
  mkdirSync(join(member, 'locales', 'en'), {recursive: true});
  writeFileSync(join(member, 'package.json'), JSON.stringify({name: '@mission-platform/website'}));
  writeFileSync(join(member, 'locales', 'en', 'common.yaml'), 'title: English\n');
  mkdirSync(join(member, 'locales', 'es'), {recursive: true});
  symlinkSync(join(outside, 'outside.md'), join(member, 'locales', 'es', 'common.yaml'));
  mkdirSync(join(outside, 'locale-target'), {recursive: true});
  symlinkSync(join(outside, 'locale-target'), join(member, 'locales', 'fr'));

  const resolved = locales.resolveMemberLocales('apps', 'website');
  assert.ok(resolved);
  assert.deepEqual(resolved?.locales, ['en']);
  const created = locales.addLocale(resolved!, 'de', {fill: 'empty', apply: true});
  assert.equal(created.applied, true);
  assert.equal(existsSync(join(member, 'locales', 'de', 'common.yaml')), true);
  const unsafeResolved = {...resolved!, locales: ['en', 'es']};
  assert.deepEqual(locales.readLocale(unsafeResolved, 'es'), {});
  assert.throws(
    () => locales.addLocale(unsafeResolved, 'fr', {fill: 'empty', apply: true}),
    /symlink|outside/i,
  );
  assert.throws(
    () => locales.updateTranslation({resolved: unsafeResolved, code: 'es', entries: {title: 'Español'}, apply: true}),
    /symlink|outside/i,
  );
  assert.equal(locales.surveyLocales('apps').some(({name}) => name === 'website'), true);
});