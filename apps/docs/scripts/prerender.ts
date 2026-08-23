import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildIncludedRoutes,
  collectDocumentSlugs,
  DEFAULT_SLUG,
  discoverDocumentationRoots,
  rootForSlug,
  localSlug,
} from '../src/route-inventory.ts';
import { renderDocumentationMarkdown, renderTocHtml, type MarkdownLinkContext } from '../src/ssg/markdown.ts';
import { buildDocumentSeo, serializeDocsHead } from '../src/ssg/seo.ts';
import {
  DEFAULT_LOCALE,
  type DocumentationLocale,
  resolveDocumentationLocale,
  SUPPORTED_LOCALES,
} from '../src/ssg/site-constants.ts';

const appDirectory = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appDirectory, '../..');
const documentationRoots = discoverDocumentationRoots(repoRoot);
const outputDirectory = path.join(appDirectory, 'dist');
const documentSlugs = collectDocumentSlugs(documentationRoots);
const routes = buildIncludedRoutes(documentSlugs);

const localeSet = new Set<string>(SUPPORTED_LOCALES);

function parseLocaleAndSlug(url: string): { locale: DocumentationLocale; slug: string } {
  const segments = url.replace(/^\//, '').split('/').filter(Boolean);
  const first = segments[0];
  if (first && localeSet.has(first) && first !== DEFAULT_LOCALE) {
    segments.shift();
    return { locale: resolveDocumentationLocale(first), slug: segments.join('/') || DEFAULT_SLUG };
  }
  return { locale: DEFAULT_LOCALE, slug: segments.join('/') || DEFAULT_SLUG };
}


async function markdownFor(
  locale: DocumentationLocale,
  slug: string,
): Promise<{ source: string; context: MarkdownLinkContext } | undefined> {
  const root = rootForSlug(slug, documentationRoots);
  if (root === undefined) return undefined;
  const relativeSlug = localSlug(root, slug);
  const englishPath = path.join(root.rootDirectory, `${relativeSlug}.md`);
  if (locale !== DEFAULT_LOCALE) {
    const localizedPath = path.join(root.rootDirectory, 'locales', locale, `${relativeSlug}.md`);
    try {
      return {
        source: await readFile(localizedPath, 'utf8'),
        context: {
          currentRoot: root,
          roots: documentationRoots,
          hasDocument: (target) => documentSlugs.includes(target),
        },
      };
    } catch {
      // Fall back to English source when a translation file is missing.
    }
  }
  try {
    return {
      source: await readFile(englishPath, 'utf8'),
      context: {
        currentRoot: root,
        roots: documentationRoots,
        hasDocument: (target) => documentSlugs.includes(target),
      },
    };
  } catch {
    return undefined;
  }
}

/** Capture stylesheet + module script tags from the Vite SPA shell before we overwrite route HTML. */
async function readClientAssets(): Promise<string> {
  const source = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
  const tags: string[] = [];
  for (const match of source.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi)) {
    tags.push(match[0]);
  }
  for (const match of source.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*><\/script>/gi)) {
    tags.push(match[0]);
  }
  // Fallback: any module script without an explicit empty body match above.
  if (!tags.some((tag) => tag.startsWith('<script'))) {
    const script = source.match(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>/i)?.[0];
    if (script) tags.push(script);
  }
  return tags.join('');
}

function renderDocumentBody(options: {
  locale: DocumentationLocale;
  slug: string;
  html: string;
  tocHtml: string;
}): string {
  const { locale, slug, html, tocHtml } = options;
  return [
    `<docs-app-shell id="app">`,
    `<forge-router-outlet>`,
    `<main class="docs-document" data-route="document" data-locale="${locale}" data-slug="${slug}">`,
    `<div class="docs-document__content-wrap">`,
    `<article class="docs-document__content markdown-body">`,
    `<div class="forge-markdown">${html}</div>`,
    `</article>`,
    `</div>`,
    tocHtml,
    `</main>`,
    `</forge-router-outlet>`,
    `</docs-app-shell>`,
  ].join('');
}

async function renderRoute(url: string, assetTags: string): Promise<string> {
  const { locale, slug } = parseLocaleAndSlug(url);
  const markdown = await markdownFor(locale, slug);
  const exists = markdown !== undefined;
  const rendered = exists
    ? renderDocumentationMarkdown(markdown.source, slug, locale, markdown.context)
    : {
        html: `<h1>Page not found</h1><p>No documentation exists for “${slug}”.</p>`,
        toc: [],
        title: 'Page not found',
        description: `No documentation exists for “${slug}”.`,
      };

  const seo = buildDocumentSeo({
    locale,
    slug,
    title: rendered.title,
    description: rendered.description,
    exists,
  });

  const tocHtml = exists ? renderTocHtml(rendered.toc) : '';
  const body = renderDocumentBody({
    locale,
    slug,
    html: rendered.html,
    tocHtml,
  });

  return [
    '<!doctype html>',
    `<html lang="${seo.language}" dir="${seo.direction}">`,
    `<head>${serializeDocsHead(seo, assetTags)}</head>`,
    `<body>${body}</body>`,
    '</html>',
  ].join('');
}

const assetTags = await readClientAssets();

for (const route of routes) {
  const output =
    route === '/' ? path.join(outputDirectory, 'index.html') : path.join(outputDirectory, route.slice(1), 'index.html');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, await renderRoute(route, assetTags));
}

console.log(`Prerendered ${routes.length} documentation routes with docs-app-shell activation targets.`);
