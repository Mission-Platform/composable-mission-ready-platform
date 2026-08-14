import fs from 'node:fs';
import path from 'node:path';

export type SupportedApp = 'docs' | 'my-care-notes' | 'service-monitor' | 'storybook' | 'website';

const ROUTE_SOURCE_FILES = [
  'src/router/index.ts',
  'src/router/index.tsx',
  'src/router/index.js',
  'src/router/index.jsx',
  'src/worker.tsx',
  'src/worker.ts',
  'src/worker.jsx',
  'src/worker.js',
  'src/main.ts',
  'src/main.tsx',
  'src/main.js',
  'src/main.jsx',
] as const;

function routeLiterals(source: string): string[] {
  return [...source.matchAll(/\b(?:path\s*:\s*|route\s*\(\s*)(?:'([^']+)'|"([^"]+)"|`([^`]+)`)/g)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  );
}

function localeRoutes(appDirectory: string): string[] {
  const localeDirectory = path.join(appDirectory, 'locales');
  if (!fs.existsSync(localeDirectory)) return [];
  const locales = fs
    .readdirSync(localeDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.name.endsWith('.yaml'))
    .map((entry) => (entry.isDirectory() ? entry.name : entry.name.split('.')[0]))
    .filter((locale) => /^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale));
  return locales.filter((locale) => locale !== 'en').map((locale) => `/${locale}`);
}

export function expandRoutePattern(route: string, app: SupportedApp | string, appDirectory?: string): string[] {
  if (app === 'service-monitor' && route.startsWith('/api/')) return [];
  if (app === 'docs' && route === '/:slug(.*)') return ['/', '/overview', '/search', '/__not-found__'];
  if (app === 'website' && route.includes(':locale')) return ['/', ...(appDirectory ? localeRoutes(appDirectory) : [])];
  if (app === 'my-care-notes' && route.includes(':lang'))
    return ['/', '/en/', '/?panel=snippets', '/?overlay=snippet-new', '/?overlay=snippet-edit&id=fixture'];
  return [route];
}

/**
 * Return all app entry files that can contain a route table.  Keeping this
 * list in one place prevents the inventory and route discovery from silently
 * disagreeing about which source files were inspected.
 */
export function discoverAppRouteFiles(appDirectory: string): string[] {
  return ROUTE_SOURCE_FILES.map((file) => path.join(appDirectory, file)).filter((filePath) => fs.existsSync(filePath));
}

export function discoverAppRoutes(repositoryRoot: string, appName: string): string[] {
  const appDirectory = path.join(repositoryRoot, 'apps', appName.replace(/^@mission-platform\//, ''));
  const normalizedAppName = appName.replace(/^@mission-platform\//, '');
  const routes = discoverAppRouteFiles(appDirectory).flatMap((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    return routeLiterals(source).flatMap((route) => expandRoutePattern(route, normalizedAppName, appDirectory));
  });
  return [...new Set(routes.length > 0 ? routes : ['/'])].sort();
}
