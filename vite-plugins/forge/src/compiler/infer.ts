import { EMPTY_SEMANTIC_INTENTIONS } from '@mission-platform/forge-plugin-api';
import ts from 'typescript';

import { NEUTRAL_MODULE } from './ast.js';
import { createGenericAst } from './frontends.js';

import type {
  CompilerDiagnostic,
  EffectIntention,
  EventIntention,
  GenericStatement,
  DynamicNodeIntention,
  ListKeyIntention,
  MemoIntention,
  PropIntention,
  RefIntention,
  SemanticModule,
  SourceBackedExpression,
  SourceSpan,
  StateIntention,
  SlotIntention,
} from '@mission-platform/forge-plugin-api';

function span(sourceFile: ts.SourceFile, node: ts.Node): SourceSpan {
  const start = node.pos < 0 ? 0 : node.getStart(sourceFile);
  const end = Math.max(start, node.getEnd());
  const line = sourceFile.getLineAndCharacterOfPosition(start);
  return { start, end, line: line.line + 1, column: line.character + 1 };
}

function expression(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  syntax: SourceBackedExpression['syntax'] = 'expression',
): SourceBackedExpression {
  return {
    kind: 'source-backed-expression',
    syntax,
    text: node.pos < 0 ? '' : node.getText(sourceFile),
    span: span(sourceFile, node),
  };
}

function callName(node: ts.CallExpression): string | undefined {
  return ts.isIdentifier(node.expression) ? node.expression.text : undefined;
}

function variableDeclaration(node: ts.Node): ts.VariableDeclaration | undefined {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined && !ts.isVariableDeclaration(current)) {
    current = current.parent;
  }
  return current && ts.isVariableDeclaration(current) ? current : undefined;
}

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }
  return name.elements.flatMap((element) => (ts.isOmittedExpression(element) ? [] : bindingNames(element.name)));
}

/** Narrow a literal initializer to a safe TypeScript type name, never `any`. */
function literalTypeName(node: ts.Expression | undefined): string | undefined {
  if (node === undefined) {
    return undefined;
  }
  if (ts.isStringLiteralLike(node)) {
    return 'string';
  }
  if (ts.isNumericLiteral(node)) {
    return 'number';
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
    return 'boolean';
  }
  if (ts.isArrayLiteralExpression(node) && node.elements.length === 0) {
    return 'unknown[]';
  }
  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    return 'number';
  }
  return undefined;
}

function hookState(sourceFile: ts.SourceFile, call: ts.CallExpression): StateIntention | undefined {
  if (callName(call) !== 'useState') {
    return undefined;
  }
  const declaration = variableDeclaration(call);
  if (declaration === undefined) {
    return undefined;
  }
  const names = bindingNames(declaration.name);
  const initializer = call.arguments[0];
  // Prefer an explicit `useState<T>()` argument, then the declared variable
  // type, then a literal-derived type; `unknown` is the target-side fallback.
  const typeArgument = call.typeArguments?.[0];
  const declaredType = ts.isIdentifier(declaration.name) ? declaration.type : undefined;
  return {
    name: names[0] ?? declaration.name.getText(sourceFile),
    setterName: names[1],
    type:
      typeArgument === undefined
        ? declaredType === undefined
          ? undefined
          : expression(sourceFile, declaredType, 'type')
        : expression(sourceFile, typeArgument, 'type'),
    inferredType: literalTypeName(initializer),
    initializer: initializer ? expression(sourceFile, initializer) : undefined,
    span: span(sourceFile, call),
  };
}

function hookRef(sourceFile: ts.SourceFile, call: ts.CallExpression): RefIntention | undefined {
  if (callName(call) !== 'useRef') {
    return undefined;
  }
  const declaration = variableDeclaration(call);
  if (declaration === undefined || !ts.isIdentifier(declaration.name)) {
    return undefined;
  }
  return {
    name: declaration.name.text,
    elementType: call.typeArguments?.[0] ? expression(sourceFile, call.typeArguments[0], 'type') : undefined,
    initializer: call.arguments[0] ? expression(sourceFile, call.arguments[0]) : undefined,
    span: span(sourceFile, call),
  };
}

function hookMemo(sourceFile: ts.SourceFile, call: ts.CallExpression): MemoIntention | undefined {
  if (callName(call) !== 'useMemo') {
    return undefined;
  }
  const declaration = variableDeclaration(call);
  if (declaration === undefined || !ts.isIdentifier(declaration.name) || call.arguments[0] === undefined) {
    return undefined;
  }
  const dependencyArgument = call.arguments[1];
  return {
    name: declaration.name.text,
    factory: expression(sourceFile, call.arguments[0]),
    dependencies:
      dependencyArgument !== undefined && ts.isArrayLiteralExpression(dependencyArgument)
        ? dependencyArgument.elements.map((element) => expression(sourceFile, element))
        : undefined,
    span: span(sourceFile, call),
  };
}

function hookEffect(sourceFile: ts.SourceFile, call: ts.CallExpression): EffectIntention | undefined {
  if (callName(call) !== 'useEffect' || call.arguments[0] === undefined) {
    return undefined;
  }
  const dependencyArgument = call.arguments[1];
  let cleanup: SourceBackedExpression | undefined;
  const callback = call.arguments[0];
  if (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) {
    const returned = ts.isBlock(callback.body)
      ? callback.body.statements.find((statement) => ts.isReturnStatement(statement))
      : undefined;
    if (returned?.expression !== undefined) {
      cleanup = expression(sourceFile, returned.expression);
    }
  }
  return {
    body: expression(sourceFile, call.arguments[0]),
    cleanup,
    dependencies:
      dependencyArgument !== undefined && ts.isArrayLiteralExpression(dependencyArgument)
        ? dependencyArgument.elements.map((element) => expression(sourceFile, element))
        : undefined,
    span: span(sourceFile, call),
  };
}

type JsxElementLike = ts.JsxElement | ts.JsxSelfClosingElement;

function jsxAttributes(node: JsxElementLike): ts.JsxAttributes {
  return ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
}

function jsxTag(node: JsxElementLike): ts.JsxTagNameExpression {
  return ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
}

function propTypeMembers(sourceFile: ts.SourceFile, typeName: string): PropIntention[] {
  const declaration = sourceFile.statements.find(
    (statement): statement is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
      (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) &&
      statement.name.text === typeName,
  );
  const members =
    declaration === undefined
      ? []
      : ts.isInterfaceDeclaration(declaration)
        ? [...declaration.members]
        : ts.isTypeLiteralNode(declaration.type)
          ? [...declaration.type.members]
          : [];
  return members.flatMap((member) => {
    if (!ts.isPropertySignature(member) || member.name === undefined) {
      return [];
    }
    const name =
      ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)
        ? member.name.text
        : member.name.getText(sourceFile);
    return [
      {
        name,
        optional: member.questionToken !== undefined,
        type: member.type === undefined ? undefined : expression(sourceFile, member.type, 'type'),
        span: span(sourceFile, member),
      },
    ];
  });
}

function typeMembers(sourceFile: ts.SourceFile, type: ts.TypeNode | undefined): PropIntention[] {
  if (type === undefined) {
    return [];
  }
  if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
    return propTypeMembers(sourceFile, type.typeName.text);
  }
  if (ts.isTypeLiteralNode(type)) {
    return type.members.flatMap((member) => {
      if (!ts.isPropertySignature(member) || member.name === undefined) {
        return [];
      }
      return [
        {
          name: member.name.getText(sourceFile),
          optional: member.questionToken !== undefined,
          type: member.type === undefined ? undefined : expression(sourceFile, member.type, 'type'),
          span: span(sourceFile, member),
        },
      ];
    });
  }
  return [];
}

function componentDeclaration(
  sourceFile: ts.SourceFile,
  componentName: string | undefined,
): ts.FunctionDeclaration | undefined {
  return sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && (componentName === undefined || statement.name?.text === componentName),
  );
}

function inferProps(sourceFile: ts.SourceFile, componentName: string | undefined): PropIntention[] {
  const component = componentDeclaration(sourceFile, componentName);
  const parameter = component?.parameters[0];
  if (parameter === undefined) {
    return [];
  }
  if (ts.isObjectBindingPattern(parameter.name)) {
    // A destructured parameter may still be annotated; use the annotation to
    // recover per-prop types so targets never have to fall back to `any`.
    const annotated = new Map(typeMembers(sourceFile, parameter.type).map((entry) => [entry.name, entry]));
    return parameter.name.elements.flatMap((element) => {
      if (!ts.isBindingElement(element) || !ts.isIdentifier(element.name)) {
        return [];
      }
      const name = element.name.text;
      return [
        {
          name,
          optional: element.initializer === undefined,
          type: annotated.get(name)?.type,
          defaultValue: element.initializer ? expression(sourceFile, element.initializer) : undefined,
          span: span(sourceFile, element),
        },
      ];
    });
  }
  return typeMembers(sourceFile, parameter.type);
}

function slotIntentions(sourceFile: ts.SourceFile, node: ts.Node): SlotIntention[] {
  const slots: SlotIntention[] = [];
  const visit = (current: ts.Node): void => {
    if (ts.isCallExpression(current) && callName(current) === 'hasSlot' && current.arguments[0] !== undefined) {
      const name = ts.isStringLiteral(current.arguments[0])
        ? current.arguments[0].text
        : current.arguments[0].getText(sourceFile);
      slots.push({ name, span: span(sourceFile, current) });
    }
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      const tagName = jsxTag(current);
      if (ts.isIdentifier(tagName) && tagName.text === 'Slot') {
        const attributes = jsxAttributes(current);
        const nameAttribute = attributes.properties.find(
          (attribute): attribute is ts.JsxAttribute =>
            ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name) && attribute.name.text === 'name',
        );
        const value = nameAttribute?.initializer;
        const name = value && ts.isStringLiteral(value) ? value.text : (value?.getText(sourceFile) ?? 'default');
        slots.push({ name, span: span(sourceFile, current) });
      }
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return slots;
}

function eventIntentions(sourceFile: ts.SourceFile, node: ts.Node): EventIntention[] {
  const events: EventIntention[] = [];
  const visit = (current: ts.Node): void => {
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      const attributes = jsxAttributes(current);
      for (const attribute of attributes.properties) {
        if (
          !ts.isJsxAttribute(attribute) ||
          !ts.isIdentifier(attribute.name) ||
          !/^on[A-Z]/.test(attribute.name.text)
        ) {
          continue;
        }
        const value = attribute.initializer;
        if (value === undefined) {
          continue;
        }
        events.push({
          name: attribute.name.text.slice(2).toLowerCase(),
          handler:
            ts.isJsxExpression(value) && value.expression
              ? expression(sourceFile, value.expression)
              : expression(sourceFile, value),
          span: span(sourceFile, attribute),
        });
      }
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return events;
}

function dynamicIntentions(sourceFile: ts.SourceFile, node: ts.Node): DynamicNodeIntention[] {
  const dynamics: DynamicNodeIntention[] = [];
  const visit = (current: ts.Node): void => {
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
      const tagName = jsxTag(current);
      if (ts.isIdentifier(tagName) && tagName.text === 'Dynamic') {
        const attribute = jsxAttributes(current).properties.find(
          (property): property is ts.JsxAttribute =>
            ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === 'is',
        );
        const value = attribute?.initializer;
        if (value !== undefined) {
          const target = ts.isJsxExpression(value) && value.expression ? value.expression : value;
          dynamics.push({ expression: expression(sourceFile, target), span: span(sourceFile, current) });
        }
      }
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return dynamics;
}

function isStableListSource(sourceFile: ts.SourceFile, node: ts.Expression): boolean {
  if (ts.isArrayLiteralExpression(node)) {
    return true;
  }
  if (!ts.isIdentifier(node)) {
    return false;
  }
  return sourceFile.statements.some(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.flags === ts.NodeFlags.Const &&
      statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === node.text,
      ),
  );
}

function listKeys(sourceFile: ts.SourceFile, node: ts.Node): ListKeyIntention[] {
  const lists: ListKeyIntention[] = [];
  const visit = (current: ts.Node): void => {
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === 'map'
    ) {
      const listSource = current.expression.expression;
      const callback = current.arguments[0];
      let key: SourceBackedExpression | undefined;
      if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
        const returned = ts.isBlock(callback.body)
          ? callback.body.statements.find((statement) => ts.isReturnStatement(statement))?.expression
          : callback.body;
        if (returned && (ts.isJsxElement(returned) || ts.isJsxSelfClosingElement(returned))) {
          const attributes = jsxAttributes(returned);
          const keyAttribute = attributes.properties.find(
            (attribute): attribute is ts.JsxAttribute =>
              ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name) && attribute.name.text === 'key',
          );
          const value = keyAttribute?.initializer;
          if (value !== undefined) {
            key =
              ts.isJsxExpression(value) && value.expression
                ? expression(sourceFile, value.expression)
                : expression(sourceFile, value);
          }
        }
      }
      lists.push({
        source: expression(sourceFile, listSource),
        key,
        stable: isStableListSource(sourceFile, listSource),
        span: span(sourceFile, current),
      });
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return lists;
}

/** Infer target-neutral intentions from a parsed source module. */
export function inferSemanticModule(
  sourceFile: ts.SourceFile,
  moduleKind: 'component' | 'composable',
  componentName?: string,
): SemanticModule {
  const ast = createGenericAst(sourceFile, moduleKind, componentName);
  const imports = ast.imports;
  const props = moduleKind === 'component' ? inferProps(sourceFile, componentName) : [];
  const parameter = ast.component?.parameter;
  const state: StateIntention[] = [];
  const refs: RefIntention[] = [];
  const memos: MemoIntention[] = [];
  const effects: EffectIntention[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const stateIntention = hookState(sourceFile, node);
      if (stateIntention) state.push(stateIntention);
      const refIntention = hookRef(sourceFile, node);
      if (refIntention) refs.push(refIntention);
      const memoIntention = hookMemo(sourceFile, node);
      if (memoIntention) memos.push(memoIntention);
      const effectIntention = hookEffect(sourceFile, node);
      if (effectIntention) effects.push(effectIntention);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  const slots = slotIntentions(sourceFile, sourceFile);
  const renderTree = ast.renderNodes;
  const events = eventIntentions(sourceFile, sourceFile);
  const dynamicNodes = dynamicIntentions(sourceFile, sourceFile);
  const listKeyFacts = listKeys(sourceFile, sourceFile);
  const setupStatements = ast.nodes
    .filter((node): node is GenericStatement => node.kind === 'statement')
    .map((node) => node.text);
  const staticSubtrees = renderTree
    .filter((node) => typeof node.tag === 'string' && /^[a-z]/.test(node.tag))
    .map((node) => node.span);
  const runtimeImports = imports
    .filter((entry) => entry.source === NEUTRAL_MODULE)
    .flatMap((entry) => entry.valueNames);

  const diagnostics: CompilerDiagnostic[] = [];
  return {
    kind: 'semantic-module',
    moduleKind,
    fileName: sourceFile.fileName,
    componentName,
    ast,
    imports,
    intentions: {
      ...EMPTY_SEMANTIC_INTENTIONS,
      props,
      propsType: parameter?.type,
      propsParameterName: parameter?.binding === 'identifier' ? parameter.text : undefined,
      setupStatements,
      state,
      refs,
      memos,
      effects,
      slots,
      dynamicNodes,
      events,
      renderTree,
      staticSubtrees,
      listKeys: listKeyFacts,
      runtimeImports,
    },
    diagnostics,
  };
}
