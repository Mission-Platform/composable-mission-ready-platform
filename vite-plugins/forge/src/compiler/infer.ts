import {
  createCompilerDiagnostic,
  EMPTY_SEMANTIC_INTENTIONS,
  walkRenderNodes,
} from '@mission-platform/forge-plugin-api';
import { hasMpStaticMarker } from '@mission-platform/forge-plugin-api/compiler/optimize.js';

import { NEUTRAL_MODULE } from './ast.js';
import { createGenericAstFromOxc } from './frontends.js';
import { optimizeGenericModule, type OptimizeOptions } from './optimize.js';
import {
  buildOxcParentMap,
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
  visitOxc,
  type OxcNode,
  type OxcParentMap,
  type OxcParsedModule,
} from './oxc.js';

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

function expression(
  source: string,
  node: OxcNode,
  syntax: SourceBackedExpression['syntax'] = 'expression',
): SourceBackedExpression {
  return oxcSourceExpression(source, node, syntax);
}

function callName(node: OxcNode): string | undefined {
  return oxcIdentifierName(oxcObject(node, 'callee'));
}

function variableDeclaratorFor(call: OxcNode, parents: OxcParentMap): OxcNode | undefined {
  let current: OxcNode | undefined = parents.get(call);
  while (current !== undefined && current.type !== 'VariableDeclarator') {
    current = parents.get(current);
  }
  return current;
}

function bindingNames(source: string, name: OxcNode | undefined): string[] {
  if (name === undefined) return [];
  if (name.type === 'Identifier') {
    const text = oxcIdentifierName(name);
    return text === undefined ? [] : [text];
  }
  if (name.type === 'ArrayPattern') {
    return oxcArray(name, 'elements').flatMap((element) => {
      if (element.type === 'RestElement') {
        return bindingNames(source, oxcObject(element, 'argument'));
      }
      return bindingNames(source, element);
    });
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
  if (name.type === 'AssignmentPattern') {
    return bindingNames(source, oxcObject(name, 'left'));
  }
  return [];
}

/** Narrow a literal initializer to a safe TypeScript type name, never `any`. */
function literalTypeName(node: OxcNode | undefined): string | undefined {
  if (node === undefined) return undefined;
  if (node.type === 'Literal') {
    const value = oxcLiteralValue(node);
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return undefined;
  }
  if (node.type === 'TemplateLiteral' && oxcArray(node, 'expressions').length === 0) {
    return 'string';
  }
  if (node.type === 'ArrayExpression' && oxcArray(node, 'elements').length === 0) {
    return 'unknown[]';
  }
  if (
    node.type === 'UnaryExpression' &&
    (node.operator === '+' || node.operator === '-') &&
    oxcObject(node, 'argument')?.type === 'Literal' &&
    typeof oxcLiteralValue(oxcObject(node, 'argument')) === 'number'
  ) {
    return 'number';
  }
  return undefined;
}

function typeArguments(call: OxcNode): OxcNode[] {
  const typeArgumentsNode = oxcObject(call, 'typeArguments') ?? oxcObject(call, 'typeParameters');
  return typeArgumentsNode === undefined ? [] : oxcArray(typeArgumentsNode, 'params');
}

function hookState(source: string, call: OxcNode, parents: OxcParentMap): StateIntention | undefined {
  if (callName(call) !== 'useState') return undefined;
  const declaration = variableDeclaratorFor(call, parents);
  if (declaration === undefined) return undefined;
  const id = oxcObject(declaration, 'id');
  const names = bindingNames(source, id);
  const [initializer] = oxcArray(call, 'arguments');
  const [typeArgument] = typeArguments(call);
  const declaredType = id?.type === 'Identifier' ? oxcTypeNode(oxcObject(id, 'typeAnnotation')) : undefined;
  return {
    name: names[0] ?? (id === undefined ? '' : oxcNodeText(source, id)),
    setterName: names[1],
    type:
      typeArgument === undefined
        ? declaredType === undefined
          ? undefined
          : expression(source, declaredType, 'type')
        : expression(source, typeArgument, 'type'),
    inferredType: literalTypeName(initializer),
    initializer: initializer ? expression(source, initializer) : undefined,
    span: oxcSourceSpan(source, call),
  };
}

function hookRef(source: string, call: OxcNode, parents: OxcParentMap): RefIntention | undefined {
  if (callName(call) !== 'useRef') return undefined;
  const declaration = variableDeclaratorFor(call, parents);
  const id = declaration === undefined ? undefined : oxcObject(declaration, 'id');
  if (id === undefined || id.type !== 'Identifier') return undefined;
  const [typeArgument] = typeArguments(call);
  const [initializer] = oxcArray(call, 'arguments');
  return {
    name: oxcIdentifierName(id) ?? '',
    elementType: typeArgument === undefined ? undefined : expression(source, typeArgument, 'type'),
    initializer: initializer === undefined ? undefined : expression(source, initializer),
    span: oxcSourceSpan(source, call),
  };
}

function hookMemo(source: string, call: OxcNode, parents: OxcParentMap): MemoIntention | undefined {
  if (callName(call) !== 'useMemo') return undefined;
  const declaration = variableDeclaratorFor(call, parents);
  const id = declaration === undefined ? undefined : oxcObject(declaration, 'id');
  const args = oxcArray(call, 'arguments');
  if (id === undefined || id.type !== 'Identifier' || args[0] === undefined) return undefined;
  const dependencyArgument = args[1];
  return {
    name: oxcIdentifierName(id) ?? '',
    factory: expression(source, args[0]),
    dependencies:
      dependencyArgument !== undefined && dependencyArgument.type === 'ArrayExpression'
        ? oxcArray(dependencyArgument, 'elements').map((element) => expression(source, element))
        : undefined,
    span: oxcSourceSpan(source, call),
  };
}

function hookEffect(source: string, call: OxcNode): EffectIntention | undefined {
  const args = oxcArray(call, 'arguments');
  if (callName(call) !== 'useEffect' || args[0] === undefined) return undefined;
  const dependencyArgument = args[1];
  let cleanup: SourceBackedExpression | undefined;
  const callback = args[0];
  if (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') {
    const body = oxcObject(callback, 'body');
    if (body?.type === 'BlockStatement') {
      const returned = oxcArray(body, 'body').find((statement) => statement.type === 'ReturnStatement');
      const returnedExpression = returned === undefined ? undefined : oxcObject(returned, 'argument');
      if (returnedExpression !== undefined) {
        cleanup = expression(source, returnedExpression);
      }
    }
  }
  return {
    body: expression(source, args[0]),
    cleanup,
    dependencies:
      dependencyArgument !== undefined && dependencyArgument.type === 'ArrayExpression'
        ? oxcArray(dependencyArgument, 'elements').map((element) => expression(source, element))
        : undefined,
    span: oxcSourceSpan(source, call),
  };
}

function jsxOpening(node: OxcNode): OxcNode {
  return node.type === 'JSXElement' ? (oxcObject(node, 'openingElement') ?? node) : node;
}

function jsxTag(node: OxcNode): OxcNode | undefined {
  return oxcObject(jsxOpening(node), 'name');
}

function jsxAttributeList(node: OxcNode): OxcNode[] {
  return oxcArray(jsxOpening(node), 'attributes');
}

function propMembersFromTypeLiteral(source: string, members: readonly OxcNode[]): PropIntention[] {
  return members.flatMap((member) => {
    if (member.type !== 'TSPropertySignature') return [];
    const key = oxcObject(member, 'key');
    const name =
      oxcIdentifierName(key) ??
      (key?.type === 'Literal' && typeof key.value === 'string'
        ? key.value
        : key === undefined
          ? ''
          : oxcNodeText(source, key));
    const typeNode = oxcTypeNode(oxcObject(member, 'typeAnnotation'));
    return [
      {
        name,
        optional: member.optional === true,
        type: typeNode === undefined ? undefined : expression(source, typeNode, 'type'),
        span: oxcSourceSpan(source, member),
      },
    ];
  });
}

function propTypeMembers(source: string, program: OxcNode, typeName: string): PropIntention[] {
  for (const statement of oxcProgramBody(program)) {
    const { node } = oxcUnwrapModuleStatement(statement);
    if (node.type === 'TSInterfaceDeclaration' && oxcIdentifierName(oxcObject(node, 'id')) === typeName) {
      const body = oxcObject(node, 'body');
      return propMembersFromTypeLiteral(source, body === undefined ? [] : oxcArray(body, 'body'));
    }
    if (node.type === 'TSTypeAliasDeclaration' && oxcIdentifierName(oxcObject(node, 'id')) === typeName) {
      const typeAnnotation = oxcObject(node, 'typeAnnotation');
      if (typeAnnotation?.type === 'TSTypeLiteral') {
        return propMembersFromTypeLiteral(source, oxcArray(typeAnnotation, 'members'));
      }
    }
  }
  return [];
}

function typeMembers(source: string, program: OxcNode, type: OxcNode | undefined): PropIntention[] {
  if (type === undefined) return [];
  if (type.type === 'TSTypeReference') {
    const typeName = oxcIdentifierName(oxcObject(type, 'typeName'));
    if (typeName !== undefined) {
      return propTypeMembers(source, program, typeName);
    }
  }
  if (type.type === 'TSTypeLiteral') {
    return propMembersFromTypeLiteral(source, oxcArray(type, 'members'));
  }
  return [];
}

function inferProps(source: string, program: OxcNode, componentName: string | undefined): PropIntention[] {
  let component: OxcNode | undefined;
  for (const statement of oxcProgramBody(program)) {
    const unwrapped = oxcUnwrapModuleStatement(statement);
    if (unwrapped.node.type !== 'FunctionDeclaration') continue;
    const name = oxcIdentifierName(oxcObject(unwrapped.node, 'id'));
    if (componentName === undefined || name === componentName) {
      component = unwrapped.node;
      if (componentName !== undefined) break;
    }
  }
  const [parameter] = component === undefined ? [] : oxcArray(component, 'params');
  if (parameter === undefined) return [];

  const typeAnnotation = oxcTypeNode(oxcObject(parameter, 'typeAnnotation'));

  if (parameter.type === 'ObjectPattern') {
    const annotated = new Map(typeMembers(source, program, typeAnnotation).map((entry) => [entry.name, entry]));
    return oxcArray(parameter, 'properties').flatMap((property) => {
      if (property.type !== 'Property') return [];
      const value = oxcObject(property, 'value') ?? oxcObject(property, 'key');
      if (value === undefined) return [];
      let nameNode = value;
      let defaultValue: OxcNode | undefined;
      if (value.type === 'AssignmentPattern') {
        nameNode = oxcObject(value, 'left') ?? value;
        defaultValue = oxcObject(value, 'right');
      }
      if (nameNode.type !== 'Identifier') return [];
      const name = oxcIdentifierName(nameNode) ?? '';
      return [
        {
          name,
          // Preserve the previous TS frontend rule: a binding without a default
          // is treated as optional at the intention layer.
          optional: defaultValue === undefined,
          type: annotated.get(name)?.type,
          defaultValue: defaultValue === undefined ? undefined : expression(source, defaultValue),
          span: oxcSourceSpan(source, property),
        },
      ];
    });
  }

  // Match prior TS behavior: destructured optional defaults used initializer presence;
  // for plain identifier props, optionality comes from the type members.
  if (parameter.type === 'Identifier' || parameter.type === 'AssignmentPattern') {
    return typeMembers(source, program, typeAnnotation);
  }

  return typeMembers(source, program, typeAnnotation);
}

function slotIntentions(source: string, root: OxcNode): SlotIntention[] {
  const slots: SlotIntention[] = [];
  visitOxc(root, (current) => {
    if (current.type === 'CallExpression' && callName(current) === 'hasSlot') {
      const [argument] = oxcArray(current, 'arguments');
      if (argument !== undefined) {
        const name =
          argument.type === 'Literal' && typeof argument.value === 'string'
            ? argument.value
            : oxcNodeText(source, argument);
        slots.push({ name, span: oxcSourceSpan(source, current) });
      }
    }
    if (current.type === 'JSXElement' || current.type === 'JSXSelfClosingElement') {
      const tagName = jsxTag(current);
      if (oxcIdentifierName(tagName) === 'Slot') {
        const nameAttribute = jsxAttributeList(current).find(
          (attribute) =>
            attribute.type === 'JSXAttribute' && oxcIdentifierName(oxcObject(attribute, 'name')) === 'name',
        );
        const value = nameAttribute === undefined ? undefined : oxcObject(nameAttribute, 'value');
        let name = 'default';
        if (value?.type === 'Literal' && typeof value.value === 'string') {
          name = value.value;
        } else if (value?.type === 'JSXExpressionContainer') {
          const inner = oxcObject(value, 'expression');
          name = inner === undefined ? 'default' : oxcNodeText(source, inner);
        } else if (value !== undefined) {
          name = oxcNodeText(source, value);
        }
        slots.push({ name, span: oxcSourceSpan(source, current) });
      }
    }
  });
  return slots;
}

function eventIntentions(source: string, root: OxcNode): EventIntention[] {
  const events: EventIntention[] = [];
  visitOxc(root, (current) => {
    if (current.type !== 'JSXElement' && current.type !== 'JSXSelfClosingElement') return;
    for (const attribute of jsxAttributeList(current)) {
      if (attribute.type !== 'JSXAttribute') continue;
      const attributeName = oxcIdentifierName(oxcObject(attribute, 'name'));
      if (attributeName === undefined || !/^on[A-Z]/.test(attributeName)) continue;
      const value = oxcObject(attribute, 'value');
      if (value === undefined) continue;
      const handler =
        value.type === 'JSXExpressionContainer' && oxcObject(value, 'expression') !== undefined
          ? expression(source, oxcObject(value, 'expression')!)
          : expression(source, value);
      events.push({
        name: attributeName.slice(2).toLowerCase(),
        handler,
        span: oxcSourceSpan(source, attribute),
      });
    }
  });
  return events;
}

function dynamicIntentions(source: string, root: OxcNode): DynamicNodeIntention[] {
  const dynamics: DynamicNodeIntention[] = [];
  visitOxc(root, (current) => {
    if (current.type !== 'JSXElement' && current.type !== 'JSXSelfClosingElement') return;
    if (oxcIdentifierName(jsxTag(current)) !== 'Dynamic') return;
    const attribute = jsxAttributeList(current).find(
      (entry) => entry.type === 'JSXAttribute' && oxcIdentifierName(oxcObject(entry, 'name')) === 'is',
    );
    const value = attribute === undefined ? undefined : oxcObject(attribute, 'value');
    if (value === undefined) return;
    const target =
      value.type === 'JSXExpressionContainer' && oxcObject(value, 'expression') !== undefined
        ? oxcObject(value, 'expression')!
        : value;
    dynamics.push({ expression: expression(source, target), span: oxcSourceSpan(source, current) });
  });
  return dynamics;
}

function isStableListSource(sourceModule: OxcParsedModule, node: OxcNode): boolean {
  if (node.type === 'ArrayExpression') return true;
  if (node.type !== 'Identifier') return false;
  const name = oxcIdentifierName(node);
  if (name === undefined) return false;
  return oxcProgramBody(sourceModule.program).some((statement) => {
    const { node: declaration } = oxcUnwrapModuleStatement(statement);
    if (declaration.type !== 'VariableDeclaration' || declaration.kind !== 'const') return false;
    return oxcArray(declaration, 'declarations').some((entry) => oxcIdentifierName(oxcObject(entry, 'id')) === name);
  });
}

function listKeys(source: string, root: OxcNode, module: OxcParsedModule): ListKeyIntention[] {
  const lists: ListKeyIntention[] = [];
  visitOxc(root, (current) => {
    if (current.type !== 'CallExpression') return;
    const callee = oxcObject(current, 'callee');
    if (callee?.type !== 'MemberExpression' && callee?.type !== 'OptionalMemberExpression') return;
    if (oxcIdentifierName(oxcObject(callee, 'property')) !== 'map') return;
    const listSource = oxcObject(callee, 'object');
    if (listSource === undefined) return;
    const [callback] = oxcArray(current, 'arguments');
    let key: SourceBackedExpression | undefined;
    if (callback && (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression')) {
      const body = oxcObject(callback, 'body');
      let returned: OxcNode | undefined;
      if (body?.type === 'BlockStatement') {
        const returnStatement = oxcArray(body, 'body').find((statement) => statement.type === 'ReturnStatement');
        returned = returnStatement === undefined ? undefined : oxcObject(returnStatement, 'argument');
      } else {
        returned = body;
      }
      if (returned && (returned.type === 'JSXElement' || returned.type === 'JSXSelfClosingElement')) {
        const keyAttribute = jsxAttributeList(returned).find(
          (attribute) => attribute.type === 'JSXAttribute' && oxcIdentifierName(oxcObject(attribute, 'name')) === 'key',
        );
        const value = keyAttribute === undefined ? undefined : oxcObject(keyAttribute, 'value');
        if (value !== undefined) {
          key =
            value.type === 'JSXExpressionContainer' && oxcObject(value, 'expression') !== undefined
              ? expression(source, oxcObject(value, 'expression')!)
              : expression(source, value);
        }
      }
    }
    lists.push({
      source: expression(source, listSource),
      key,
      stable: isStableListSource(module, listSource),
      span: oxcSourceSpan(source, current),
    });
  });
  return lists;
}

/** Infer target-neutral intentions from a parsed Oxc source module. */
export function inferSemanticModule(
  module: OxcParsedModule,
  moduleKind: 'component' | 'composable',
  componentName?: string,
  optimize: OptimizeOptions | false = {},
): SemanticModule {
  const source = module.source;
  const parents = buildOxcParentMap(module.program);
  // Static-node marking is a pure record transform over the generic AST, shared
  // with the framework plugins via the parser-independent optimizeGenericModule.
  const baseAst = createGenericAstFromOxc(module, moduleKind, componentName);
  const ast =
    optimize !== false && optimize.staticMarking !== false
      ? optimizeGenericModule(baseAst, { staticMarking: optimize.staticMarking }).module
      : baseAst;
  const imports = ast.imports;
  const props = moduleKind === 'component' ? inferProps(source, module.program, componentName) : [];
  const parameter = ast.component?.parameter;
  const state: StateIntention[] = [];
  const refs: RefIntention[] = [];
  const memos: MemoIntention[] = [];
  const effects: EffectIntention[] = [];

  visitOxc(module.program, (node) => {
    if (node.type !== 'CallExpression') return;
    const stateIntention = hookState(source, node, parents);
    if (stateIntention) state.push(stateIntention);
    const refIntention = hookRef(source, node, parents);
    if (refIntention) refs.push(refIntention);
    const memoIntention = hookMemo(source, node, parents);
    if (memoIntention) memos.push(memoIntention);
    const effectIntention = hookEffect(source, node);
    if (effectIntention) effects.push(effectIntention);
  });

  const slots = slotIntentions(source, module.program);
  const renderTree = module.facts.hasJsx === false ? [] : ast.renderNodes;
  const events = eventIntentions(source, module.program);
  const dynamicNodes = dynamicIntentions(source, module.program);
  const listKeyFacts = listKeys(source, module.program, module);
  const setupStatements = ast.nodes
    .filter((node): node is GenericStatement => node.kind === 'statement')
    .map((node) => node.text);
  const staticSubtrees: SourceSpan[] = [];
  walkRenderNodes(renderTree, (node) => {
    if (hasMpStaticMarker(node) && node.tagKind !== 'fragment') {
      staticSubtrees.push(node.span);
    }
  });
  const runtimeImports = imports
    .filter((entry) => entry.source === NEUTRAL_MODULE)
    .flatMap((entry) => entry.valueNames);

  const diagnostics: CompilerDiagnostic[] = [];
  if (moduleKind === 'component' && ast.component === undefined) {
    diagnostics.push(
      createCompilerDiagnostic({
        phase: 'inference',
        severity: 'error',
        code: 'FORGE_COMPONENT_NOT_FOUND',
        message: `Could not find a component function${componentName ? ` named "${componentName}"` : ''}.`,
        fileName: module.fileName,
        span: {
          start: 0,
          end: source.length,
          line: 1,
          column: 1,
        },
      }),
    );
  }

  return {
    kind: 'semantic-module',
    moduleKind,
    fileName: module.fileName,
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
