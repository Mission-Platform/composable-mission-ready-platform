import path from 'node:path';

import { printSourceFile } from '@mission-platform/forge-plugin-api/compiler/ast.js';
import ts from 'typescript';

import { stripFrameworkDirective } from './ast.js';

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
  SourceSpan,
} from '@mission-platform/forge-plugin-api';

/** Source kinds supported by the Forge frontend. */
export type ForgeSourceKind = 'js' | 'jsx' | 'ts' | 'tsx';

/** Map a source extension to the TypeScript parser mode used by the frontend. */
export function scriptKindForFileName(fileName: string): ts.ScriptKind {
  switch (path.extname(fileName).toLowerCase()) {
    case '.js': {
      return ts.ScriptKind.JS;
    }
    case '.jsx': {
      return ts.ScriptKind.JSX;
    }
    case '.ts': {
      return ts.ScriptKind.TS;
    }
    default: {
      return ts.ScriptKind.TSX;
    }
  }
}

/** Parse a component or composable using the source file's extension. */
export function parseForgeSource(fileName: string, source: string): ts.SourceFile {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKindForFileName(fileName));
}

/** Parse and remove only the Forge framework directive from a source module. */
export function parseForgeModule(fileName: string, source: string): ts.SourceFile {
  return stripFrameworkDirective(parseForgeSource(fileName, source));
}

function sourceSpan(sourceFile: ts.SourceFile, node: ts.Node): SourceSpan {
  if (node.pos < 0) {
    // A synthesized node produced by the neutral optimizer has no position in
    // the original buffer; targets rely on its printed text instead.
    return { start: 0, end: 0 };
  }
  const start = node.getStart(sourceFile);
  const end = Math.max(start, node.getEnd());
  const startLine = sourceFile.getLineAndCharacterOfPosition(start);
  return {
    start,
    end,
    line: startLine.line + 1,
    column: startLine.character + 1,
  };
}

const nodePrinter = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

/**
 * The source text of a node. Nodes the neutral optimizer synthesized carry no
 * original position, so they are printed instead of sliced — every generic
 * record therefore always exposes usable text to the target emitters.
 */
function nodeText(sourceFile: ts.SourceFile, node: ts.Node): string {
  if (node.pos >= 0) {
    return node.getText(sourceFile);
  }
  return nodePrinter.printNode(ts.EmitHint.Unspecified, node, sourceFile);
}

function sourceExpression(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  syntax: SourceBackedExpression['syntax'],
): SourceBackedExpression {
  return {
    kind: 'source-backed-expression',
    syntax,
    text: nodeText(sourceFile, node),
    span: sourceSpan(sourceFile, node),
  };
}

function identifierText(sourceFile: ts.SourceFile, node: ts.Node): string {
  return nodeText(sourceFile, node);
}

function importNames(sourceFile: ts.SourceFile, statement: ts.ImportDeclaration): GenericImport {
  const valueNames: string[] = [];
  const typeNames: string[] = [];
  const clause = statement.importClause;
  let defaultName: string | undefined;
  let namespaceName: string | undefined;
  if (clause?.name !== undefined) {
    defaultName = clause.name.text;
    (clause.isTypeOnly ? typeNames : valueNames).push(clause.name.text);
  }
  if (clause?.namedBindings !== undefined) {
    if (ts.isNamespaceImport(clause.namedBindings)) {
      namespaceName = clause.namedBindings.name.text;
      (clause.isTypeOnly ? typeNames : valueNames).push(clause.namedBindings.name.text);
    } else {
      for (const element of clause.namedBindings.elements) {
        const name = element.name.text;
        if (clause.isTypeOnly || element.isTypeOnly) {
          typeNames.push(name);
        } else {
          valueNames.push(name);
        }
      }
    }
  }
  const moduleSpecifier = ts.isStringLiteral(statement.moduleSpecifier)
    ? statement.moduleSpecifier.text
    : statement.moduleSpecifier.pos < 0
      ? ''
      : statement.moduleSpecifier.getText(sourceFile).slice(1, -1);
  return {
    kind: 'import',
    source: moduleSpecifier,
    valueNames,
    typeNames,
    defaultName,
    namespaceName,
    typeOnly: clause?.isTypeOnly === true,
    sideEffectOnly: clause === undefined,
    text: nodeText(sourceFile, statement),
    span: sourceSpan(sourceFile, statement),
  };
}

type JsxRoot = ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment;

function isJsxRoot(node: ts.Node): node is JsxRoot {
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node);
}

function jsxTagName(sourceFile: ts.SourceFile, node: ts.JsxTagNameExpression): string | SourceBackedExpression {
  return ts.isIdentifier(node) ? node.text : sourceExpression(sourceFile, node, 'expression');
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

/** Collect JSX roots nested inside a non-JSX expression (callbacks, conditionals, …). */
function nestedRenderNodes(sourceFile: ts.SourceFile, node: ts.Node): GenericRenderNode[] {
  const roots: GenericRenderNode[] = [];
  const visit = (current: ts.Node): void => {
    if (isJsxRoot(current)) {
      roots.push(renderNode(sourceFile, current));
      return;
    }
    ts.forEachChild(current, visit);
  };
  ts.forEachChild(node, visit);
  return roots;
}

function attributeValue(
  sourceFile: ts.SourceFile,
  initializer: ts.JsxAttributeValue | undefined,
): GenericAttributeValue | undefined {
  if (initializer === undefined) {
    return undefined;
  }
  if (ts.isStringLiteral(initializer)) {
    return { kind: 'string', value: initializer.text, span: sourceSpan(sourceFile, initializer) };
  }
  if (ts.isJsxExpression(initializer)) {
    const inner = initializer.expression;
    if (inner === undefined) {
      return { kind: 'expression', nested: [], span: sourceSpan(sourceFile, initializer) };
    }
    return {
      kind: 'expression',
      expression: sourceExpression(sourceFile, inner, 'expression'),
      nested: isJsxRoot(inner) ? [renderNode(sourceFile, inner)] : nestedRenderNodes(sourceFile, inner),
      span: sourceSpan(sourceFile, initializer),
    };
  }
  return {
    kind: 'expression',
    expression: sourceExpression(sourceFile, initializer, 'expression'),
    nested: isJsxRoot(initializer) ? [renderNode(sourceFile, initializer)] : [],
    span: sourceSpan(sourceFile, initializer),
  };
}

function jsxAttributes(sourceFile: ts.SourceFile, attributes: ts.JsxAttributes): GenericAttribute[] {
  return attributes.properties.map((property): GenericAttribute => {
    if (ts.isJsxSpreadAttribute(property)) {
      return {
        kind: 'jsx-spread-attribute',
        expression: sourceExpression(sourceFile, property.expression, 'expression'),
        span: sourceSpan(sourceFile, property),
      };
    }
    return {
      kind: 'jsx-attribute',
      name: ts.isIdentifier(property.name) ? property.name.text : identifierText(sourceFile, property.name),
      value: attributeValue(sourceFile, property.initializer),
      span: sourceSpan(sourceFile, property),
    };
  });
}

function renderChildren(sourceFile: ts.SourceFile, children: ts.NodeArray<ts.JsxChild>): GenericRenderChild[] {
  const result: GenericRenderChild[] = [];
  for (const child of children) {
    if (isJsxRoot(child)) {
      result.push(renderNode(sourceFile, child));
      continue;
    }
    if (ts.isJsxText(child)) {
      if (child.text.trim().length === 0) {
        continue;
      }
      result.push({ kind: 'text', text: child.text, span: sourceSpan(sourceFile, child) });
      continue;
    }
    if (ts.isJsxExpression(child)) {
      const inner = child.expression;
      result.push({
        kind: 'expression-node',
        expression: inner === undefined ? undefined : sourceExpression(sourceFile, inner, 'expression'),
        nested: inner === undefined ? [] : nestedRenderNodes(sourceFile, inner),
        span: sourceSpan(sourceFile, child),
      });
    }
  }
  return result;
}

function renderNode(sourceFile: ts.SourceFile, node: JsxRoot): GenericRenderNode {
  if (ts.isJsxElement(node)) {
    const tag = jsxTagName(sourceFile, node.openingElement.tagName);
    return {
      kind: 'render-node',
      tag,
      tagKind: tagKindFor(tag),
      selfClosing: false,
      attributes: jsxAttributes(sourceFile, node.openingElement.attributes),
      children: renderChildren(sourceFile, node.children),
      expression: sourceExpression(sourceFile, node, 'expression'),
      span: sourceSpan(sourceFile, node),
    };
  }
  if (ts.isJsxSelfClosingElement(node)) {
    const tag = jsxTagName(sourceFile, node.tagName);
    return {
      kind: 'render-node',
      tag,
      tagKind: tagKindFor(tag),
      selfClosing: true,
      attributes: jsxAttributes(sourceFile, node.attributes),
      children: [],
      expression: sourceExpression(sourceFile, node, 'expression'),
      span: sourceSpan(sourceFile, node),
    };
  }
  return {
    kind: 'render-node',
    tag: 'Fragment',
    tagKind: 'fragment',
    selfClosing: false,
    attributes: [],
    children: renderChildren(sourceFile, node.children),
    expression: sourceExpression(sourceFile, node, 'expression'),
    span: sourceSpan(sourceFile, node),
  };
}

function collectRenderNodes(sourceFile: ts.SourceFile): GenericRenderNode[] {
  const roots: GenericRenderNode[] = [];
  const visit = (node: ts.Node): void => {
    if (isJsxRoot(node)) {
      const parent = node.parent;
      if (parent === undefined || !(ts.isJsxElement(parent) || ts.isJsxFragment(parent))) {
        roots.push(renderNode(sourceFile, node));
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return roots;
}

function statementKindOf(statement: ts.Statement): GenericStatementKind {
  if (ts.isImportDeclaration(statement)) return 'import';
  if (ts.isInterfaceDeclaration(statement)) return 'interface';
  if (ts.isTypeAliasDeclaration(statement)) return 'type-alias';
  if (ts.isEnumDeclaration(statement)) return 'enum';
  if (ts.isVariableStatement(statement)) return 'variable';
  if (ts.isFunctionDeclaration(statement)) return 'function';
  if (ts.isClassDeclaration(statement)) return 'class';
  if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) return 'export';
  if (ts.isReturnStatement(statement)) return 'return';
  if (ts.isExpressionStatement(statement)) return 'expression';
  return 'other';
}

function statementName(sourceFile: ts.SourceFile, statement: ts.Statement): string | undefined {
  if (
    (ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement)) &&
    statement.name !== undefined
  ) {
    return statement.name.text;
  }
  if (ts.isVariableStatement(statement)) {
    const [declaration] = statement.declarationList.declarations;
    if (declaration !== undefined) {
      return ts.isIdentifier(declaration.name) ? declaration.name.text : identifierText(sourceFile, declaration.name);
    }
  }
  return undefined;
}

function isExported(statement: ts.Statement): boolean {
  return ts.canHaveModifiers(statement)
    ? (ts.getModifiers(statement) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    : false;
}

function genericStatement(sourceFile: ts.SourceFile, statement: ts.Statement): GenericStatement {
  return {
    kind: 'statement',
    statementKind: statementKindOf(statement),
    name: statementName(sourceFile, statement),
    exported: isExported(statement),
    text: sourceExpression(sourceFile, statement, 'statement'),
    renderNodes: nestedRenderNodes(sourceFile, statement),
    span: sourceSpan(sourceFile, statement),
  };
}

function bindingNames(sourceFile: ts.SourceFile, name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : bindingNames(sourceFile, element.name),
  );
}

function genericParameter(sourceFile: ts.SourceFile, parameter: ts.ParameterDeclaration): GenericParameter {
  const binding: GenericBindingKind = ts.isIdentifier(parameter.name)
    ? 'identifier'
    : ts.isObjectBindingPattern(parameter.name)
      ? 'object-pattern'
      : 'array-pattern';
  return {
    kind: 'parameter',
    text: nodeText(sourceFile, parameter.name),
    binding,
    names: bindingNames(sourceFile, parameter.name),
    type: parameter.type === undefined ? undefined : sourceExpression(sourceFile, parameter.type, 'type'),
    span: sourceSpan(sourceFile, parameter),
  };
}

/** Locate the component function declaration the module is named after. */
export function findComponentDeclaration(
  sourceFile: ts.SourceFile,
  componentName?: string,
): ts.FunctionDeclaration | undefined {
  const declarations = sourceFile.statements.filter((statement): statement is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(statement),
  );
  if (componentName !== undefined) {
    const named = declarations.find((declaration) => declaration.name?.text === componentName);
    if (named !== undefined) {
      return named;
    }
  }
  return declarations.find((declaration) => {
    if (declaration.body === undefined) {
      return false;
    }
    let hasJsx = false;
    const visit = (node: ts.Node): void => {
      if (hasJsx) return;
      if (isJsxRoot(node)) {
        hasJsx = true;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(declaration.body);
    return hasJsx;
  });
}

function genericComponent(sourceFile: ts.SourceFile, declaration: ts.FunctionDeclaration): GenericComponent {
  const statements = declaration.body?.statements ?? ts.factory.createNodeArray<ts.Statement>();
  const returnStatement = statements.find((statement): statement is ts.ReturnStatement =>
    ts.isReturnStatement(statement),
  );
  const returned = returnStatement?.expression;
  const unwrapped = returned !== undefined && ts.isParenthesizedExpression(returned) ? returned.expression : returned;
  const parameter = declaration.parameters[0];
  return {
    kind: 'component',
    name: declaration.name?.text ?? '',
    exported: isExported(declaration),
    parameter: parameter === undefined ? undefined : genericParameter(sourceFile, parameter),
    body: statements.map((statement) => genericStatement(sourceFile, statement)),
    returnExpression: unwrapped === undefined ? undefined : sourceExpression(sourceFile, unwrapped, 'expression'),
    returnNode: unwrapped !== undefined && isJsxRoot(unwrapped) ? renderNode(sourceFile, unwrapped) : undefined,
    span: sourceSpan(sourceFile, declaration),
  };
}

/** Build a serializable generic AST from a parsed source file. */
export function createGenericAst(
  sourceFile: ts.SourceFile,
  moduleKind: 'component' | 'composable',
  componentName?: string,
): GenericModuleAst {
  const componentDeclaration =
    moduleKind === 'component' ? findComponentDeclaration(sourceFile, componentName) : undefined;
  const imports: GenericImport[] = [];
  const declarations: GenericStatement[] = [];
  const nodes: GenericAstNode[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const entry = importNames(sourceFile, statement);
      imports.push(entry);
      nodes.push(entry);
      continue;
    }
    const entry = genericStatement(sourceFile, statement);
    if (statement !== componentDeclaration) {
      declarations.push(entry);
    }
    nodes.push(entry);
  }
  const renderNodes = collectRenderNodes(sourceFile);
  nodes.push(...renderNodes);
  return {
    kind: 'generic-module',
    fileName: sourceFile.fileName,
    moduleKind,
    // `sourceFile.getFullText()` returns the original buffer even after a
    // neutral transform. Print the transformed tree so target generators see
    // dead-branch pruning, inferred keys, and static markers without parsing
    // the pre-optimization source again.
    source: printSourceFile(sourceFile),
    imports,
    declarations,
    component: componentDeclaration === undefined ? undefined : genericComponent(sourceFile, componentDeclaration),
    renderNodes,
    nodes,
  };
}

/** Frontend result shared by inference and future source diagnostics. */
export interface FrontendModule {
  readonly sourceFile: ts.SourceFile;
  readonly ast: GenericModuleAst;
  readonly diagnostics: readonly CompilerDiagnostic[];
}

export function parseFrontendModule(
  fileName: string,
  source: string,
  moduleKind: 'component' | 'composable',
  componentName?: string,
): FrontendModule {
  const sourceFile = parseForgeModule(fileName, source);
  return {
    sourceFile,
    ast: createGenericAst(sourceFile, moduleKind, componentName),
    diagnostics: [],
  };
}
