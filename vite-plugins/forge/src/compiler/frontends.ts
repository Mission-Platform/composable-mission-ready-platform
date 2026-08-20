import { createCompilerDiagnostic } from '@mission-platform/forge-plugin-api';

import {
  buildOxcParentMap,
  isOxcJsxRoot,
  isOxcNode,
  oxcArray,
  oxcIdentifierName,
  oxcLiteralValue,
  oxcNodeText,
  oxcObject,
  oxcProgramBody,
  oxcSourceExpression,
  oxcSourceSpan,
  oxcTypeNode,
  oxcUnwrapModuleStatement,
  parseOxcModule,
  stripOxcFrameworkDirective,
  visitOxc,
  type OxcNode,
  type OxcParentMap,
  type OxcParsedModule,
} from './oxc.js';

import type {
  CompilerDiagnostic,
  GenericAstNode,
  GenericAttribute,
  GenericAttributeValue,
  GenericBindingKind,
  GenericComponent,
  GenericImport,
  GenericModuleAst,
  GenericParameter,
  GenericRenderChild,
  GenericRenderNode,
  GenericStatement,
  GenericStatementKind,
  GenericTagKind,
  SourceBackedExpression,
} from '@mission-platform/forge-plugin-api';

/** Source kinds supported by the Forge frontend. */
export type ForgeSourceKind = 'js' | 'jsx' | 'ts' | 'tsx';

/** Return the TypeScript-compatible script-kind value for legacy compiler callers. */
export function scriptKindForFileName(fileName: string): number {
  switch (fileName.toLowerCase().split('.').pop()) {
    case 'jsx': {
      return 2;
    }
    case 'ts': {
      return 3;
    }
    case 'tsx': {
      return 4;
    }
    case 'js':
    case 'mjs':
    case 'cjs': {
      return 1;
    }
    default: {
      return 0;
    }
  }
}

/**
 * Parse Forge source through Oxc into the serializable module the neutral
 * frontend, optimizer, and inference all consume. No TypeScript SourceFile is
 * created; the returned module is the single parser-backed representation.
 */
export function parseForgeSource(fileName: string, source: string): OxcParsedModule {
  return parseOxcModule(fileName, source);
}

/** Parse and remove only the Forge framework directive from a source module. */
export function parseForgeModule(fileName: string, source: string): OxcParsedModule {
  return stripOxcFrameworkDirective(parseOxcModule(fileName, source));
}

function tagKindFor(tag: string | SourceBackedExpression): GenericTagKind {
  if (typeof tag !== 'string') {
    return 'dynamic';
  }
  if (tag === 'Fragment') {
    return 'fragment';
  }
  return /^[a-z]/.test(tag) ? 'element' : 'component';
}

function jsxTagName(source: string, name: OxcNode | undefined): string | SourceBackedExpression {
  if (name === undefined) {
    return oxcSourceExpression(
      source,
      { type: 'Identifier', start: 0, end: 0, name: 'Fragment' } as OxcNode,
      'expression',
    );
  }
  const identifier = oxcIdentifierName(name);
  if (identifier !== undefined) {
    return identifier;
  }
  if (name.type === 'JSXMemberExpression') {
    return oxcSourceExpression(source, name, 'expression');
  }
  if (name.type === 'JSXNamespacedName') {
    return oxcNodeText(source, name);
  }
  return oxcSourceExpression(source, name, 'expression');
}

function nestedRenderNodes(source: string, node: OxcNode): GenericRenderNode[] {
  const roots: GenericRenderNode[] = [];
  const visit = (current: OxcNode): void => {
    if (isOxcJsxRoot(current)) {
      roots.push(renderNode(source, current));
      return;
    }
    for (const key of Object.keys(current)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'range' || key === 'loc') continue;
      const value = current[key];
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (isOxcNode(entry)) visit(entry);
        }
      } else if (isOxcNode(value)) {
        visit(value);
      }
    }
  };
  // Scan children only so callers can pass non-JSX expressions without double-wrapping.
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'range' || key === 'loc') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isOxcNode(entry)) visit(entry);
      }
    } else if (isOxcNode(value)) {
      visit(value);
    }
  }
  return roots;
}

function returnedRenderNode(source: string, expression: OxcNode): GenericRenderNode | undefined {
  let current = expression;
  while (current.type === 'ParenthesizedExpression') {
    const inner = oxcObject(current, 'expression');
    if (inner === undefined) break;
    current = inner;
  }
  if (isOxcJsxRoot(current)) {
    return renderNode(source, current);
  }
  const nested = nestedRenderNodes(source, current);
  if (nested.length === 0) {
    return undefined;
  }
  const sourceExpression = oxcSourceExpression(source, current, 'expression');
  return {
    kind: 'render-node',
    tag: 'Fragment',
    tagKind: 'fragment',
    selfClosing: false,
    attributes: [],
    children: [
      {
        kind: 'expression-node',
        expression: sourceExpression,
        nested,
        span: sourceExpression.span,
      },
    ],
    expression: sourceExpression,
    span: sourceExpression.span,
  };
}

function attributeValue(source: string, initializer: OxcNode | undefined | null): GenericAttributeValue | undefined {
  if (initializer === undefined || initializer === null) {
    return undefined;
  }
  if (initializer.type === 'Literal' && typeof initializer.value === 'string') {
    return { kind: 'string', value: initializer.value, span: oxcSourceSpan(source, initializer) };
  }
  if (initializer.type === 'JSXExpressionContainer') {
    const inner = oxcObject(initializer, 'expression');
    // Empty `{}` may surface as JSXEmptyExpression.
    if (inner === undefined || inner.type === 'JSXEmptyExpression') {
      return { kind: 'expression', nested: [], span: oxcSourceSpan(source, initializer) };
    }
    return {
      kind: 'expression',
      expression: oxcSourceExpression(source, inner, 'expression'),
      nested: isOxcJsxRoot(inner) ? [renderNode(source, inner)] : nestedRenderNodes(source, inner),
      span: oxcSourceSpan(source, initializer),
    };
  }
  if (isOxcJsxRoot(initializer)) {
    return {
      kind: 'expression',
      expression: oxcSourceExpression(source, initializer, 'expression'),
      nested: [renderNode(source, initializer)],
      span: oxcSourceSpan(source, initializer),
    };
  }
  return {
    kind: 'expression',
    expression: oxcSourceExpression(source, initializer, 'expression'),
    nested: nestedRenderNodes(source, initializer),
    span: oxcSourceSpan(source, initializer),
  };
}

function jsxAttributes(source: string, attributes: readonly OxcNode[]): GenericAttribute[] {
  return attributes.map((property): GenericAttribute => {
    if (property.type === 'JSXSpreadAttribute') {
      const argument = oxcObject(property, 'argument') ?? property;
      return {
        kind: 'jsx-spread-attribute',
        expression: oxcSourceExpression(source, argument, 'expression'),
        span: oxcSourceSpan(source, property),
      };
    }
    const nameNode = oxcObject(property, 'name');
    const name =
      oxcIdentifierName(nameNode) ??
      (nameNode !== undefined ? oxcNodeText(source, nameNode) : oxcNodeText(source, property));
    return {
      kind: 'jsx-attribute',
      name,
      value: attributeValue(source, oxcObject(property, 'value') ?? (property.value as OxcNode | null | undefined)),
      span: oxcSourceSpan(source, property),
    };
  });
}

function renderChildren(source: string, children: readonly OxcNode[]): GenericRenderChild[] {
  const result: GenericRenderChild[] = [];
  for (const child of children) {
    if (isOxcJsxRoot(child)) {
      result.push(renderNode(source, child));
      continue;
    }
    if (child.type === 'JSXText') {
      const text = typeof child.value === 'string' ? child.value : oxcNodeText(source, child);
      if (text.trim().length === 0) {
        continue;
      }
      result.push({ kind: 'text', text, span: oxcSourceSpan(source, child) });
      continue;
    }
    if (child.type === 'JSXExpressionContainer') {
      const inner = oxcObject(child, 'expression');
      if (inner === undefined || inner.type === 'JSXEmptyExpression') {
        result.push({
          kind: 'expression-node',
          expression: undefined,
          nested: [],
          span: oxcSourceSpan(source, child),
        });
        continue;
      }
      result.push({
        kind: 'expression-node',
        expression: oxcSourceExpression(source, inner, 'expression'),
        nested: isOxcJsxRoot(inner) ? [renderNode(source, inner)] : nestedRenderNodes(source, inner),
        span: oxcSourceSpan(source, child),
      });
      continue;
    }
    if (child.type === 'JSXSpreadChild') {
      const expression = oxcObject(child, 'expression');
      result.push({
        kind: 'expression-node',
        expression: expression === undefined ? undefined : oxcSourceExpression(source, expression, 'expression'),
        nested: expression === undefined ? [] : nestedRenderNodes(source, expression),
        span: oxcSourceSpan(source, child),
      });
    }
  }
  return result;
}

function renderNode(source: string, node: OxcNode): GenericRenderNode {
  if (node.type === 'JSXElement') {
    const opening = oxcObject(node, 'openingElement') ?? node;
    const tag = jsxTagName(source, oxcObject(opening, 'name'));
    return {
      kind: 'render-node',
      tag,
      tagKind: tagKindFor(tag),
      selfClosing: opening.selfClosing === true,
      attributes: jsxAttributes(source, oxcArray(opening, 'attributes')),
      children: renderChildren(source, oxcArray(node, 'children')),
      expression: oxcSourceExpression(source, node, 'expression'),
      span: oxcSourceSpan(source, node),
    };
  }
  return {
    kind: 'render-node',
    tag: 'Fragment',
    tagKind: 'fragment',
    selfClosing: false,
    attributes: [],
    children: renderChildren(source, oxcArray(node, 'children')),
    expression: oxcSourceExpression(source, node, 'expression'),
    span: oxcSourceSpan(source, node),
  };
}

function collectRenderNodes(source: string, program: OxcNode, parents: OxcParentMap): GenericRenderNode[] {
  const roots: GenericRenderNode[] = [];
  visitOxc(program, (node) => {
    if (!isOxcJsxRoot(node)) {
      return;
    }
    const parent = parents.get(node);
    // Skip JSX nested under another element/fragment; those are modeled as children.
    if (parent !== undefined && (parent.type === 'JSXElement' || parent.type === 'JSXFragment')) {
      return false;
    }
    roots.push(renderNode(source, node));
    return false;
  });
  return roots;
}

function statementKindOf(node: OxcNode): GenericStatementKind {
  switch (node.type) {
    case 'ImportDeclaration': {
      return 'import';
    }
    case 'TSInterfaceDeclaration': {
      return 'interface';
    }
    case 'TSTypeAliasDeclaration': {
      return 'type-alias';
    }
    case 'TSEnumDeclaration': {
      return 'enum';
    }
    case 'VariableDeclaration': {
      return 'variable';
    }
    case 'FunctionDeclaration': {
      return 'function';
    }
    case 'ClassDeclaration': {
      return 'class';
    }
    case 'ExportNamedDeclaration':
    case 'ExportDefaultDeclaration':
    case 'ExportAllDeclaration': {
      return 'export';
    }
    case 'ReturnStatement': {
      return 'return';
    }
    case 'ExpressionStatement': {
      return 'expression';
    }
    default: {
      return 'other';
    }
  }
}

function statementName(source: string, node: OxcNode): string | undefined {
  if (
    node.type === 'TSInterfaceDeclaration' ||
    node.type === 'TSTypeAliasDeclaration' ||
    node.type === 'TSEnumDeclaration' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'ClassDeclaration'
  ) {
    return oxcIdentifierName(oxcObject(node, 'id'));
  }
  if (node.type === 'VariableDeclaration') {
    const [declaration] = oxcArray(node, 'declarations');
    if (declaration === undefined) return undefined;
    const id = oxcObject(declaration, 'id');
    return oxcIdentifierName(id) ?? (id === undefined ? undefined : oxcNodeText(source, id));
  }
  return undefined;
}

function bindingNames(source: string, name: OxcNode | undefined): string[] {
  if (name === undefined) return [];
  if (name.type === 'Identifier') {
    const text = oxcIdentifierName(name);
    return text === undefined ? [] : [text];
  }
  if (name.type === 'ObjectPattern') {
    return oxcArray(name, 'properties').flatMap((property) => {
      if (property.type === 'RestElement') {
        return bindingNames(source, oxcObject(property, 'argument'));
      }
      if (property.type === 'Property') {
        return bindingNames(source, oxcObject(property, 'value') ?? oxcObject(property, 'key'));
      }
      return [];
    });
  }
  if (name.type === 'ArrayPattern') {
    return oxcArray(name, 'elements').flatMap((element) => {
      if (element.type === 'RestElement') {
        return bindingNames(source, oxcObject(element, 'argument'));
      }
      return bindingNames(source, element);
    });
  }
  if (name.type === 'AssignmentPattern') {
    return bindingNames(source, oxcObject(name, 'left'));
  }
  return [];
}

function genericParameter(source: string, parameter: OxcNode): GenericParameter {
  // Oxc function params are patterns (Identifier / ObjectPattern / …).
  const pattern =
    parameter.type === 'Identifier' ||
    parameter.type === 'ObjectPattern' ||
    parameter.type === 'ArrayPattern' ||
    parameter.type === 'AssignmentPattern' ||
    parameter.type === 'RestElement'
      ? parameter
      : (oxcObject(parameter, 'name') ?? parameter);

  const bindingNode = pattern.type === 'AssignmentPattern' ? (oxcObject(pattern, 'left') ?? pattern) : pattern;
  const bindingTarget =
    bindingNode.type === 'RestElement' ? (oxcObject(bindingNode, 'argument') ?? bindingNode) : bindingNode;
  const binding = bindingKindFor(bindingTarget);
  const typeAnnotation = oxcTypeNode(oxcObject(parameter, 'typeAnnotation'));
  // Oxc Identifier spans include the type annotation; emit the binding name only.
  const text =
    bindingNode.type === 'Identifier'
      ? (oxcIdentifierName(bindingNode) ?? oxcNodeText(source, bindingNode))
      : oxcNodeText(source, pattern);
  return {
    kind: 'parameter',
    text,
    binding,
    names: bindingNames(source, bindingNode),
    type: typeAnnotation === undefined ? undefined : oxcSourceExpression(source, typeAnnotation, 'type'),
    span: oxcSourceSpan(source, parameter),
  };
}

function bindingKindFor(node: OxcNode): GenericBindingKind {
  switch (node.type) {
    case 'ObjectPattern': {
      return 'object-pattern';
    }
    case 'ArrayPattern': {
      return 'array-pattern';
    }
    default: {
      return 'identifier';
    }
  }
}

function genericImport(source: string, statement: OxcNode): GenericImport {
  const valueNames: string[] = [];
  const typeNames: string[] = [];
  let defaultName: string | undefined;
  let namespaceName: string | undefined;
  const statementTypeOnly = statement.importKind === 'type';
  for (const specifier of oxcArray(statement, 'specifiers')) {
    const local = oxcIdentifierName(oxcObject(specifier, 'local')) ?? '';
    const typeOnly = statementTypeOnly || specifier.importKind === 'type';
    if (specifier.type === 'ImportDefaultSpecifier') {
      defaultName = local;
      (typeOnly ? typeNames : valueNames).push(local);
      continue;
    }
    if (specifier.type === 'ImportNamespaceSpecifier') {
      namespaceName = local;
      (typeOnly ? typeNames : valueNames).push(local);
      continue;
    }
    (typeOnly ? typeNames : valueNames).push(local);
  }
  const sourceNode = oxcObject(statement, 'source');
  const moduleSpecifier =
    typeof oxcLiteralValue(sourceNode) === 'string' ? (oxcLiteralValue(sourceNode) as string) : '';
  return {
    kind: 'import',
    source: moduleSpecifier,
    valueNames,
    typeNames,
    defaultName,
    namespaceName,
    typeOnly: statementTypeOnly,
    sideEffectOnly: oxcArray(statement, 'specifiers').length === 0,
    text: oxcNodeText(source, statement),
    span: oxcSourceSpan(source, statement),
  };
}

function genericStatement(source: string, statement: OxcNode, exported: boolean): GenericStatement {
  const { node } = oxcUnwrapModuleStatement(statement);
  const effective =
    statement.type.startsWith('Export') && oxcObject(statement, 'declaration') === undefined ? statement : node;
  return {
    kind: 'statement',
    statementKind: statementKindOf(effective),
    name: statementName(source, effective),
    exported: exported || oxcUnwrapModuleStatement(statement).exported,
    text: oxcSourceExpression(source, statement, 'statement'),
    renderNodes: nestedRenderNodes(source, statement),
    span: oxcSourceSpan(source, statement),
  };
}

function functionHasJsx(declaration: OxcNode): boolean {
  let found = false;
  visitOxc(declaration, (node) => {
    if (found) return false;
    if (isOxcJsxRoot(node)) {
      found = true;
      return false;
    }
  });
  return found;
}

function findOxcComponentDeclaration(
  program: OxcNode,
  componentName?: string,
): { readonly statement: OxcNode; readonly declaration: OxcNode; readonly exported: boolean } | undefined {
  const functions: { statement: OxcNode; declaration: OxcNode; exported: boolean }[] = [];
  for (const statement of oxcProgramBody(program)) {
    const unwrapped = oxcUnwrapModuleStatement(statement);
    if (unwrapped.node.type !== 'FunctionDeclaration') continue;
    functions.push({ statement, declaration: unwrapped.node, exported: unwrapped.exported });
  }
  if (componentName !== undefined) {
    return functions.find((entry) => oxcIdentifierName(oxcObject(entry.declaration, 'id')) === componentName);
  }
  return functions.find((entry) => functionHasJsx(entry.declaration));
}

function genericComponent(source: string, declaration: OxcNode, exported: boolean): GenericComponent {
  const body = oxcObject(declaration, 'body');
  const statements = body === undefined ? [] : oxcArray(body, 'body');
  const returnStatement = statements.find((statement) => statement.type === 'ReturnStatement');
  const returned = returnStatement === undefined ? undefined : oxcObject(returnStatement, 'argument');
  let unwrapped = returned;
  while (unwrapped !== undefined && unwrapped.type === 'ParenthesizedExpression') {
    unwrapped = oxcObject(unwrapped, 'expression');
  }
  const [parameter] = oxcArray(declaration, 'params');
  return {
    kind: 'component',
    name: oxcIdentifierName(oxcObject(declaration, 'id')) ?? '',
    exported,
    parameter: parameter === undefined ? undefined : genericParameter(source, parameter),
    body: statements.map((statement) => genericStatement(source, statement, false)),
    returnExpression: unwrapped === undefined ? undefined : oxcSourceExpression(source, unwrapped, 'expression'),
    returnNode: unwrapped === undefined ? undefined : returnedRenderNode(source, unwrapped),
    span: oxcSourceSpan(source, declaration),
  };
}

/** Build a serializable generic AST from an Oxc-parsed module. */
export function createGenericAstFromOxc(
  module: OxcParsedModule,
  moduleKind: 'component' | 'composable',
  componentName?: string,
): GenericModuleAst {
  const source = module.source;
  const parents = buildOxcParentMap(module.program);
  const componentEntry =
    moduleKind === 'component' ? findOxcComponentDeclaration(module.program, componentName) : undefined;
  const imports: GenericImport[] = [];
  const declarations: GenericStatement[] = [];
  const nodes: GenericAstNode[] = [];

  for (const statement of oxcProgramBody(module.program)) {
    if (statement.type === 'ImportDeclaration') {
      const entry = genericImport(source, statement);
      imports.push(entry);
      nodes.push(entry);
      continue;
    }
    const unwrapped = oxcUnwrapModuleStatement(statement);
    const entry = genericStatement(source, statement, unwrapped.exported);
    if (componentEntry === undefined || statement !== componentEntry.statement) {
      declarations.push(entry);
    }
    nodes.push(entry);
  }

  const renderNodes = collectRenderNodes(source, module.program, parents);
  nodes.push(...renderNodes);

  return {
    kind: 'generic-module',
    fileName: module.fileName,
    moduleKind,
    // The Oxc module source is authoritative; optimizer passes edit this source
    // and re-parse, so dead-branch pruning and stable keys are already reflected.
    source,
    imports,
    declarations,
    component:
      componentEntry === undefined
        ? undefined
        : genericComponent(source, componentEntry.declaration, componentEntry.exported),
    renderNodes,
    nodes,
  };
}

/**
 * Build a serializable generic AST from an Oxc-parsed module.
 *
 * The Oxc module is the single authoritative source for imports, JSX,
 * components, and spans; no TypeScript tree is involved.
 */
export function createGenericAst(
  module: OxcParsedModule,
  moduleKind: 'component' | 'composable',
  componentName?: string,
): GenericModuleAst {
  return createGenericAstFromOxc(module, moduleKind, componentName);
}

/** Frontend result shared by inference and future source diagnostics. */
export interface FrontendModule {
  readonly fileName: string;
  readonly oxc: OxcParsedModule;
  readonly ast: GenericModuleAst;
  readonly diagnostics: readonly CompilerDiagnostic[];
}

/** Convert Oxc's structured parser errors into stable Forge diagnostics. */
function parserDiagnostics(fileName: string, parsed: OxcParsedModule): CompilerDiagnostic[] {
  return parsed.errors.map((diagnostic) => {
    const start = diagnostic.start;
    const end = diagnostic.end;
    const line = parsed.source.slice(0, start).split('\n').length;
    const lineStart = parsed.source.lastIndexOf('\n', start - 1) + 1;
    return createCompilerDiagnostic({
      phase: 'frontend',
      severity: 'error',
      code: 'FORGE_FRONTEND_PARSE_ERROR',
      message: `[OXC] ${diagnostic.message}`,
      fileName,
      span: {
        start,
        end,
        line,
        column: start - lineStart + 1,
      },
    });
  });
}

export function parseFrontendModule(
  fileName: string,
  source: string,
  moduleKind: 'component' | 'composable',
  componentName?: string,
): FrontendModule {
  const oxc = parseOxcModule(fileName, source);
  const strippedOxc = stripOxcFrameworkDirective(oxc);
  return {
    fileName,
    oxc: strippedOxc,
    ast: createGenericAstFromOxc(strippedOxc, moduleKind, componentName),
    diagnostics: parserDiagnostics(fileName, oxc),
  };
}
