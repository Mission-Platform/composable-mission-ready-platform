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
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  DOCUMENTATION_LOCALES,
  assessTranslationQuality,
  protectedTechnicalTokens,
  withoutFences,
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
    const rightSlug = right.sourceRoot.routePrefix ? `${right.sourceRoot.routePrefix}/${right.pageSlug}` : right.pageSlug;
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

async function main(): Promise<void> {
  const documentationRoots = discoverDocumentationRoots(root);
  const pages = await canonicalPages(documentationRoots);
  const failures: string[] = [];

  for (const locale of locales) {
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
      if (missing.length > 0) failures.push(`${locale}/${rootLabel}: missing ${missing.join(', ')}`);
      if (extra.length > 0) failures.push(`${locale}/${rootLabel}: extra ${extra.join(', ')}`);

      for (const page of rootPages) {
        const canonicalFile = page.sourcePath;
        const pageSlug = page.pageSlug;
        const localizedFile = join(localeRoot, `${pageSlug}.md`);
        let canonical: string;
        let localized: string;
        try {
          [canonical, localized] = await Promise.all([readFile(canonicalFile, 'utf8'), readFile(localizedFile, 'utf8')]);
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
            const localeRoot = join(targetRoot.rootDirectory, 'locales');
            const underLocaleTree =
              target === localeRoot || target.startsWith(`${localeRoot}/`) || target.startsWith(`${localeRoot}\\`);
            if (underLocaleTree) {
              const expectedLocaleRoot = join(localeRoot, locale);
              if (!target.startsWith(`${expectedLocaleRoot}/`) && target !== expectedLocaleRoot && !target.startsWith(`${expectedLocaleRoot}\\`)) {
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

  if (failures.length > 0) {
    throw new Error(`Localized documentation validation failed:\n${failures.join('\n')}`);
  }
  console.log(
    `Validated ${pages.length} canonical pages across ${documentationRoots.length} roots and ${locales.length} locales.`,
  );
}

function pathSeparator(): string {
  return process.platform === 'win32' ? '\\' : '/';
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
