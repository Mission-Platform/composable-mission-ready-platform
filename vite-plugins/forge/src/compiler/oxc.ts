import { parseSync } from 'oxc-parser';

import type { ForgeExportFact, ForgeImportFact, ForgeModuleFacts, ForgeSourceSpan } from './ast.js';
import type { SourceBackedExpression, SourceSpan } from '@mission-platform/forge-plugin-api';

/** The serializable subset of an Oxc node used by the neutral frontend. */
export interface OxcNode {
  readonly type: string;
  readonly start: number;
  readonly end: number;
  readonly [key: string]: unknown;
}

export interface OxcParseError {
  readonly message: string;
  readonly start: number;
  readonly end: number;
}

export interface OxcParsedModule {
  readonly fileName: string;
  readonly source: string;
  readonly program: OxcNode;
  readonly facts: ForgeModuleFacts;
  readonly errors: readonly OxcParseError[];
}

export type OxcParentMap = ReadonlyMap<OxcNode, OxcNode>;

function languageFor(fileName: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  switch (fileName.toLowerCase().slice(fileName.lastIndexOf('.'))) {
    case '.js':
    case '.mjs':
    case '.cjs': {
      return 'js';
    }
    case '.jsx': {
      return 'jsx';
    }
    case '.ts':
    case '.mts':
    case '.cts':
    case '.d.ts':
    case '.d.mts':
    case '.d.cts': {
      return 'ts';
    }
    default: {
      return 'tsx';
    }
  }
}

export function isOxcNode(value: unknown): value is OxcNode {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

export function oxcObject(node: OxcNode, key: string): OxcNode | undefined {
  const value = node[key];
  return isOxcNode(value) ? value : undefined;
}

export function oxcArray(node: OxcNode, key: string): OxcNode[] {
  const value = node[key];
  return Array.isArray(value) ? value.filter(isOxcNode) : [];
}

export function oxcString(node: OxcNode | undefined, key: 'name' | 'value' | 'directive' = 'name'): string | undefined {
  if (node === undefined) return undefined;
  const value = node[key];
  return typeof value === 'string' ? value : undefined;
}

export function oxcLiteralValue(node: OxcNode | undefined): unknown {
  return node === undefined ? undefined : node.value;
}

export function oxcNodeText(source: string, node: OxcNode | undefined): string {
  return node === undefined ? '' : source.slice(node.start, node.end);
}

export function oxcSourceSpan(source: string, node: OxcNode): SourceSpan {
  const start = Math.max(0, Math.min(node.start, source.length));
  const end = Math.max(start, Math.min(node.end, source.length));
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  return {
    start,
    end,
    line: source.slice(0, start).split('\n').length,
    column: start - lineStart + 1,
  };
}

export function oxcSourceExpression(
  source: string,
  node: OxcNode,
  syntax: SourceBackedExpression['syntax'] = 'expression',
): SourceBackedExpression {
  return {
    kind: 'source-backed-expression',
    syntax,
    text: oxcNodeText(source, node),
    span: oxcSourceSpan(source, node),
  };
}

/** Depth-first child walk over enumerable node-valued properties. */
export function oxcChildren(node: OxcNode): OxcNode[] {
  const children: OxcNode[] = [];
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'range' || key === 'loc') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isOxcNode(entry)) children.push(entry);
      }
    } else if (isOxcNode(value)) {
      children.push(value);
    }
  }
  return children;
}

export function visitOxc(node: OxcNode, visitor: (node: OxcNode) => void | boolean): void {
  if (visitor(node) === false) return;
  for (const child of oxcChildren(node)) {
    visitOxc(child, visitor);
  }
}

export function buildOxcParentMap(root: OxcNode): Map<OxcNode, OxcNode> {
  const parents = new Map<OxcNode, OxcNode>();
  const visit = (node: OxcNode): void => {
    for (const child of oxcChildren(node)) {
      parents.set(child, node);
      visit(child);
    }
  };
  visit(root);
  return parents;
}

export function oxcProgramBody(program: OxcNode): OxcNode[] {
  return oxcArray(program, 'body');
}

/** Unwrap `export …` wrappers so callers see the underlying declaration. */
export function oxcUnwrapModuleStatement(statement: OxcNode): {
  readonly node: OxcNode;
  readonly exported: boolean;
  readonly exportStatement: OxcNode | undefined;
} {
  if (statement.type === 'ExportNamedDeclaration') {
    const declaration = oxcObject(statement, 'declaration');
    if (declaration !== undefined) {
      return { node: declaration, exported: true, exportStatement: statement };
    }
  }
  if (statement.type === 'ExportDefaultDeclaration') {
    const declaration = oxcObject(statement, 'declaration');
    if (declaration !== undefined) {
      return { node: declaration, exported: true, exportStatement: statement };
    }
  }
  return { node: statement, exported: false, exportStatement: undefined };
}

export function oxcIdentifierName(node: OxcNode | undefined): string | undefined {
  if (node === undefined) return undefined;
  if (node.type === 'Identifier' || node.type === 'JSXIdentifier') {
    return oxcString(node, 'name');
  }
  return undefined;
}

/** True when the node is a JSX element, self-closing element, or fragment. */
export function isOxcJsxRoot(node: OxcNode): boolean {
  return node.type === 'JSXElement' || node.type === 'JSXFragment' || node.type === 'JSXSelfClosingElement';
}

export function oxcTypeNode(node: OxcNode | undefined): OxcNode | undefined {
  if (node === undefined) return undefined;
  if (node.type === 'TSTypeAnnotation') {
    return oxcObject(node, 'typeAnnotation');
  }
  return node;
}

function forgeSourceSpan(source: string, node: OxcNode): ForgeSourceSpan {
  return oxcSourceSpan(source, node) as ForgeSourceSpan;
}

function importFacts(source: string, statement: OxcNode): ForgeImportFact {
  const valueNames: string[] = [];
  const typeNames: string[] = [];
  for (const specifier of oxcArray(statement, 'specifiers')) {
    const local = oxcIdentifierName(oxcObject(specifier, 'local')) ?? '';
    const typeOnly = specifier.importKind === 'type' || statement.importKind === 'type';
    (typeOnly ? typeNames : valueNames).push(local);
  }
  const sourceNode = oxcObject(statement, 'source');
  return {
    specifier: typeof oxcLiteralValue(sourceNode) === 'string' ? (oxcLiteralValue(sourceNode) as string) : '',
    valueNames,
    typeNames,
    sideEffectOnly: oxcArray(statement, 'specifiers').length === 0,
    span: forgeSourceSpan(source, statement),
  };
}

function declarationExportFacts(source: string, statement: OxcNode): ForgeExportFact[] {
  const declaration = oxcObject(statement, 'declaration');
  if (statement.type === 'ExportDefaultDeclaration') {
    const localName = oxcIdentifierName(oxcObject(declaration ?? statement, 'id'));
    return [
      {
        exportedName: 'default',
        localName,
        specifier: undefined,
        typeOnly: false,
        star: false,
        span: forgeSourceSpan(source, statement),
      },
    ];
  }
  if (declaration === undefined) return [];
  if (declaration.type === 'VariableDeclaration') {
    return oxcArray(declaration, 'declarations').flatMap((entry) => {
      const binding = oxcIdentifierName(oxcObject(entry, 'id'));
      return binding === undefined
        ? []
        : [
            {
              exportedName: binding,
              localName: binding,
              specifier: undefined,
              typeOnly: false,
              star: false,
              span: forgeSourceSpan(source, entry),
            },
          ];
    });
  }
  const name = oxcIdentifierName(oxcObject(declaration, 'id'));
  if (name === undefined) return [];
  const typeOnly = declaration.type === 'TSInterfaceDeclaration' || declaration.type === 'TSTypeAliasDeclaration';
  return [
    {
      exportedName: name,
      localName: name,
      specifier: undefined,
      typeOnly,
      star: false,
      span: forgeSourceSpan(source, statement),
    },
  ];
}

function exportFacts(source: string, statement: OxcNode): ForgeExportFact[] {
  if (statement.type === 'ExportAllDeclaration') {
    return [
      {
        exportedName: oxcIdentifierName(oxcObject(statement, 'exported')),
        localName: undefined,
        specifier:
          typeof oxcLiteralValue(oxcObject(statement, 'source')) === 'string'
            ? (oxcLiteralValue(oxcObject(statement, 'source')) as string)
            : undefined,
        typeOnly: statement.exportKind === 'type',
        star: true,
        span: forgeSourceSpan(source, statement),
      },
    ];
  }
  if (statement.type === 'ExportDefaultDeclaration') {
    return declarationExportFacts(source, statement);
  }
  if (statement.type !== 'ExportNamedDeclaration') return [];
  const sourceNode = oxcObject(statement, 'source');
  const specifier =
    typeof oxcLiteralValue(sourceNode) === 'string' ? (oxcLiteralValue(sourceNode) as string) : undefined;
  const declaration = oxcObject(statement, 'declaration');
  if (declaration !== undefined) return declarationExportFacts(source, statement);
  return oxcArray(statement, 'specifiers').map((entry) => ({
    exportedName: oxcIdentifierName(oxcObject(entry, 'exported')),
    localName: oxcIdentifierName(oxcObject(entry, 'local')),
    specifier,
    typeOnly: entry.exportKind === 'type' || statement.exportKind === 'type',
    star: false,
    span: forgeSourceSpan(source, entry),
  }));
}

function hasJsx(program: OxcNode): boolean {
  let found = false;
  visitOxc(program, (node) => {
    if (found) return false;
    if (isOxcJsxRoot(node)) {
      found = true;
      return false;
    }
  });
  return found;
}

function frameworkDirective(program: OxcNode): 'react' | 'vue' | undefined {
  for (const statement of oxcProgramBody(program)) {
    if (statement.type !== 'ExpressionStatement' || typeof statement.directive !== 'string') break;
    if (statement.directive === 'use react') return 'react';
    if (statement.directive === 'use vue') return 'vue';
  }
  return undefined;
}

/** Drop leading `"use react"` / `"use vue"` prologue directives from a parsed module. */
export function stripOxcFrameworkDirective(module: OxcParsedModule): OxcParsedModule {
  const body = oxcProgramBody(module.program);
  const nextBody: OxcNode[] = [];
  let inPrologue = true;
  let removed = false;
  for (const statement of body) {
    if (inPrologue && statement.type === 'ExpressionStatement' && typeof statement.directive === 'string') {
      if (statement.directive === 'use react' || statement.directive === 'use vue') {
        removed = true;
        continue;
      }
      nextBody.push(statement);
      continue;
    }
    inPrologue = false;
    nextBody.push(statement);
  }
  if (!removed) {
    return module;
  }
  const program = { ...module.program, body: nextBody } as OxcNode;
  return {
    ...module,
    program,
    facts: {
      imports: module.facts.imports,
      exports: module.facts.exports,
      frameworkDirective: undefined,
      hasJsx: hasJsx(program),
    },
  };
}

export function parseOxcModule(fileName: string, source: string): OxcParsedModule {
  const result = parseSync(fileName, source, { lang: languageFor(fileName), sourceType: 'module', astType: 'ts' });
  const program = result.program as unknown as OxcNode;
  const imports = oxcProgramBody(program)
    .filter((statement) => statement.type === 'ImportDeclaration')
    .map((statement) => importFacts(source, statement));
  const exports = oxcProgramBody(program).flatMap((statement) => exportFacts(source, statement));
  const errors = result.errors.map((error) => {
    const label = error.labels[0];
    return { message: error.message, start: label?.start ?? 0, end: label?.end ?? label?.start ?? 0 };
  });
  return {
    fileName,
    source,
    program,
    facts: { imports, exports, frameworkDirective: frameworkDirective(program), hasJsx: hasJsx(program) },
    errors,
  };
}
