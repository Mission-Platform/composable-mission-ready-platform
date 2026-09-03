import type { DocumentationLocale } from './i18n.ts';

/** Workspace roots whose package documentation is published by docs-app. */
export const DOCUMENTATION_WORKSPACE_FAMILIES = ['packages', 'extensions'] as const;

export interface DocumentationSourceRoot {
  readonly kind: 'project' | 'package';
  /** Absolute filesystem directory in Node, or the Vite module-root path at runtime. */
  readonly rootDirectory: string;
  /** Stable URL namespace. The project root uses an empty prefix. */
  readonly routePrefix: string;
  /** Workspace-relative package directory, used for cross-root link resolution. */
  readonly workspaceDirectory: string;
  readonly packageName?: string;
}

export interface ParsedDocumentationModule {
  readonly sourceRoot: DocumentationSourceRoot;
  readonly locale: DocumentationLocale;
  readonly documentPath: string;
}

const moduleRoot = '../../../';
const supportedLocalePattern = /^(ar|de|es|fr|he|it|ja|ko|nl|zh)$/u;

function normalize(value: string): string {
  return value.replaceAll('\\', '/');
}

function packageNameFallback(workspaceDirectory: string): string {
  return `@mission-platform/${workspaceDirectory.split('/').pop() ?? workspaceDirectory}`;
}

/** Build the project documentation root used by both Vite and Node inventories. */
export function projectDocumentationSourceRoot(rootDirectory: string): DocumentationSourceRoot {
  return { kind: 'project', rootDirectory, routePrefix: '', workspaceDirectory: '' };
}

/** Build a package documentation root with its stable workspace-qualified URL namespace. */
export function packageDocumentationSourceRoot(
  workspaceDirectory: string,
  rootDirectory: string,
  packageName?: string,
): DocumentationSourceRoot {
  return {
    kind: 'package',
    rootDirectory,
    routePrefix: workspaceDirectory,
    workspaceDirectory,
    packageName: packageName ?? packageNameFallback(workspaceDirectory),
  };
}

/** Parse a repository-relative Markdown module path into its owning workspace and document path. */
export function parseWorkspaceDocumentationPath(
  relativePath: string,
): { readonly workspaceDirectory: string; readonly documentPath: string } | undefined {
  const normalized = normalize(relativePath);
  if (normalized.startsWith('docs/')) {
    return { workspaceDirectory: '', documentPath: normalized.slice('docs/'.length) };
  }

  const familyPattern = DOCUMENTATION_WORKSPACE_FAMILIES.join('|');
  const match = normalized.match(new RegExp(`^((?:${familyPattern})/.+?)/docs/(.*)$`, 'u'));
  if (!match) return undefined;
  return { workspaceDirectory: match[1], documentPath: match[2] };
}

/** Parse a Vite Markdown module path into the same ownership model used by Node tooling. */
export function parseDocumentationModulePath(
  modulePath: string,
  packageName?: string,
): ParsedDocumentationModule | undefined {
  const normalized = normalize(modulePath);
  if (!normalized.startsWith(moduleRoot)) return undefined;
  const relative = normalized.slice(moduleRoot.length);

  const location = parseWorkspaceDocumentationPath(relative);
  if (location === undefined) return undefined;
  const { workspaceDirectory } = location;
  let rootDirectory = `${moduleRoot}docs`;
  let documentPath = location.documentPath;
  if (workspaceDirectory) {
    rootDirectory = `${moduleRoot}${workspaceDirectory}/docs`;
  }

  let locale: DocumentationLocale = 'en';
  const localeMatch = documentPath.match(/^locales\/([^/]+)\/(.*)$/u);
  if (localeMatch) {
    if (!supportedLocalePattern.test(localeMatch[1])) return undefined;
    locale = localeMatch[1] as DocumentationLocale;
    documentPath = localeMatch[2];
  }
  if (!documentPath.endsWith('.md')) return undefined;

  const sourceRoot = workspaceDirectory
    ? packageDocumentationSourceRoot(workspaceDirectory, rootDirectory, packageName)
    : projectDocumentationSourceRoot(rootDirectory);
  return { sourceRoot, locale, documentPath: documentPath.replace(/\.md$/u, '') };
}

/** Prefix a document path with its stable package namespace. */
export function qualifiedSlug(sourceRoot: DocumentationSourceRoot, documentPath: string): string {
  return sourceRoot.routePrefix ? `${sourceRoot.routePrefix}/${documentPath}` : documentPath;
}

/** Return the URL namespace for a package's docs directory. */
export function docsDirectoryForRoot(sourceRoot: DocumentationSourceRoot): string {
  return sourceRoot.workspaceDirectory ? `${sourceRoot.workspaceDirectory}/docs` : 'docs';
}
