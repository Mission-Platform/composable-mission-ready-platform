/**
 * Recursive-helper extraction for the Vue emitter (Step 2).
 *
 * Some neutral components render an arbitrary-depth tree with a **self-recursive,
 * state-capturing** render helper — `const renderItems = (entries, parentPath,
 * nested) => entries.map((item, index) => <li>…{renderItems(item.children, …)}…</li>)`
 * — invoked from the return tree (`{items ? renderItems(items, '', false) : …}`).
 * A flat Vue `<template>` has no form for that recursion, so such components
 * previously fell back to the `const render = () => …` closure.
 *
 * {@link trySynthesizeRecursiveHelper} recognises that exact shape and rewrites
 * it into **two** ordinary neutral components that the existing pipeline can
 * emit as native `<template>` SFCs:
 *
 * - an **auxiliary** component (`<Component>Item`) whose body is the map
 *   callback — `renderIcon`-style node helpers inlined, the self-recursion
 *   rewritten to `children.map((child, index) => <AuxTag … />)` (a native
 *   `v-for` of the component referencing itself), and the captured shared
 *   handlers received as props; and
 * - the **parent**, with the helper/​icon consts removed and the invocation
 *   rewritten to `entries.map((item, index) => <AuxTag … />)`, importing the
 *   auxiliary component.
 *
 * The whole thing is **guarded**: if any part of the shape is not exactly
 * matched (or types can't be recovered), it returns `undefined` and the emitter
 * keeps its safe render-closure fallback, so the build never regresses.
 */
import ts from 'typescript';

import { printNode } from '../../compiler/ast.js';

/** The result of a successful synthesis: the rewritten parent + one auxiliary module. */
export interface SynthesizedRecursiveHelper {
  /** The rewritten parent component's neutral source (re-emitted as the primary SFC). */
  parentSource: string;
  /** The auxiliary component's export name, e.g. `BaseMenubarItem`. */
  auxName: string;
  /** The auxiliary module's flat-tree base name, e.g. `base-menubar-item`. */
  auxBase: string;
  /** The auxiliary component's neutral source (emitted as an extra SFC). */
  auxSource: string;
}

/** `BaseMenubar` → `base-menubar`. */
function pascalToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Pick a `{ auxName, auxBase }` pair for the extracted auxiliary component that
 * does **not** collide with an existing sibling component folder.
 *
 * The default is `${Component}Item` / `${kebab}-item`, but when the host package
 * already ships a real component at that flat-tree base name (e.g. `BaseMenu`'s
 * recursive helper would otherwise emit `base-menu-item`, clashing with the
 * standalone `BaseMenuItem` component), the parent's `./<auxBase>` import would
 * resolve to that unrelated component and silently drop the helper's props. To
 * stay unique we fall back through descriptive suffixes and finally a numeric
 * one, so the emitted auxiliary always resolves to itself.
 */
function pickAuxNames(
  componentName: string,
  componentFolders: ReadonlySet<string> | undefined,
): { auxName: string; auxBase: string } {
  const kebab = pascalToKebab(componentName);
  const suffixes = ['Item', 'Node', 'Entry', 'Branch'];
  const candidates = suffixes.map((suffix) => ({
    auxName: `${componentName}${suffix}`,
    auxBase: `${kebab}-${suffix.toLowerCase()}`,
  }));
  const free = candidates.find((candidate) => !(componentFolders?.has(candidate.auxBase) ?? false));
  if (free !== undefined) {
    return free;
  }
  // Every descriptive suffix is taken — disambiguate numerically.
  let index = 2;
  while (componentFolders?.has(`${kebab}-item-${index}`) ?? false) {
    index += 1;
  }
  return { auxName: `${componentName}Item${index}`, auxBase: `${kebab}-item-${index}` };
}

/** Unwrap redundant parentheses. */
function unwrap(expr: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(expr) ? unwrap(expr.expression) : expr;
}

/** The single `const <name> = <init>;` an arrow-valued variable statement declares, or `undefined`. */
function singleConstArrow(
  statement: ts.Statement,
): { name: string; arrow: ts.ArrowFunction; statement: ts.VariableStatement } | undefined {
  if (
    !ts.isVariableStatement(statement) ||
    (statement.declarationList.flags & ts.NodeFlags.Const) === 0 ||
    statement.declarationList.declarations.length !== 1
  ) {
    return undefined;
  }
  const declaration = statement.declarationList.declarations[0];
  if (
    !ts.isIdentifier(declaration.name) ||
    declaration.initializer === undefined ||
    !ts.isArrowFunction(declaration.initializer)
  ) {
    return undefined;
  }
  return { name: declaration.name.text, arrow: declaration.initializer, statement };
}

/** Whether an arrow's body evaluates to a framework node (JSX element or a conditional between them). */
function isNodeReturningArrow(arrow: ts.ArrowFunction): boolean {
  const producesNode = (expr: ts.Expression): boolean => {
    const node = unwrap(expr);
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      return true;
    }
    if (ts.isConditionalExpression(node)) {
      return producesNode(node.whenTrue) || producesNode(node.whenFalse);
    }
    return false;
  };
  if (ts.isBlock(arrow.body)) {
    return arrow.body.statements.some(
      (statement) =>
        ts.isReturnStatement(statement) && statement.expression !== undefined && producesNode(statement.expression),
    );
  }
  return producesNode(arrow.body);
}

/** Whether `node` (anywhere in `root`) calls the identifier `name`. */
function callsIdentifier(root: ts.Node, name: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

/** Collect the identifier names referenced anywhere in `root`. */
function referencedIdentifiers(root: ts.Node): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      names.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return names;
}

/** The recognised self-recursive, array-returning render-helper shape. */
interface HelperShape {
  helperName: string;
  entriesParamType: ts.TypeNode;
  elementType: ts.TypeNode;
  restParams: ts.ParameterDeclaration[];
  itemParam: string;
  indexParam: string | undefined;
  callbackBody: ts.ConciseBody;
  /** Node-returning helper consts referenced by the callback, to inline (e.g. `renderIcon`). */
  nodeHelpers: Map<string, ts.ArrowFunction>;
  /** Captured function consts referenced by the callback, lifted to props (e.g. `isPathOpen`). */
  capturedFns: { name: string; type: ts.FunctionTypeNode }[];
}

/**
 * Detect a `const <helper> = (entries, …rest) => entries.map((item, index?) =>
 * <element…>)` where the callback recurses into `<helper>(…)`. Returns the shape
 * or `undefined` when it doesn't match exactly (so the caller keeps the fallback).
 */
function detectHelper(component: ts.FunctionDeclaration): HelperShape | undefined {
  const body = component.body;
  if (body === undefined) {
    return undefined;
  }
  // Index the component-body const arrows so referenced helpers can be classified.
  const constArrows = new Map<string, ts.ArrowFunction>();
  for (const statement of body.statements) {
    const entry = singleConstArrow(statement);
    if (entry !== undefined) {
      constArrows.set(entry.name, entry.arrow);
    }
  }

  for (const [helperName, arrow] of constArrows) {
    if (arrow.parameters.length < 1 || ts.isBlock(arrow.body)) {
      continue;
    }
    const mapCall = unwrap(arrow.body);
    if (
      !ts.isCallExpression(mapCall) ||
      !ts.isPropertyAccessExpression(mapCall.expression) ||
      mapCall.expression.name.text !== 'map' ||
      mapCall.arguments.length !== 1
    ) {
      continue;
    }
    const callback = mapCall.arguments[0];
    if (!ts.isArrowFunction(callback) || callback.parameters.length < 1) {
      continue;
    }
    // Recursion: the callback must invoke the helper by name.
    if (!callsIdentifier(callback.body, helperName)) {
      continue;
    }
    const entriesParam = arrow.parameters[0];
    if (entriesParam.type === undefined || !ts.isArrayTypeNode(entriesParam.type)) {
      continue;
    }
    const itemParam = callback.parameters[0];
    const indexParam = callback.parameters[1];
    if (!ts.isIdentifier(itemParam.name) || (indexParam !== undefined && !ts.isIdentifier(indexParam.name))) {
      continue;
    }
    const restParams = arrow.parameters.slice(1);
    if (restParams.some((parameter) => parameter.type === undefined || !ts.isIdentifier(parameter.name))) {
      continue;
    }

    // Classify the identifiers the callback captures from the component body.
    const referenced = referencedIdentifiers(callback.body);
    const nodeHelpers = new Map<string, ts.ArrowFunction>();
    const capturedFns: { name: string; type: ts.FunctionTypeNode }[] = [];
    let bail = false;
    for (const name of referenced) {
      if (name === helperName) {
        continue;
      }
      const captured = constArrows.get(name);
      if (captured === undefined) {
        continue;
      }
      if (isNodeReturningArrow(captured)) {
        // Only an expression-bodied node helper (`(item) => item.icon ? <span/> :
        // undefined`) can be inlined into the markup; a block body has no
        // template form, so keep the fallback.
        if (ts.isBlock(captured.body)) {
          bail = true;
          break;
        }
        nodeHelpers.set(name, captured);
        continue;
      }
      // A captured non-node function must expose a full, printable signature to
      // become a typed prop; bail (keep the fallback) if it doesn't.
      if (captured.type === undefined || captured.parameters.some((parameter) => parameter.type === undefined)) {
        bail = true;
        break;
      }
      capturedFns.push({
        name,
        type: ts.factory.createFunctionTypeNode(undefined, captured.parameters, captured.type),
      });
    }
    if (bail) {
      continue;
    }

    return {
      helperName,
      entriesParamType: entriesParam.type,
      elementType: entriesParam.type.elementType,
      restParams,
      itemParam: itemParam.name.text,
      indexParam: indexParam !== undefined && ts.isIdentifier(indexParam.name) ? indexParam.name.text : undefined,
      callbackBody: callback.body,
      nodeHelpers,
      capturedFns,
    };
  }
  return undefined;
}

/** A `name={expr}` JSX attribute. */
function jsxAttr(name: string, expr: ts.Expression): ts.JsxAttribute {
  return ts.factory.createJsxAttribute(
    ts.factory.createIdentifier(name),
    ts.factory.createJsxExpression(undefined, expr),
  );
}

/** A `<AuxName item={…} index={…} …rest… …captured… />` self-closing element. */
function buildAuxTag(auxName: string, attributes: { name: string; expr: ts.Expression }[]): ts.JsxSelfClosingElement {
  return ts.factory.createJsxSelfClosingElement(
    ts.factory.createIdentifier(auxName),
    undefined,
    ts.factory.createJsxAttributes(attributes.map((attribute) => jsxAttr(attribute.name, attribute.expr))),
  );
}

/** A simple `(a, b) => body` arrow. */
function buildArrow(paramNames: string[], body: ts.ConciseBody): ts.ArrowFunction {
  return ts.factory.createArrowFunction(
    undefined,
    undefined,
    paramNames.map((name) => ts.factory.createParameterDeclaration(undefined, undefined, name)),
    undefined,
    ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    body,
  );
}

/** `(<source>).map((<itemName>, <indexName>) => <auxTag>)`. */
function buildMap(
  source: ts.Expression,
  itemName: string,
  indexName: string,
  auxTag: ts.JsxSelfClosingElement,
): ts.CallExpression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(ts.factory.createParenthesizedExpression(source), 'map'),
    undefined,
    [buildArrow([itemName, indexName], auxTag)],
  );
}

/** The shared-handler attributes (`isPathOpen={isPathOpen}`, …) forwarded onto every aux tag. */
function sharedAttrs(shape: HelperShape): { name: string; expr: ts.Expression }[] {
  return shape.capturedFns.map((fn) => ({ name: fn.name, expr: ts.factory.createIdentifier(fn.name) }));
}

/** Substitute each of `arrow`'s parameters with the matching call argument in its (expression) body. */
function inlineArrow(arrow: ts.ArrowFunction, args: readonly ts.Expression[]): ts.Expression {
  const substitutions = new Map<string, ts.Expression>();
  arrow.parameters.forEach((parameter, index) => {
    if (ts.isIdentifier(parameter.name) && args[index] !== undefined) {
      substitutions.set(parameter.name.text, args[index]);
    }
  });
  const result = ts.transform(arrow.body as ts.Expression, [
    (context) => (root) => {
      const visit = (node: ts.Node): ts.Node => {
        if (ts.isIdentifier(node) && substitutions.has(node.text)) {
          return substitutions.get(node.text) as ts.Node;
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(root, visit) as ts.Expression;
    },
  ]);
  return ts.factory.createParenthesizedExpression(result.transformed[0] as ts.Expression);
}

/**
 * Rewrite the map-callback body into the auxiliary component's body: inline every
 * node-helper call, and rewrite each `<helper>(children, …rest)` self-recursion
 * into `(children).map((child, index) => <AuxTag … />)`.
 */
function buildAuxBody(shape: HelperShape, auxName: string): ts.Statement[] {
  const transformExpr = (root: ts.Block): ts.Block => {
    const result = ts.transform(root, [
      (context) => (node) => {
        const visit = (current: ts.Node): ts.Node => {
          if (ts.isCallExpression(current) && ts.isIdentifier(current.expression)) {
            const name = current.expression.text;
            const helper = shape.nodeHelpers.get(name);
            if (helper !== undefined) {
              return inlineArrow(helper, current.arguments);
            }
            if (name === shape.helperName) {
              const [childrenArg, ...restArgs] = current.arguments;
              const attributes: { name: string; expr: ts.Expression }[] = [
                { name: 'item', expr: ts.factory.createIdentifier('child') },
              ];
              if (shape.indexParam !== undefined) {
                attributes.push({ name: shape.indexParam, expr: ts.factory.createIdentifier('index') });
              }
              shape.restParams.forEach((parameter, index) => {
                if (ts.isIdentifier(parameter.name) && restArgs[index] !== undefined) {
                  attributes.push({ name: parameter.name.text, expr: restArgs[index] });
                }
              });
              attributes.push(...sharedAttrs(shape));
              return buildMap(childrenArg, 'child', 'index', buildAuxTag(auxName, attributes));
            }
          }
          return ts.visitEachChild(current, visit, context);
        };
        return ts.visitNode(node, visit) as ts.Block;
      },
    ]);
    return result.transformed[0];
  };

  // `shape.callbackBody` is a block (leading consts + a returned `<li>`); rewrite it.
  const block = transformExpr(shape.callbackBody as ts.Block);
  return [...block.statements];
}

/** The aux prop interface members: the item/index, the helper's rest params, and the captured handlers. */
function buildPropMembers(shape: HelperShape, sourceFile: ts.SourceFile): string[] {
  const members: string[] = [`  item: ${printNode(shape.elementType, sourceFile)};`];
  if (shape.indexParam !== undefined) {
    members.push(`  ${shape.indexParam}: number;`);
  }
  for (const parameter of shape.restParams) {
    members.push(
      `  ${(parameter.name as ts.Identifier).text}: ${printNode(parameter.type as ts.TypeNode, sourceFile)};`,
    );
  }
  for (const fn of shape.capturedFns) {
    members.push(`  ${fn.name}: ${printNode(fn.type, sourceFile)};`);
  }
  return members;
}

/** The destructured prop names, in declaration order. */
function propNames(shape: HelperShape): string[] {
  const names = ['item'];
  if (shape.indexParam !== undefined) {
    names.push(shape.indexParam);
  }
  names.push(...shape.restParams.map((parameter) => (parameter.name as ts.Identifier).text));
  names.push(...shape.capturedFns.map((fn) => fn.name));
  return names;
}

/**
 * Import declarations to carry into the auxiliary module: the co-located style
 * default-imports it references, and any type-only imports for the types its
 * props reference (`MenuNode`, …).
 */
function carriedImports(sourceFile: ts.SourceFile, bodyText: string, membersText: string): string[] {
  const lines: string[] = [];
  const usedText = `${bodyText}\n${membersText}`;
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause === undefined) {
      continue;
    }
    const specifier = ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : '';
    // A style default-import (`import styles from './x.module.scss'`) used in the body.
    const defaultName = statement.importClause.name?.text;
    if (defaultName !== undefined && /\.(scss|css|sass|less)$/.test(specifier)) {
      if (new RegExp(`\\b${defaultName}\\b`).test(usedText)) {
        lines.push(printNode(statement, sourceFile));
      }
      continue;
    }
    // A named type import whose bindings the aux props reference.
    const bindings = statement.importClause.namedBindings;
    if (bindings !== undefined && ts.isNamedImports(bindings)) {
      const used = bindings.elements.some((element) => new RegExp(`\\b${element.name.text}\\b`).test(usedText));
      if (used && specifier !== '@mission-platform/jsx') {
        lines.push(printNode(statement, sourceFile));
      }
    }
  }
  return lines;
}

/**
 * Type declarations to carry into the auxiliary module: top-level `interface` /
 * `type` declarations authored **locally** in the parent module (e.g. a
 * `MenuNode` item type) that the aux's props or body reference. Unlike
 * {@link carriedImports}, these are declared — not imported — in the source, so
 * the extracted aux would otherwise fail to resolve them. Referenced types are
 * collected transitively (a carried type may reference further local types) and
 * emitted in source order so their own inter-references stay valid.
 */
function carriedLocalTypes(sourceFile: ts.SourceFile, usedText: string): string[] {
  const declarations = new Map<string, { text: string; order: number }>();
  let order = 0;
  for (const statement of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      declarations.set(statement.name.text, { text: printNode(statement, sourceFile), order: order++ });
    }
  }
  const selected = new Set<string>();
  const references = (text: string): void => {
    for (const [name, declaration] of declarations) {
      if (!selected.has(name) && new RegExp(`\\b${name}\\b`).test(text)) {
        selected.add(name);
        // A newly-selected declaration may itself reference further local types.
        references(declaration.text);
      }
    }
  };
  references(usedText);
  return [...selected]
    .map((name) => declarations.get(name) as { text: string; order: number })
    .sort((a, b) => a.order - b.order)
    .map((declaration) => declaration.text);
}

/**
 * Detect and rewrite a self-recursive, state-capturing render helper into a
 * parent + auxiliary component pair, or return `undefined` (keep the fallback).
 */
export function trySynthesizeRecursiveHelper(
  sourceFile: ts.SourceFile,
  component: ts.FunctionDeclaration,
  componentName: string,
  componentFolders?: ReadonlySet<string>,
): SynthesizedRecursiveHelper | undefined {
  const shape = detectHelper(component);
  if (shape === undefined) {
    return undefined;
  }
  // Find the helper invocation in the returned tree (`renderItems(items, '', false)`).
  const invocation = findInvocation(component, shape.helperName);
  if (invocation === undefined) {
    return undefined;
  }

  const { auxName, auxBase } = pickAuxNames(componentName, componentFolders);

  // --- Auxiliary component source ---------------------------------------------
  const auxStatements = buildAuxBody(shape, auxName).map((statement) => printNode(statement, sourceFile));
  const bodyText = auxStatements.map((line) => `  ${line}`).join('\n');
  const members = buildPropMembers(shape, sourceFile);
  const membersText = members.join('\n');
  const imports = carriedImports(sourceFile, bodyText, membersText);
  const localTypes = carriedLocalTypes(sourceFile, `${bodyText}\n${membersText}`);
  const auxSource = [
    "import { h, type MpElement, type MpProperties } from '@mission-platform/jsx';",
    ...imports,
    '',
    ...(localTypes.length > 0 ? [...localTypes, ''] : []),
    `export interface ${auxName}Properties extends MpProperties {`,
    membersText,
    '}',
    '',
    `export function ${auxName}(properties: ${auxName}Properties): MpElement {`,
    `  const { ${propNames(shape).join(', ')} } = properties;`,
    bodyText,
    '}',
    '',
  ].join('\n');

  // --- Rewritten parent source ------------------------------------------------
  const [entriesArg, ...restArgs] = invocation.arguments;
  const parentAttributes: { name: string; expr: ts.Expression }[] = [
    { name: 'item', expr: ts.factory.createIdentifier(shape.itemParam) },
  ];
  if (shape.indexParam !== undefined) {
    parentAttributes.push({ name: shape.indexParam, expr: ts.factory.createIdentifier(shape.indexParam) });
  }
  shape.restParams.forEach((parameter, index) => {
    if (ts.isIdentifier(parameter.name) && restArgs[index] !== undefined) {
      parentAttributes.push({ name: parameter.name.text, expr: restArgs[index] });
    }
  });
  parentAttributes.push(...sharedAttrs(shape));
  const parentMap = buildMap(
    entriesArg,
    shape.itemParam,
    shape.indexParam ?? 'index',
    buildAuxTag(auxName, parentAttributes),
  );

  const removeNames = new Set<string>([shape.helperName, ...shape.nodeHelpers.keys()]);
  const rewritten = ts.transform(sourceFile, [
    (context) => (root) => {
      const visit = (node: ts.Node): ts.Node | undefined => {
        // Drop the helper/​node-helper const declarations.
        if (ts.isVariableStatement(node)) {
          const declaration = node.declarationList.declarations[0];
          if (
            declaration !== undefined &&
            ts.isIdentifier(declaration.name) &&
            removeNames.has(declaration.name.text)
          ) {
            return undefined;
          }
        }
        // Replace the helper invocation with the parent's `<AuxTag>` map.
        if (node === invocation) {
          return parentMap;
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(root, visit) as ts.SourceFile;
    },
  ]);
  const parentPrinted = printNode(rewritten.transformed[0], sourceFile);
  const parentSource = `import { ${auxName} } from './${auxBase}';\n${parentPrinted}`;

  return { parentSource, auxName, auxBase, auxSource };
}

/** Find a top-level `<helperName>(…)` call inside the component's returned tree. */
function findInvocation(component: ts.FunctionDeclaration, helperName: string): ts.CallExpression | undefined {
  let invocation: ts.CallExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (invocation !== undefined) {
      return;
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === helperName) {
      invocation = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  if (component.body !== undefined) {
    for (const statement of component.body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression !== undefined) {
        visit(statement.expression);
      }
    }
  }
  return invocation;
}
