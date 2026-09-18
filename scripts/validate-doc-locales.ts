/**
 * Validate localized documentation trees beside every canonical docs root.
 *
 * Checks:
 * - slug parity with the canonical English docs tree
 * - fenced code blocks remain byte-identical to English
 * - canonical source link resolves correctly
 * - body is a genuine translation (not offline fabrication / English copy)
 * - protected technical tokens survive translation
 *
 * Usage (from repo root):
 *   node --experimental-strip-types scripts/validate-doc-locales.ts
 */
import { existsSync } from 'node:fs';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  DOCUMENTATION_LOCALES,
  assessTranslationQuality,
  protectedTechnicalTokens,
  withoutFences,
  type DocumentationLocale,
} from './doc-locales-lib.ts';
import { discoverDocumentationRoots, rootForPath, type DocumentationSourceRoot } from './documentation-sources.ts';

const root = resolve(import.meta.dirname, '..');
const locales = DOCUMENTATION_LOCALES;

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'locales') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files.sort();
}

async function allMarkdownFiles(directory: string): Promise<string[]> {
  try {
    await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await allMarkdownFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files.sort();
}

function fences(markdown: string): string[] {
  return markdown.match(/```[\s\S]*?```/g) ?? [];
}

function slug(file: string, base: string): string {
  return relative(base, file).replace(/\.md$/u, '').replaceAll('\\', '/');
}

interface CanonicalPage {
  readonly sourcePath: string;
  readonly sourceRoot: DocumentationSourceRoot;
  readonly pageSlug: string;
}

async function canonicalPages(documentationRoots: readonly DocumentationSourceRoot[]): Promise<CanonicalPage[]> {
  const pages: CanonicalPage[] = [];
  for (const sourceRoot of documentationRoots) {
    for (const sourcePath of await markdownFiles(sourceRoot.rootDirectory)) {
      pages.push({ sourcePath, sourceRoot, pageSlug: slug(sourcePath, sourceRoot.rootDirectory) });
    }
  }
  return pages.toSorted((left, right) => {
    const leftSlug = left.sourceRoot.routePrefix ? `${left.sourceRoot.routePrefix}/${left.pageSlug}` : left.pageSlug;
    const rightSlug = right.sourceRoot.routePrefix
      ? `${right.sourceRoot.routePrefix}/${right.pageSlug}`
      : right.pageSlug;
    return leftSlug.localeCompare(rightSlug);
  });
}

export function assertTranslated(
  locale: string,
  pageSlug: string,
  canonical: string,
  localized: string,
  failures: string[],
  checkProseQuality = true,
): void {
  for (const token of protectedTechnicalTokens(canonical)) {
    if (!localized.includes(token)) {
      failures.push(`${locale}/${pageSlug}: protected technical token missing or changed: ${token}`);
    }
  }

  for (const issue of assessTranslationQuality(locale, canonical, localized, { checkProseQuality })) {
    failures.push(`${locale}/${pageSlug}: ${issue.message}`);
  }
}

interface ValidationCliArgs {
  readonly locale?: string;
  readonly slug?: string;
  readonly package?: string;
  readonly baselinePath: string;
  readonly noBaseline: boolean;
  readonly updateBaseline: boolean;
  readonly strict: boolean;
}

function parseCliArgs(argv: readonly string[]): ValidationCliArgs {
  const args = argv.slice(2);
  let locale: string | undefined;
  let slug: string | undefined;
  let pkg: string | undefined;
  let baselinePath = join(root, 'scripts', 'doc-locales-backlog.json');
  let noBaseline = false;
  let updateBaseline = false;
  let strict = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case '--update-baseline': {
        updateBaseline = true;
        break;
      }
      case '--no-baseline': {
        noBaseline = true;
        break;
      }
      case '--strict': {
        strict = true;
        break;
      }
      case '--baseline': {
        const nextArg = args[index + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          baselinePath = resolve(process.cwd(), nextArg);
          index += 1;
        }
        break;
      }
      case '--locale': {
        const nextArg = args[index + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          locale = nextArg;
          index += 1;
        }
        break;
      }
      case '--slug': {
        const nextArg = args[index + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          slug = nextArg;
          index += 1;
        }
        break;
      }
      case '--package': {
        const nextArg = args[index + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          pkg = nextArg;
          index += 1;
        }
        break;
      }
      default: {
        if (arg?.startsWith('--baseline=')) {
          baselinePath = resolve(process.cwd(), arg.slice('--baseline='.length));
        } else if (arg?.startsWith('--locale=')) {
          locale = arg.slice('--locale='.length);
        } else if (arg?.startsWith('--slug=')) {
          slug = arg.slice('--slug='.length);
        } else if (arg?.startsWith('--package=')) {
          pkg = arg.slice('--package='.length);
        }
        break;
      }
    }
  }

  return {
    locale,
    slug,
    package: pkg,
    baselinePath,
    noBaseline,
    updateBaseline,
    strict,
  };
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv);
  let documentationRoots = discoverDocumentationRoots(root);
  if (options.package) {
    documentationRoots = documentationRoots.filter(
      (sourceRoot) => sourceRoot.packageName === options.package || sourceRoot.routePrefix === options.package,
    );
  }

  let pages = await canonicalPages(documentationRoots);
  if (options.slug) {
    pages = pages.filter(
      (page) => page.pageSlug === options.slug || `${page.sourceRoot.routePrefix}/${page.pageSlug}` === options.slug,
    );
  }

  const targetLocales = options.locale
    ? (locales.filter((localeItem) => localeItem === options.locale) satisfies readonly DocumentationLocale[])
    : locales;

  const failures: string[] = [];

  for (const locale of targetLocales) {
    for (const sourceRoot of documentationRoots) {
      const canonicalRoot = sourceRoot.rootDirectory;
      const localeRoot = join(canonicalRoot, 'locales', locale);
      const rootPages = pages.filter((page) => page.sourceRoot.rootDirectory === canonicalRoot);
      const canonicalSlugs = rootPages.map((page) => page.pageSlug);
      const localizedFiles = await allMarkdownFiles(localeRoot);
      const localizedSlugs = localizedFiles.map((file) => slug(file, localeRoot));
      const missing = canonicalSlugs.filter((value) => !localizedSlugs.includes(value));
      const extra = localizedSlugs.filter((value) => !canonicalSlugs.includes(value));
      const rootLabel = sourceRoot.routePrefix || 'docs';
      for (const item of missing) {
        failures.push(`${locale}/${rootLabel}: missing ${item}`);
      }
      for (const item of extra) {
        failures.push(`${locale}/${rootLabel}: extra ${item}`);
      }

      for (const page of rootPages) {
        const canonicalFile = page.sourcePath;
        const pageSlug = page.pageSlug;
        const localizedFile = join(localeRoot, `${pageSlug}.md`);
        let canonical: string;
        let localized: string;
        try {
          [canonical, localized] = await Promise.all([
            readFile(canonicalFile, 'utf8'),
            readFile(localizedFile, 'utf8'),
          ]);
        } catch {
          continue;
        }

        const canonicalFences = fences(canonical);
        const localizedFences = fences(localized);
        if (JSON.stringify(canonicalFences) !== JSON.stringify(localizedFences)) {
          failures.push(`${locale}/${pageSlug}: fenced code blocks differ from canonical source`);
        }

        if (canonicalFile.includes(`${join('reference', 'generated')}${pathSeparator()}`)) {
          const generatedMarker = '<!-- Generated by scripts/extract-package-docs.ts.';
          if (!canonical.includes(generatedMarker)) {
            failures.push(`${locale}/${pageSlug}: generated reference is missing its generated-file marker`);
          }
          if (!localized.includes(generatedMarker)) {
            failures.push(`${locale}/${pageSlug}: localized generated reference is missing its generated-file marker`);
          }
        }

        const sourceLink = localized.match(/\]\(([^)]+)\)/u)?.[1];
        if (!sourceLink) failures.push(`${locale}/${pageSlug}: missing canonical source link`);
        else if (resolve(dirname(localizedFile), sourceLink) !== canonicalFile) {
          failures.push(`${locale}/${pageSlug}: canonical source link does not resolve to ${pageSlug}.md`);
        }

        // Relative markdown/repo links must resolve from the locale file location.
        for (const match of withoutFences(localized).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
          const href = match[1] ?? '';
          if (!href || /^(https?:|mailto:|#)/.test(href)) continue;
          const pathPart = href.split('#')[0] ?? '';
          if (!pathPart) continue;
          const target = resolve(dirname(localizedFile), pathPart);
          const targetRoot = target.endsWith('.md') ? rootForPath(target, documentationRoots) : undefined;
          if (targetRoot !== undefined) {
            const candidateLocaleRoot = join(targetRoot.rootDirectory, 'locales');
            const underLocaleTree =
              target === candidateLocaleRoot ||
              target.startsWith(`${candidateLocaleRoot}/`) ||
              target.startsWith(`${candidateLocaleRoot}\\`);
            if (underLocaleTree) {
              const expectedLocaleRoot = join(candidateLocaleRoot, locale);
              if (
                !target.startsWith(`${expectedLocaleRoot}/`) &&
                target !== expectedLocaleRoot &&
                !target.startsWith(`${expectedLocaleRoot}\\`)
              ) {
                failures.push(`${locale}/${pageSlug}: cross-root link points to a different locale: ${href}`);
              }
            }
          }
          try {
            const targetStats = await stat(target);
            if (!targetStats.isFile() && !targetStats.isDirectory()) throw new Error('unsupported link target');
          } catch {
            failures.push(`${locale}/${pageSlug}: unresolved relative link ${href}`);
          }
        }

        const generatedReference = canonicalFile.includes(`${join('reference', 'generated')}${pathSeparator()}`);
        const reportSlug = sourceRoot.routePrefix ? `${sourceRoot.routePrefix}/${pageSlug}` : pageSlug;
        assertTranslated(locale, reportSlug, canonical, localized, failures, !generatedReference);
      }
    }
  }

  const uniqueFailures = [...new Set(failures)].sort();

  if (options.updateBaseline) {
    const backlogData = {
      version: '1.0',
      description:
        'Baseline technical debt for documentation locale validation. New errors outside this set will fail CI.',
      generatedAt: new Date().toISOString(),
      count: uniqueFailures.length,
      issues: uniqueFailures,
    };
    await writeFile(options.baselinePath, `${JSON.stringify(backlogData, undefined, 2)}\n`, 'utf8');
    console.log(
      `✓ Updated baseline backlog at ${relative(root, options.baselinePath)} with ${uniqueFailures.length} issues.`,
    );
    return;
  }

  let knownIssues = new Set<string>();
  if (!options.noBaseline && !options.strict && existsSync(options.baselinePath)) {
    try {
      const rawContent = await readFile(options.baselinePath, 'utf8');
      const parsed = JSON.parse(rawContent) satisfies { issues?: string[] } | string[];
      const issuesList = Array.isArray(parsed) ? parsed : (parsed.issues ?? []);
      knownIssues = new Set(issuesList);
    } catch (error) {
      console.warn(
        `[validate-doc-locales] Warning: Failed to parse baseline backlog from ${options.baselinePath}: ${String(error)}`,
      );
    }
  }

  const newFailures = uniqueFailures.filter((failure) => !knownIssues.has(failure));
  const suppressedCount = uniqueFailures.length - newFailures.length;

  if (newFailures.length > 0) {
    console.error(`\n❌ Localized documentation validation failed with ${newFailures.length} new regression(s):`);
    for (const failure of newFailures) {
      console.error(`  - ${failure}`);
    }
    if (suppressedCount > 0) {
      console.error(`\n(${suppressedCount} pre-existing issues were suppressed via baseline backlog)`);
    }
    throw new Error(
      `Localized documentation validation failed with ${newFailures.length} new regression(s):\n${newFailures.join('\n')}`,
    );
  }

  if (suppressedCount > 0) {
    console.log(
      `✓ Localized documentation validated successfully (${suppressedCount} pre-existing debt issues suppressed via baseline backlog).`,
    );
    if (knownIssues.size > suppressedCount && !options.locale && !options.slug && !options.package) {
      const resolvedCount = knownIssues.size - suppressedCount;
      console.log(
        `ℹ Ratchet notice: ${resolvedCount} issue(s) in baseline backlog have been resolved! Run 'pnpm run validate:locales -- --update-baseline' to update the ratchet.`,
      );
    }
  } else {
    console.log(
      `✓ Validated ${pages.length} canonical pages across ${documentationRoots.length} roots and ${targetLocales.length} locales with 0 issues.`,
    );
  }
}

function pathSeparator(): string {
  return process.platform === 'win32' ? '\\' : '/';
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
