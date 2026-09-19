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

/**
 * Extracts a flag argument value either as `--flag=value` or `--flag value`.
 *
 * @param arg - Current CLI argument.
 * @param nextArg - Subsequent CLI argument if available.
 * @param flag - Target flag name.
 * @returns Object with parsed value and consumed indicator.
 */
function extractArgValue(
  arg: string,
  nextArg: string | undefined,
  flag: string,
): { value?: string; consumed: boolean } {
  if (arg === flag && nextArg && !nextArg.startsWith('-')) {
    return { value: nextArg, consumed: true };
  }
  if (arg.startsWith(`${flag}=`)) {
    return { value: arg.slice(flag.length + 1), consumed: false };
  }
  return { consumed: false };
}

interface MutableValidationCliArgs {
  locale?: string;
  slug?: string;
  package?: string;
  baselinePath: string;
  noBaseline: boolean;
  updateBaseline: boolean;
  strict: boolean;
}

/**
 * Checks for boolean flags and mutates the options state accordingly.
 *
 * @param arg - Command line argument token.
 * @param state - Mutable validation CLI options state.
 * @returns True if a boolean flag was matched.
 */
function tryMatchBooleanFlag(arg: string, state: MutableValidationCliArgs): boolean {
  if (arg === '--update-baseline') {
    state.updateBaseline = true;
    return true;
  }
  if (arg === '--no-baseline') {
    state.noBaseline = true;
    return true;
  }
  if (arg === '--strict') {
    state.strict = true;
    return true;
  }
  return false;
}

const VALUE_FLAGS = ['--baseline', '--locale', '--slug', '--package'] as const;

/**
 * Assigns a matched value flag to the CLI options state.
 *
 * @param flag - The flag name matched.
 * @param value - The extracted flag value.
 * @param state - Mutable options state.
 */
function assignValueFlag(flag: (typeof VALUE_FLAGS)[number], value: string, state: MutableValidationCliArgs): void {
  switch (flag) {
    case '--baseline': {
      state.baselinePath = resolve(process.cwd(), value);
      break;
    }
    case '--locale': {
      state.locale = value;
      break;
    }
    case '--slug': {
      state.slug = value;
      break;
    }
    case '--package': {
      state.package = value;
      break;
    }
  }
}

/**
 * Checks for value flags (--baseline, --locale, --slug, --package).
 *
 * @param arg - Current argument token.
 * @param nextArg - Subsequent argument token if present.
 * @param state - Mutable options state.
 * @returns Number of additional arguments consumed (0 or 1).
 */
function tryMatchValueFlag(arg: string, nextArg: string | undefined, state: MutableValidationCliArgs): number {
  for (const flag of VALUE_FLAGS) {
    const match = extractArgValue(arg, nextArg, flag);
    if (!match.value) continue;
    assignValueFlag(flag, match.value, state);
    return match.consumed ? 1 : 0;
  }
  return 0;
}

/**
 * Parses and normalizes command-line arguments for documentation locale validation.
 *
 * @param argv - Argument array from process.argv.
 * @returns Structured validation configuration.
 */
function parseCliArgs(argv: readonly string[]): ValidationCliArgs {
  const args = argv.slice(2);
  const state: MutableValidationCliArgs = {
    baselinePath: join(root, 'scripts', 'doc-locales-backlog.json'),
    noBaseline: false,
    updateBaseline: false,
    strict: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (tryMatchBooleanFlag(arg, state)) continue;
    index += tryMatchValueFlag(arg, args[index + 1], state);
  }

  return state;
}

/**
 * Validates that all canonical slugs in a documentation source root exist in localized directories.
 *
 * @param locale - Target locale code.
 * @param sourceRoot - Documentation source root.
 * @param pages - Canonical pages list.
 * @param localeRoot - Localized root path.
 * @param failures - Failures array to append to.
 */
async function validateRootSlugs(
  locale: string,
  sourceRoot: DocumentationSourceRoot,
  pages: CanonicalPage[],
  localeRoot: string,
  failures: string[],
): Promise<void> {
  const canonicalRoot = sourceRoot.rootDirectory;
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
}

/**
 * Extracts candidate relative Markdown link hrefs from document text.
 *
 * @param content - Markdown content to scan.
 * @returns Array of relative Markdown href strings.
 */
function extractRelativeLinkHrefs(content: string): string[] {
  const hrefs: string[] = [];
  for (const match of withoutFences(content).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1];
    if (href && !/^(https?:|mailto:|#)/.test(href)) {
      const pathPart = href.split('#')[0];
      if (pathPart) hrefs.push(href);
    }
  }
  return hrefs;
}

/**
 * Checks whether a target file path is contained within a designated root directory.
 *
 * @param targetPath - Resolved file path.
 * @param rootPath - Container directory path.
 * @returns True if target is contained under root.
 */
function isPathUnderRoot(targetPath: string, rootPath: string): boolean {
  return targetPath === rootPath || targetPath.startsWith(`${rootPath}/`) || targetPath.startsWith(`${rootPath}\\`);
}

/**
 * Verifies that a link pointing to a markdown page under another documentation root does not cross locale boundaries.
 *
 * @param target - Resolved absolute target path.
 * @param locale - Expected locale code.
 * @param documentationRoots - Discovered documentation source roots.
 * @returns True if cross-root locale link is valid or not applicable.
 */
function checkCrossRootLocaleLink(
  target: string,
  locale: string,
  documentationRoots: DocumentationSourceRoot[],
): boolean {
  if (!target.endsWith('.md')) return true;
  const targetRoot = rootForPath(target, documentationRoots);
  if (!targetRoot) return true;

  const candidateLocaleRoot = join(targetRoot.rootDirectory, 'locales');
  if (!isPathUnderRoot(target, candidateLocaleRoot)) return true;

  const expectedLocaleRoot = join(candidateLocaleRoot, locale);
  return isPathUnderRoot(target, expectedLocaleRoot);
}

/**
 * Tests whether a relative link resolves to a valid existing file or directory on disk.
 *
 * @param targetPath - Absolute target file path.
 * @returns True if file or directory exists.
 */
async function verifyLinkTargetExists(targetPath: string): Promise<boolean> {
  try {
    const stats = await stat(targetPath);
    return stats.isFile() || stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Validates a single relative link for target existence and locale boundary containment.
 *
 * @param href - Relative link href.
 * @param context - Validation context with locale, slug, and file paths.
 * @param failures - Failures array to append issues to.
 */
async function validateSingleRelativeLink(
  href: string,
  context: {
    readonly locale: string;
    readonly pageSlug: string;
    readonly localizedFile: string;
    readonly documentationRoots: DocumentationSourceRoot[];
  },
  failures: string[],
): Promise<void> {
  const pathPart = href.split('#')[0] ?? '';
  const target = resolve(dirname(context.localizedFile), pathPart);

  if (!checkCrossRootLocaleLink(target, context.locale, context.documentationRoots)) {
    failures.push(`${context.locale}/${context.pageSlug}: cross-root link points to a different locale: ${href}`);
  }

  const exists = await verifyLinkTargetExists(target);
  if (!exists) {
    failures.push(`${context.locale}/${context.pageSlug}: unresolved relative link ${href}`);
  }
}

/**
 * Validates relative links within localized documentation to verify target resolution and locale boundaries.
 *
 * @param locale - Target locale code.
 * @param pageSlug - Slug of the validating page.
 * @param localized - Raw markdown content.
 * @param localizedFile - Path to the localized markdown file.
 * @param documentationRoots - Discovered documentation source roots.
 * @param failures - Failures array to append to.
 */
async function validateRelativeLinks(
  locale: string,
  pageSlug: string,
  localized: string,
  localizedFile: string,
  documentationRoots: DocumentationSourceRoot[],
  failures: string[],
): Promise<void> {
  const hrefs = extractRelativeLinkHrefs(localized);
  const context = { locale, pageSlug, localizedFile, documentationRoots };
  for (const href of hrefs) {
    await validateSingleRelativeLink(href, context, failures);
  }
}

/**
 * Compares code fences between canonical and localized markdown files.
 *
 * @param canonical - Canonical source text.
 * @param localized - Localized source text.
 * @param prefix - Diagnostic prefix (locale/pageSlug).
 * @param failures - Failures array.
 */
function validateCodeFencesMatch(canonical: string, localized: string, prefix: string, failures: string[]): void {
  const canonicalFences = fences(canonical);
  const localizedFences = fences(localized);
  if (JSON.stringify(canonicalFences) !== JSON.stringify(localizedFences)) {
    failures.push(`${prefix}: fenced code blocks differ from canonical source`);
  }
}

/**
 * Verifies that generated API reference documentation contains generated-file markers.
 *
 * @param canonicalFile - Canonical file path.
 * @param canonical - Canonical file content.
 * @param localized - Localized file content.
 * @param prefix - Diagnostic prefix.
 * @param failures - Failures array.
 */
function validateGeneratedMarkers(
  canonicalFile: string,
  canonical: string,
  localized: string,
  prefix: string,
  failures: string[],
): void {
  if (!canonicalFile.includes(`${join('reference', 'generated')}${pathSeparator()}`)) return;
  const marker = '<!-- Generated by scripts/extract-package-docs.ts.';
  if (!canonical.includes(marker)) {
    failures.push(`${prefix}: generated reference is missing its generated-file marker`);
  }
  if (!localized.includes(marker)) {
    failures.push(`${prefix}: localized generated reference is missing its generated-file marker`);
  }
}

/**
 * Verifies that the localized file starts with a link pointing back to the canonical source.
 *
 * @param localized - Localized file content.
 * @param localizedFile - Path to localized file.
 * @param canonicalFile - Path to canonical file.
 * @param prefix - Diagnostic prefix.
 * @param pageSlug - Page slug.
 * @param failures - Failures array.
 */
function validateCanonicalSourceLink(
  localized: string,
  localizedFile: string,
  canonicalFile: string,
  prefix: string,
  pageSlug: string,
  failures: string[],
): void {
  const sourceLink = localized.match(/\]\(([^)]+)\)/u)?.[1];
  if (!sourceLink) {
    failures.push(`${prefix}: missing canonical source link`);
    return;
  }
  if (resolve(dirname(localizedFile), sourceLink) !== canonicalFile) {
    failures.push(`${prefix}: canonical source link does not resolve to ${pageSlug}.md`);
  }
}

/**
 * Validates an individual localized markdown file for fences, markers, links, and translation quality.
 *
 * @param locale - Target locale code.
 * @param page - Canonical page record.
 * @param localeRoot - Localized root directory.
 * @param documentationRoots - Documentation source roots.
 * @param failures - Failures array to append to.
 */
async function validatePageFile(
  locale: string,
  page: CanonicalPage,
  localeRoot: string,
  documentationRoots: DocumentationSourceRoot[],
  failures: string[],
): Promise<void> {
  const canonicalFile = page.sourcePath;
  const pageSlug = page.pageSlug;
  const localizedFile = join(localeRoot, `${pageSlug}.md`);
  let content: [string, string];
  try {
    content = await Promise.all([readFile(canonicalFile, 'utf8'), readFile(localizedFile, 'utf8')]);
  } catch {
    return;
  }
  const [canonical, localized] = content;
  const prefix = `${locale}/${pageSlug}`;

  validateCodeFencesMatch(canonical, localized, prefix, failures);
  validateGeneratedMarkers(canonicalFile, canonical, localized, prefix, failures);
  validateCanonicalSourceLink(localized, localizedFile, canonicalFile, prefix, pageSlug, failures);

  await validateRelativeLinks(locale, pageSlug, localized, localizedFile, documentationRoots, failures);

  const generatedReference = canonicalFile.includes(`${join('reference', 'generated')}${pathSeparator()}`);
  const reportSlug = page.sourceRoot.routePrefix ? `${page.sourceRoot.routePrefix}/${pageSlug}` : pageSlug;
  assertTranslated(locale, reportSlug, canonical, localized, failures, !generatedReference);
}

/**
 * Determines whether the baseline backlog should be loaded based on CLI options.
 *
 * @param options - Parsed CLI options.
 * @returns True if baseline should be loaded.
 */
function shouldLoadBaseline(options: ValidationCliArgs): boolean {
  if (options.noBaseline || options.strict) return false;
  return existsSync(options.baselinePath);
}

/**
 * Parses issues array from raw baseline backlog JSON.
 *
 * @param rawContent - Raw JSON string.
 * @returns Array of issue key strings.
 */
function parseBaselineIssues(rawContent: string): string[] {
  const parsed = JSON.parse(rawContent) satisfies { issues?: string[] } | string[];
  if (Array.isArray(parsed)) return parsed;
  return parsed.issues ?? [];
}

/**
 * Loads suppressed technical debt issues from the baseline backlog JSON file.
 *
 * @param options - Parsed CLI options.
 * @returns Set of known baseline issue keys.
 */
async function loadKnownIssues(options: ValidationCliArgs): Promise<Set<string>> {
  if (!shouldLoadBaseline(options)) {
    return new Set();
  }
  try {
    const rawContent = await readFile(options.baselinePath, 'utf8');
    return new Set(parseBaselineIssues(rawContent));
  } catch (error) {
    console.warn(
      `[validate-doc-locales] Warning: Failed to parse baseline backlog from ${options.baselinePath}: ${String(error)}`,
    );
    return new Set();
  }
}

/**
 * Updates the baseline backlog JSON file with current unique validation issues.
 *
 * @param baselinePath - File path to save baseline to.
 * @param uniqueFailures - Sorted list of unique issue keys.
 */
async function saveBaselineBacklog(baselinePath: string, uniqueFailures: readonly string[]): Promise<void> {
  const backlogData = {
    version: '1.0',
    description:
      'Baseline technical debt for documentation locale validation. New errors outside this set will fail CI.',
    generatedAt: new Date().toISOString(),
    count: uniqueFailures.length,
    issues: uniqueFailures,
  };
  await writeFile(baselinePath, `${JSON.stringify(backlogData, undefined, 2)}\n`, 'utf8');
  console.log(`✓ Updated baseline backlog at ${relative(root, baselinePath)} with ${uniqueFailures.length} issues.`);
}

/**
 * Emits error diagnostics for new regression failures and throws an Error.
 *
 * @param newFailures - List of regression issue keys.
 * @param suppressedCount - Count of suppressed historical issues.
 */
function reportFailuresAndThrow(newFailures: readonly string[], suppressedCount: number): never {
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

/**
 * Checks whether resolved issues in baseline warrant a ratchet notice.
 *
 * @param knownIssuesCount - Total issues registered in baseline.
 * @param suppressedCount - Suppressed issues in current run.
 * @param options - CLI options.
 */
function checkRatchetNotice(knownIssuesCount: number, suppressedCount: number, options: ValidationCliArgs): void {
  const isFiltered = Boolean(options.locale || options.slug || options.package);
  if (isFiltered || knownIssuesCount <= suppressedCount) return;
  const resolvedCount = knownIssuesCount - suppressedCount;
  console.log(
    `ℹ Ratchet notice: ${resolvedCount} issue(s) in baseline backlog have been resolved! Run 'pnpm run validate:locales -- --update-baseline' to update the ratchet.`,
  );
}

/**
 * Compares detected issues against baseline backlog and reports pass/fail diagnostics.
 *
 * @param uniqueFailures - Detected unique validation issues.
 * @param knownIssues - Baseline backlog known issues.
 * @param options - CLI validation options.
 * @param pagesCount - Total canonical pages evaluated.
 * @param rootsCount - Total documentation roots evaluated.
 * @param localesCount - Total locales evaluated.
 */
function reportResults(
  uniqueFailures: readonly string[],
  knownIssues: Set<string>,
  options: ValidationCliArgs,
  pagesCount: number,
  rootsCount: number,
  localesCount: number,
): void {
  const newFailures = uniqueFailures.filter((failure) => !knownIssues.has(failure));
  const suppressedCount = uniqueFailures.length - newFailures.length;

  if (newFailures.length > 0) {
    reportFailuresAndThrow(newFailures, suppressedCount);
  }

  if (suppressedCount > 0) {
    console.log(
      `✓ Localized documentation validated successfully (${suppressedCount} pre-existing debt issues suppressed via baseline backlog).`,
    );
    checkRatchetNotice(knownIssues.size, suppressedCount, options);
    return;
  }

  console.log(
    `✓ Validated ${pagesCount} canonical pages across ${rootsCount} roots and ${localesCount} locales with 0 issues.`,
  );
}

/**
 * Filters discovered documentation source roots by optional package or route prefix.
 *
 * @param roots - Discovered source roots.
 * @param pkg - Optional package or prefix filter.
 * @returns Filtered source roots array.
 */
function filterDocumentationRoots(
  roots: DocumentationSourceRoot[],
  pkg: string | undefined,
): DocumentationSourceRoot[] {
  if (!pkg) return roots;
  return roots.filter((sourceRoot) => sourceRoot.packageName === pkg || sourceRoot.routePrefix === pkg);
}

/**
 * Filters canonical pages by optional slug.
 *
 * @param pages - Canonical pages list.
 * @param targetSlug - Optional target slug.
 * @returns Filtered pages list.
 */
function filterCanonicalPages(pages: CanonicalPage[], targetSlug: string | undefined): CanonicalPage[] {
  if (!targetSlug) return pages;
  return pages.filter(
    (page) => page.pageSlug === targetSlug || `${page.sourceRoot.routePrefix}/${page.pageSlug}` === targetSlug,
  );
}

/**
 * Resolves the target locales to validate.
 *
 * @param targetLocale - Optional specific locale code.
 * @returns List of locales to validate.
 */
function resolveTargetLocales(targetLocale: string | undefined): readonly DocumentationLocale[] {
  if (!targetLocale) return locales;
  return locales.filter((localeItem) => localeItem === targetLocale) satisfies readonly DocumentationLocale[];
}

/**
 * Validates canonical pages across all target locales and documentation roots.
 *
 * @param localesList - Locales to validate.
 * @param documentationRoots - Documentation source roots.
 * @param pages - Canonical pages list.
 * @param failures - Failures array to populate.
 */
async function validateLocaleRoots(
  localesList: readonly DocumentationLocale[],
  documentationRoots: DocumentationSourceRoot[],
  pages: CanonicalPage[],
  failures: string[],
): Promise<void> {
  for (const locale of localesList) {
    for (const sourceRoot of documentationRoots) {
      const localeRoot = join(sourceRoot.rootDirectory, 'locales', locale);
      await validateRootSlugs(locale, sourceRoot, pages, localeRoot, failures);
      const rootPages = pages.filter((page) => page.sourceRoot.rootDirectory === sourceRoot.rootDirectory);
      for (const page of rootPages) {
        await validatePageFile(locale, page, localeRoot, documentationRoots, failures);
      }
    }
  }
}

/**
 * Main execution entry point for documentation locale validation.
 */
async function main(): Promise<void> {
  const options = parseCliArgs(process.argv);
  const documentationRoots = filterDocumentationRoots(discoverDocumentationRoots(root), options.package);
  const pages = filterCanonicalPages(await canonicalPages(documentationRoots), options.slug);
  const targetLocales = resolveTargetLocales(options.locale);

  const failures: string[] = [];
  await validateLocaleRoots(targetLocales, documentationRoots, pages, failures);

  const uniqueFailures = [...new Set(failures)].sort();

  if (options.updateBaseline) {
    await saveBaselineBacklog(options.baselinePath, uniqueFailures);
    return;
  }

  const knownIssues = await loadKnownIssues(options);
  reportResults(uniqueFailures, knownIssues, options, pages.length, documentationRoots.length, targetLocales.length);
}

/**
 * Returns the OS-specific path separator.
 *
 * @returns Windows backslash or POSIX forward slash.
 */
function pathSeparator(): string {
  return process.platform === 'win32' ? '\\' : '/';
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
