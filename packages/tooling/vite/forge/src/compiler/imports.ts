import path from 'node:path';

import { NEUTRAL_MODULE } from './constants.js';
import {
  oxcArray,
  oxcIdentifierName,
  oxcLiteralValue,
  oxcObject,
  oxcProgramBody,
  parseOxcModule,
  type OxcNode,
  visitOxc,
} from './oxc.js';

/** The names a module imports from the neutral package, split by binding kind. */
export interface NeutralImports {
  values: string[];
  types: string[];
}

/** Inspect a module's neutral package imports. */
export function readNeutralImports(fileName: string, source: string): NeutralImports {
  const values: string[] = [];
  const types: string[] = [];
  for (const entry of parseOxcModule(fileName, source).facts.imports) {
    if (entry.specifier !== NEUTRAL_MODULE) continue;
    values.push(...entry.valueNames);
    types.push(...entry.typeNames);
  }
  return { values, types };
}

/** Resolve a workspace-local `@/` import relative to its source file. */
export function resolveWorkspaceLocalImport(
  specifier: string,
  sourceFileName: string,
  sourceRoot: string | undefined,
): string | undefined {
  if (sourceRoot === undefined || !specifier.startsWith('@/')) return undefined;

  const absoluteSource = path.resolve(sourceFileName);
  const absoluteRoot = path.resolve(sourceRoot);
  const sourceRelativeToRoot = path.relative(absoluteRoot, absoluteSource);
  if (sourceRelativeToRoot.startsWith('..') || path.isAbsolute(sourceRelativeToRoot)) return undefined;

  const target = path.resolve(absoluteRoot, specifier.slice(2));
  const relative = path.relative(path.dirname(absoluteSource), target).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/** A stylesheet import carried into the flat generated tree. */
export interface StyleImport {
  name: string | undefined;
  specifier: string;
  flatSpecifier: string;
  base: string;
}

const STYLE_EXTENSIONS = /\.(css|scss|sass|less|styl)$/;

/** Collect relative stylesheet imports from a neutral module. */
export function readStyleImports(fileName: string, source: string, sourceRoot?: string): StyleImport[] {
  const imports: StyleImport[] = [];
  const parsed = parseOxcModule(fileName, source);
  for (const statement of oxcProgramBody(parsed.program)) {
    if (statement.type !== 'ImportDeclaration') continue;
    const authoredSpecifier = oxcLiteralValue(oxcObject(statement, 'source'));
    if (typeof authoredSpecifier !== 'string' || !STYLE_EXTENSIONS.test(authoredSpecifier)) continue;

    const specifier = authoredSpecifier.startsWith('.')
      ? authoredSpecifier
      : resolveWorkspaceLocalImport(authoredSpecifier, fileName, sourceRoot);
    if (specifier === undefined) continue;

    const base =
      specifier.split('/').findLast((segment) => segment !== '.' && segment !== '..' && segment.length > 0) ?? specifier;
    const defaultName = oxcArray(statement, 'specifiers').find(
      (specifierNode) => specifierNode.type === 'ImportDefaultSpecifier',
    );
    const name = oxcIdentifierName(defaultName === undefined ? undefined : oxcObject(defaultName, 'local'));
    imports.push({ name, specifier, flatSpecifier: `./${base}`, base });
  }
  return imports;
}

/** Collect bare package imports carried verbatim into generated framework sources. */
export function readExternalImports(fileName: string, source: string): string[] {
  const imports: string[] = [];
  const parsed = parseOxcModule(fileName, source);
  let needsI18nImport = usesI18nextT(parsed.program);

  for (const statement of oxcProgramBody(parsed.program)) {
    if (statement.type !== 'ImportDeclaration') continue;
    const specifier = oxcLiteralValue(oxcObject(statement, 'source'));
    if (typeof specifier !== 'string') continue;
    if (specifier.startsWith('.') || specifier === NEUTRAL_MODULE || STYLE_EXTENSIONS.test(specifier)) continue;
    if (specifier === 'i18next') {
      imports.push(source.slice(statement.start, statement.end));
      needsI18nImport = true;
      continue;
    }
    imports.push(source.slice(statement.start, statement.end));
  }

  if (needsI18nImport) {
    const i18nModule = '@mission-platform/i18n';
    if (!imports.some((imp) => imp.includes(i18nModule))) {
      imports.push(`import { useI18n } from '${i18nModule}';`);
    }
  }
  return imports;
}

/** Whether an Oxc module or node calls `i18next.t(...)`. */
export function usesI18nextT(node: OxcNode): boolean {
  let found = false;
  visitOxc(node, (child) => {
    if (found) return false;
    if (child.type !== 'CallExpression') return;
    const callee = oxcObject(child, 'callee');
    if (callee?.type !== 'MemberExpression') return;
    if (oxcIdentifierName(oxcObject(callee, 'object')) !== 'i18next') return;
    if (oxcIdentifierName(oxcObject(callee, 'property')) !== 't') return;
    found = true;
    return false;
  });
  return found;
}