import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  OFFLINE_FABRICATION_MARKERS,
  UNSHIPPABLE_OFFLINE_MARKER,
  assessTranslationQuality,
  isAcceptableTranslation,
  protectInline,
  rewriteRelativeLinks,
  splitFenceSegments,
} from './doc-locales-lib.ts';
import { packageDocumentationSourceRoot, projectDocumentationSourceRoot } from './documentation-sources.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

describe('doc locale protectInline / fences', () => {
  it('protects inline code, package names, link targets, and CLI tokens', () => {
    const source =
      'Install `@mission-platform/barcode` with pnpm and open [guide](../guides/usage.md) plus <https://example.com>.';
    const { text, protectedParts } = protectInline(source);

    expect(text).not.toContain('@mission-platform/barcode');
    expect(text).not.toContain('pnpm');
    expect(text).not.toContain('../guides/usage.md');
    expect(text).toContain('[guide](');
    expect(protectedParts.map((part) => part.value)).toEqual(
      expect.arrayContaining([
        '`@mission-platform/barcode`',
        'pnpm',
        '../guides/usage.md',
        '<https://example.com>',
      ]),
    );
    // Restoring placeholders round-trips technical tokens.
    let restored = text;
    for (const part of protectedParts) restored = restored.replaceAll(part.token, part.value);
    expect(restored).toBe(source);
  });

  it('keeps fenced code out of prose segments', () => {
    const source = ['Intro text', '', '```ts', "import { x } from '@mission-platform/barcode';", '```', '', 'Outro'].join(
      '\n',
    );
    const segments = splitFenceSegments(source);
    expect(segments.map((segment) => segment.kind)).toEqual(['text', 'fence', 'text']);
    expect(segments[1]?.text).toContain('import { x }');
    expect(segments[0]?.text).toContain('Intro text');
  });
});

describe('doc locale rewriteRelativeLinks', () => {
  it('rewrites package-local and cross-root markdown links into locale trees', async () => {
    const repo = await createTemporaryDirectory('doc-locales-links-');
    const projectDocs = join(repo, 'docs');
    const barcodeDocs = join(repo, 'packages', 'barcode', 'docs');
    const tokensDocs = join(repo, 'packages', 'tokens', 'docs');
    await mkdir(join(barcodeDocs, 'guides'), { recursive: true });
    await mkdir(join(tokensDocs, 'reference'), { recursive: true });
    await mkdir(projectDocs, { recursive: true });

    const roots = [
      projectDocumentationSourceRoot(projectDocs),
      packageDocumentationSourceRoot('packages/barcode', barcodeDocs, '@mission-platform/barcode'),
      packageDocumentationSourceRoot('packages/tokens', tokensDocs, '@mission-platform/tokens'),
    ];

    const sourcePath = join(barcodeDocs, 'index.md');
    const outputPath = join(barcodeDocs, 'locales', 'de', 'index.md');
    const markdown = [
      'See [usage](guides/usage.md), [tokens](../../tokens/docs/reference/component-tokens.md),',
      'project [overview](../../../docs/overview.md), and the [readme](../../../README.md).',
      '',
      '```md',
      '[do-not-touch](guides/usage.md)',
      '```',
    ].join('\n');

    const rewritten = rewriteRelativeLinks(markdown, sourcePath, outputPath, roots, 'de');
    expect(rewritten).toMatch(/\]\(guides\/usage\.md\)/);
    expect(rewritten).toMatch(/\]\((?:\.\.\/)+tokens\/docs\/locales\/de\/reference\/component-tokens\.md\)/);
    expect(rewritten).toMatch(/\]\((?:\.\.\/)+docs\/locales\/de\/overview\.md\)/);
    expect(rewritten).toMatch(/\]\((?:\.\.\/)+README\.md\)/);
    // Fenced examples keep their original relative targets.
    expect(rewritten).toContain('```md\n[do-not-touch](guides/usage.md)\n```');
  });
});

describe('doc locale translation quality', () => {
  const english = `# @mission-platform/tokens

CSS design tokens and SCSS theme definitions for Mission Platform. This package
owns the primitive, semantic, typography, structural, and component token
contracts consumed by applications and shared components.

## Start here

- [Component-token reference](reference/component-tokens.md) — the inventory,
  DTCG paths, generated output, and Figma handoff contract.
- [Build and test guide](guides/development.md) — token source, generation, and
  stylesheet checks.

Import the package's public exports from package.json; do not copy generated
token files into an application.
`;

  it('rejects offline fabrication markers and few-word Latin substitutions', () => {
    const fabricatedDe = `# @mission-platform/tokens

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle.

> packages/tokens/docs/index.md: [packages/tokens/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

CSS design tokens und SCSS theme definitions für Mission Platform. dies package
owns die primitive, semantic, typography, structural, und component token
contracts consumed by applications und shared components.

## Start here

- [Component-token reference](reference/component-tokens.md) — die inventory,
  DTCG paths, generated output, und Figma handoff contract.
- [Build und test guide](guides/development.md) — token source, generation, und
  stylesheet checks.

Import die package's public exports aus package.json; do nicht copy generated
token files into an application.
`;

    const issues = assessTranslationQuality('de', english, fabricatedDe);
    expect(issues.some((issue) => issue.code === 'english-content-retention')).toBe(true);
    expect(isAcceptableTranslation('de', english, fabricatedDe)).toBe(false);
  });

  it('rejects CJK/RTL pages that only inject a canned non-Latin sentence', () => {
    const fabricatedZh = `# @mission-platform/tokens

由规范英文源进行的机器辅助翻译。

> packages/tokens/docs/index.md: [packages/tokens/docs/index.md](../../index.md)
> 语言: 简体中文 (zh)

${OFFLINE_FABRICATION_MARKERS[6]} CSS design tokens and SCSS theme definitions for Mission Platform. This package
owns the primitive, semantic, typography, structural, and component token
contracts consumed by applications and shared components.

## ${OFFLINE_FABRICATION_MARKERS[6]} Start here

Import the package's public exports from package.json; do not copy generated
token files into an application.
`;

    const issues = assessTranslationQuality('zh', english, fabricatedZh);
    expect(issues.some((issue) => issue.code === 'fabrication-marker')).toBe(true);
    expect(issues.some((issue) => issue.code === 'low-non-latin-density' || issue.code === 'english-content-retention')).toBe(
      true,
    );
  });

  it('accepts a genuinely translated Latin page while preserving technical tokens', () => {
    const genuineDe = `# @mission-platform/tokens

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle.

> packages/tokens/docs/index.md: [packages/tokens/docs/index.md](../../index.md)
> Sprache: Deutsch (de)

CSS-Design-Tokens und SCSS-Themendefinitionen für die Mission Platform. Dieses
Paket besitzt die primitiven, semantischen, typografischen, strukturellen und
Komponenten-Token-Verträge, die von Anwendungen und gemeinsamen Komponenten
verwendet werden.

## Hier starten

- [Komponenten-Token-Referenz](reference/component-tokens.md) — das Inventar,
  DTCG-Pfade, generierte Ausgabe und der Figma-Übergabevertrag.
- [Build- und Testanleitung](guides/development.md) — Token-Quelle, Generierung
  und Stylesheet-Prüfungen.

Importieren Sie die öffentlichen Exporte des Pakets aus der package.json; kopieren
Sie generierte Token-Dateien nicht in eine Anwendung.
`;

    expect(isAcceptableTranslation('de', english, genuineDe)).toBe(true);
    expect(genuineDe).toContain('@mission-platform/tokens');
    expect(genuineDe).not.toContain(UNSHIPPABLE_OFFLINE_MARKER);
  });
});

describe('doc locale package-local output paths', () => {
  it('writes locale pages beside the owning package docs root, not under root docs/', async () => {
    const repo = await createTemporaryDirectory('doc-locales-output-');
    const barcodeDocs = join(repo, 'packages', 'barcode', 'docs');
    await mkdir(barcodeDocs, { recursive: true });
    await writeFile(
      join(barcodeDocs, 'index.md'),
      '# Barcode\n\nEncode values with `@mission-platform/barcode` using pnpm.\n',
      'utf8',
    );

    const outputPath = join(barcodeDocs, 'locales', 'fr', 'index.md');
    await mkdir(join(barcodeDocs, 'locales', 'fr'), { recursive: true });
    const sourceLabel = 'packages/barcode/docs/index.md';
    const sourceLink = '../../index.md';
    await writeFile(
      outputPath,
      [
        '# Code-barres',
        '',
        'Traduction assistée par machine.',
        '',
        `> ${sourceLabel}: [${sourceLabel}](${sourceLink})`,
        '> Langue: Français (fr)',
        '',
        'Encodez des valeurs avec `@mission-platform/barcode` en utilisant pnpm.',
        '',
      ].join('\n'),
      'utf8',
    );

    const localized = await readFile(outputPath, 'utf8');
    expect(outputPath.replaceAll('\\', '/')).toContain('/packages/barcode/docs/locales/fr/index.md');
    expect(localized).toContain(sourceLabel);
    expect(localized).toContain('](../../index.md)');
    expect(localized).toContain('`@mission-platform/barcode`');
    expect(localized).toContain('pnpm');
  });
});
