import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildIncludedRoutes,
  canonicalForSlug,
  collectDocumentSlugs,
  DEFAULT_SLUG,
  discoverDocumentationRoots,
} from '../src/route-inventory.ts';

const appDirectory = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appDirectory, '../..');
const outputDirectory = path.join(appDirectory, 'dist');
const documentSlugs = collectDocumentSlugs(discoverDocumentationRoots(repoRoot));
const routes = buildIncludedRoutes(documentSlugs);
const assetsDirectory = path.join(outputDirectory, 'assets');
const assetNames = await readdir(assetsDirectory);

function assetNamesFor(prefix: string): string[] {
  return assetNames.filter((name) => name.startsWith(prefix));
}

function parseLocaleAndSlug(urlPath: string): { locale: string; slug: string } {
  const segments = urlPath.replace(/^\//, '').split('/').filter(Boolean);
  const locale = segments[0] && segments[0].length === 2 && segments[0] !== 'en' ? segments.shift() : 'en';
  return { locale: locale as string, slug: segments.join('/') || DEFAULT_SLUG };
}

async function requiredFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    throw new Error(`Docs build is missing required output: ${path.relative(outputDirectory, filePath)}`);
  }
}

function stylesheetHrefs(html: string): string[] {
  return [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)]
    .map((match) => match[0].match(/\bhref=["']([^"']+)["']/i)?.[1])
    .filter((href): href is string => href !== undefined);
}

async function assertStylesheetAssets(html: string, label: string): Promise<string[]> {
  const hrefs = stylesheetHrefs(html);
  if (hrefs.length === 0) {
    throw new Error(`${label} is missing document stylesheet tags`);
  }
  if (new Set(hrefs).size !== hrefs.length) {
    throw new Error(`${label} contains duplicated document stylesheet URLs`);
  }
  for (const href of hrefs) {
    const assetPath = new URL(href, 'https://docs.mission-platform.test/').pathname.replace(/^\//, '');
    await requiredFile(path.join(outputDirectory, assetPath));
  }
  return hrefs;
}

function assertContains(html: string, snippet: string, label: string): void {
  if (!html.includes(snippet)) {
    throw new Error(`${label} is missing required snippet: ${snippet}`);
  }
}

// Check a representative package-owned route so this verification cannot pass
// while package pages are only available through the client-side fallback.
const nestedRoute = '/packages/integrations/barcode/index';
if (!routes.includes(nestedRoute)) {
  throw new Error(`Docs build inventory is missing the representative package route ${nestedRoute}`);
}

const { locale: nestedLocale, slug: nestedSlug } = parseLocaleAndSlug(nestedRoute);
const expectedCanonical = canonicalForSlug(nestedSlug, nestedLocale);
const nestedHtmlPath =
  nestedRoute === '/'
    ? path.join(outputDirectory, 'index.html')
    : path.join(outputDirectory, nestedRoute.slice(1), 'index.html');
const nestedHtml = await requiredFile(nestedHtmlPath);

// ─── Activation target ───────────────────────────────────────────────────────
assertContains(nestedHtml, '<docs-app-shell', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'id="app"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, '<forge-router-outlet', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'data-route="document"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, '<article', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, `data-locale="${nestedLocale}"`, `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, `data-slug="${nestedSlug}"`, `Prerendered nested route ${nestedRoute}`);

// ─── Real Markdown pipeline (not the old regex placeholder) ──────────────────
if (nestedHtml.includes('</p><p><h') || (nestedHtml.includes('<h1>') && nestedHtml.includes('</h1></p>'))) {
  throw new Error(`Prerendered nested route ${nestedRoute} still looks like the regex markdown placeholder`);
}
assertContains(nestedHtml, '<h1', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'class="forge-markdown"', `Prerendered nested route ${nestedRoute}`);

// ─── Full SEO surface ────────────────────────────────────────────────────────
assertContains(nestedHtml, `href="${expectedCanonical}"`, `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'application/ld+json', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, '"@type":"WebSite"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, '"@type":"Organization"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, '"@type":"WebPage"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, '"@type":"BreadcrumbList"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'name="description"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'name="robots"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'property="og:title"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'property="og:description"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'name="twitter:card"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'name="theme-color"', `Prerendered nested route ${nestedRoute}`);
assertContains(nestedHtml, 'name="generator"', `Prerendered nested route ${nestedRoute}`);

// Client assets must survive prerender overwrites (CSS + module script).
const nestedStylesheets = await assertStylesheetAssets(nestedHtml, `Prerendered nested route ${nestedRoute}`);
if (!/<script\b[^>]*\btype=["']module["'][^>]*>/.test(nestedHtml)) {
  throw new Error(`Prerendered nested route ${nestedRoute} is missing the client module script`);
}

// The global document stylesheet is compiled from tokens, app.scss, global.scss,
// and highlight.js. Check the compiled output rather than source filenames,
// which are intentionally collapsed into a hashed Vite asset.
const documentStylesheet = await requiredFile(
  path.join(
    outputDirectory,
    new URL(nestedStylesheets[0], 'https://docs.mission-platform.test/').pathname.replace(/^\//, ''),
  ),
);
assertContains(documentStylesheet, '--mp-', 'Compiled design tokens stylesheet');
assertContains(documentStylesheet, 'docs-app', 'Compiled docs app stylesheet');
assertContains(documentStylesheet, 'hljs', 'Compiled highlight.js stylesheet');

// Forge component CSS remains available as addressable assets for shadow roots.
const emittedForgeStyles = assetNamesFor('forge-');
const clientJavaScript = await Promise.all(
  assetNames.filter((name) => name.endsWith('.js')).map((name) => readFile(path.join(assetsDirectory, name), 'utf8')),
);
const clientGraph = clientJavaScript.join('\n');
for (const component of ['forge-application-layout', 'forge-navbar', 'forge-select']) {
  const styleAsset = emittedForgeStyles.find((name) => name.startsWith(`${component}-`) && name.endsWith('.css'));
  if (styleAsset === undefined) {
    throw new Error(`Docs build is missing the ${component} Forge CSS sidecar`);
  }
  if (component === 'forge-application-layout' && !clientGraph.includes(`/assets/${styleAsset}`)) {
    throw new Error(`Docs client metadata does not reference the ${component} Forge CSS sidecar`);
  }
}

// Validate generated metadata and resolve every representative style URL against
// the actual package output. This catches flattened shared paths and stale
// metadata even though prerendered HTML cannot serialize a shadow root.
const forgeModules = [
  {
    label: 'forge-navbar',
    module: path.join(
      repoRoot,
      'packages/ui/components/dist/web-components/components/organisms/forge-navbar/forge-navbar.js',
    ),
    expected: ['../../../styles/size.css', './forge-navbar.css'],
  },
  {
    label: 'forge-application-layout',
    module: path.join(
      repoRoot,
      'packages/ui/layout/dist/web-components/components/templates/forge-application-layout/forge-application-layout.js',
    ),
    expected: ['./forge-application-layout.css'],
  },
  {
    label: 'forge-select',
    module: path.join(
      repoRoot,
      'packages/ui/select/dist/web-components/components/molecules/forge-select/forge-select.js',
    ),
    expected: ['./forge-select.css'],
  },
] as const;
for (const { label, module, expected } of forgeModules) {
  const source = await requiredFile(module);
  if (!/static styleUrls\s*=\s*\[/.test(source)) {
    throw new Error(`${label} generated Web Component is missing styleUrls metadata`);
  }
  for (const styleUrl of expected) {
    if (!source.includes(`new URL("${styleUrl}", import.meta.url).href`)) {
      throw new Error(`${label} generated style metadata is missing ${styleUrl}`);
    }
    await requiredFile(path.resolve(path.dirname(module), styleUrl));
  }
}

// Homepage activation target as well (deployed root).
const homeHtml = await requiredFile(path.join(outputDirectory, 'index.html'));
assertContains(homeHtml, '<docs-app-shell', 'Prerendered homepage');
assertContains(homeHtml, '"@type":"WebSite"', 'Prerendered homepage');
await assertStylesheetAssets(homeHtml, 'Prerendered homepage');

const translatedRoute = routes.find((route) => route.startsWith('/fr/'));
if (translatedRoute) {
  const translatedHtml = await requiredFile(path.join(outputDirectory, translatedRoute.slice(1), 'index.html'));
  const translatedStylesheets = await assertStylesheetAssets(
    translatedHtml,
    `Prerendered translated route ${translatedRoute}`,
  );
  if (translatedStylesheets.join('\n') !== nestedStylesheets.join('\n')) {
    throw new Error(`Translated route ${translatedRoute} does not retain the same stylesheet assets as ${nestedRoute}`);
  }
}

const sitemap = await requiredFile(path.join(outputDirectory, 'sitemap.xml'));
const robots = await requiredFile(path.join(outputDirectory, 'robots.txt'));
if (
  !sitemap.includes('<urlset') ||
  !sitemap.includes('packages/tooling/configs/') ||
  !sitemap.includes('packages/integrations/barcode/index')
) {
  throw new Error('Sitemap does not include project and package documentation URLs');
}
if (!robots.includes('/search')) {
  throw new Error('robots.txt does not disallow /search');
}

// The docs bundle imports Markdown/corpus content that may contain stringified framework examples,
// so we avoid fragile "import('vue')" checks.
// Instead, we look for internal Vue runtime signature constants that should only exist when Vue
// runtime code itself is bundled.
const vueRuntimeSignatures = [
  '__VUE_OPTIONS_API__',
  '__VUE_PROD_DEVTOOLS__',
  '__v_isRef',
  '__v_isVNode',
  'createBaseVNode',
  'createVNode',
  'openBlock',
  'withCtx',
  'setupRenderEffect',
  'normalizeProps',
];

const foundVueSignatures = vueRuntimeSignatures.filter((signature) => clientGraph.includes(signature));
if (foundVueSignatures.length > 0) {
  throw new Error(`Docs client bundle appears to include Vue runtime signatures: ${foundVueSignatures.join(', ')}`);
}

console.log(
  `Docs build output verified: ${routes.length} routes, document and Forge stylesheets, docs-app-shell activation, full SEO surface, markdown pipeline, and framework-free client graph.`,
);
