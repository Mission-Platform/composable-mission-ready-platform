import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type { SitemapUrl } from '@mission-platform/seo';
import {
  DOCUMENTATION_WORKSPACE_FAMILIES,
  packageDocumentationSourceRoot,
  projectDocumentationSourceRoot,
  qualifiedSlug,
  type DocumentationSourceRoot,
} from './documentation-sources.ts';

export const SITE_ORIGIN = 'https://docs.mission-platform.dev';
export const DEFAULT_SLUG = 'overview';
export const SUPPORTED_LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;

function packageRoots(repoRoot: string): DocumentationSourceRoot[] {
  const roots: DocumentationSourceRoot[] = [];
  for (const family of DOCUMENTATION_WORKSPACE_FAMILIES) {
    const familyDirectory = path.join(repoRoot, family);
    if (!existsSync(familyDirectory)) continue;
    const pending = [familyDirectory];
    while (pending.length > 0) {
      const directory = pending.pop()!;
      let entries;
      try {
        entries = readdirSync(directory, { withFileTypes: true });
      } catch {
        continue;
      }
      if (entries.some((entry) => entry.isFile() && entry.name === 'package.json')) {
        const docsDirectory = path.join(directory, 'docs');
        if (existsSync(docsDirectory)) {
          const workspaceDirectory = path.relative(repoRoot, directory).split(path.sep).join('/');
          let packageName: string | undefined;
          try {
            const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')) as { name?: string };
            packageName = manifest.name;
          } catch {
            // Package validation reports malformed manifests separately.
          }
          roots.push({
            ...packageDocumentationSourceRoot(workspaceDirectory, docsDirectory, packageName),
          });
        }
      }
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.isSymbolicLink() &&
          entry.name !== 'node_modules' &&
          !entry.name.startsWith('.')
        ) {
          pending.push(path.join(directory, entry.name));
        }
      }
    }
  }
  return roots.sort((left, right) => left.routePrefix.localeCompare(right.routePrefix));
}

/** Discover project docs and every publishable package docs root. */
export function discoverDocumentationRoots(repoRoot: string): readonly DocumentationSourceRoot[] {
  return [
    projectDocumentationSourceRoot(path.join(repoRoot, 'docs')),
    ...packageRoots(repoRoot),
  ];
}

export function rootForSlug(slug: string, documentationRoots: readonly DocumentationSourceRoot[]) {
  const roots = documentationRoots.filter(
    (root) => root.routePrefix !== '' && (slug === root.routePrefix || slug.startsWith(`${root.routePrefix}/`)),
  );
  // Prefer longest routePrefix match for nested packages
  roots.sort((a, b) => b.routePrefix.length - a.routePrefix.length);
  return roots[0] ?? documentationRoots.find((root) => root.routePrefix === '');
}

export function localSlug(root: DocumentationSourceRoot, slug: string): string {
  return root.routePrefix === '' ? slug : slug.slice(`${root.routePrefix}/`.length);
}

function localMarkdownSlugs(documentsDirectory: string): string[] {
  if (!existsSync(documentsDirectory)) return [];
  const entries = readdirSync(documentsDirectory, { recursive: true, withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        !path.join(entry.parentPath, entry.name).split(path.sep).includes('locales'),
    )
    .map((entry) => {
      const relative = path.relative(documentsDirectory, path.join(entry.parentPath, entry.name));
      return relative.replace(/\.md$/, '').split(path.sep).join('/');
    })
    .toSorted();
}

/** All documentation slugs for one root or a merged project/package inventory. */
export function collectDocumentSlugs(documentsDirectory: string): string[];
export function collectDocumentSlugs(sourceRoots: readonly DocumentationSourceRoot[]): string[];
export function collectDocumentSlugs(documentsDirectoryOrRoots: string | readonly DocumentationSourceRoot[]): string[] {
  if (typeof documentsDirectoryOrRoots === 'string') return localMarkdownSlugs(documentsDirectoryOrRoots);
  return documentsDirectoryOrRoots
    .flatMap((sourceRoot) =>
      localMarkdownSlugs(sourceRoot.rootDirectory).map((slug) => qualifiedSlug(sourceRoot, slug)),
    )
    .toSorted();
}

export function canonicalForSlug(slug: string, locale: string = 'en'): string {
  if (locale === 'en' && slug === DEFAULT_SLUG) return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}/${locale === 'en' ? '' : `${locale}/`}${slug}`;
}

export function alternatesForSlug(slug: string): Array<{ hreflang: string; href: string }> {
  return SUPPORTED_LOCALES.map((locale) => ({
    hreflang: locale,
    href: canonicalForSlug(slug, locale),
  }));
}

export function buildIncludedRoutes(documentSlugs: readonly string[]): string[] {
  return [
    '/',
    ...documentSlugs.map((slug) => `/${slug}`),
    ...SUPPORTED_LOCALES.filter((locale) => locale !== 'en').flatMap((locale) =>
      documentSlugs.map((slug) => `/${locale}/${slug}`),
    ),
  ];
}

export function buildSitemapUrls(documentSlugs: readonly string[]): SitemapUrl[] {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    documentSlugs.map((slug) => ({
      loc: canonicalForSlug(slug, locale),
      changefreq: 'weekly' as const,
      priority: slug === DEFAULT_SLUG ? 1 : 0.8,
      alternates: alternatesForSlug(slug),
    })),
  );
}
