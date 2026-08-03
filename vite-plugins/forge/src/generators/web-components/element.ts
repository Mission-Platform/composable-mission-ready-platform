/**
 * Component-function → `LitElement` class synthesis for the Web-Components target.
 *
 * A neutral component is a function of its props returning JSX. Lit models a
 * component as a class, so this pass (all AST-driven) lifts the function into a
 * `LitElement` subclass:
 * - every `properties.<name>` read becomes a reactive **property** (`this.name`),
 * - every `useState` binding becomes a reactive **state** field, its setter an
 *   assignment (`setX(v)` → `this.x = v`),
 * - the remaining body statements become the head of `render()`, and
 * - the returned JSX becomes a lit-html `html\`…\`` template (see `./template`).
 */
import ts from 'typescript';

import { findComponentFunction } from '../../compiler/ast.js';

import { isNameNotRead, jsxToLitTemplate, kebabCase, printWithJsxConverted, type TemplateContext } from './template.js';

/** A `useState` binding lifted to a reactive state field. */
interface StateField {
  getter: string;
  setter: string;
  initializer: ts.Expression | undefined;
}

/** Collect `properties.<name>` reads (the reactive properties) from a component function. */
function collectPropertyNames(fn: ts.FunctionDeclaration, propsParam: string): Set<string> {
  const names = new Set<string>();
  const walk = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === propsParam
    ) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, walk);
  };
  if (fn.body) {
    walk(fn.body);
  }
  return names;
}

/** Collect `const [x, setX] = useState(init)` bindings from a component function. */
function collectStateFields(fn: ts.FunctionDeclaration): StateField[] {
  const fields: StateField[] = [];
  const walk = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === 'useState' &&
      ts.isArrayBindingPattern(node.name)
    ) {
      const [first, second] = node.name.elements;
      if (
        first &&
        ts.isBindingElement(first) &&
        ts.isIdentifier(first.name) &&
        second &&
        ts.isBindingElement(second) &&
        ts.isIdentifier(second.name)
      ) {
        fields.push({
          getter: first.name.text,
          setter: second.name.text,
          initializer: node.initializer.arguments[0],
        });
      }
    }
    ts.forEachChild(node, walk);
  };
  if (fn.body) {
    walk(fn.body);
  }
  return fields;
}

/** Whether a statement is a `useState`/`useRef`/`useMemo`/`useEffect` declaration that is lifted out of `render()`. */
function isHookDeclaration(statement: ts.Statement): boolean {
  if (!ts.isVariableStatement(statement)) {
    return false;
  }
  return statement.declarationList.declarations.some(
    (declaration) =>
      declaration.initializer &&
      ts.isCallExpression(declaration.initializer) &&
      ts.isIdentifier(declaration.initializer.expression) &&
      ['useState', 'useRef', 'useMemo'].includes(declaration.initializer.expression.text),
  );
}

/** Synthesise the `LitElement` class + registration source for a neutral component. */
export function synthesiseElementClass(
  sourceFile: ts.SourceFile,
  componentName: string,
  componentFolders: ReadonlySet<string>,
): string {
  const fn = findComponentFunction(sourceFile, componentName);
  if (fn === undefined || fn.body === undefined) {
    // No recognisable component function — emit an empty element so the module stays valid.
    const tag = kebabCase(componentName);
    return [
      `export class ${componentName}Element extends LitElement {`,
      '  render() {',
      '    return html`<slot></slot>`;',
      '  }',
      '}',
      `if (!customElements.get('${tag}')) {`,
      `  customElements.define('${tag}', ${componentName}Element);`,
      '}',
    ].join('\n');
  }

  const factory = ts.factory;
  const parameter = fn.parameters[0];
  const propsParam = parameter && ts.isIdentifier(parameter.name) ? parameter.name.text : 'properties';

  const propertyNames = collectPropertyNames(fn, propsParam);
  propertyNames.delete('children');
  const stateFields = collectStateFields(fn);
  const stateGetters = new Set(stateFields.map((field) => field.getter));
  const setterToGetter = new Map(stateFields.map((field) => [field.setter, field.getter]));

  // Names that must resolve to `this.` inside the render body: props + state.
  const scoped = new Set<string>([...propertyNames, ...stateGetters]);

  // Rewrite the render-body statements: `properties.x` → `this.x`, `x`/`setX`
  // (state) → `this.x` / `this.x = …`.
  const bodyTransformer = (context: ts.TransformationContext): ts.Transformer<ts.Node> => {
    const visit = (node: ts.Node): ts.Node => {
      // `setX(value)` → `this.x = value`.
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && setterToGetter.has(node.expression.text)) {
        const getter = setterToGetter.get(node.expression.text)!;
        const argument = node.arguments[0]
          ? (ts.visitNode(node.arguments[0], visit) as ts.Expression)
          : factory.createIdentifier('undefined');
        return factory.createBinaryExpression(
          factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier(getter)),
          factory.createToken(ts.SyntaxKind.EqualsToken),
          argument,
        );
      }
      // `properties.x` → `this.x`.
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === propsParam
      ) {
        return factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier(node.name.text));
      }
      // `{ x }` shorthand (state) → `{ x: this.x }`: the bare identifier is both
      // the key *and* the value read, so it can't simply become `this.x` (that
      // would print the invalid `{ this.x }`) — expand it to a regular property.
      if (ts.isShorthandPropertyAssignment(node) && stateGetters.has(node.name.text)) {
        return factory.createPropertyAssignment(
          node.name,
          factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier(node.name.text)),
        );
      }
      // bare state read `x` → `this.x` (not when it is a property/binding name).
      if (ts.isIdentifier(node) && stateGetters.has(node.text) && !isNameNotRead(node)) {
        return factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier(node.text));
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };

  // The render body: every statement of the function body except the lifted
  // hook declarations and the final return; the return's JSX becomes the template.
  const statements = fn.body.statements;
  const headStatements = statements.filter(
    (statement) => !isHookDeclaration(statement) && !ts.isReturnStatement(statement),
  );
  const returnStatement = statements.find((statement): statement is ts.ReturnStatement =>
    ts.isReturnStatement(statement),
  );

  const printer = ts.createPrinter();
  const templateContext: TemplateContext = { factory, scoped, componentFolders };

  // Non-return head statements may themselves contain JSX at any depth (an
  // `if`/`switch` guard with an early `return <jsx/>`, a `const` bound to a
  // `.map(...)` of JSX, …); scope their identifiers to `this.` and convert
  // every JSX node they carry to a lit-html template, so no raw JSX survives
  // into the plain-TypeScript `render()` body.
  const renderHead = headStatements
    .map((statement) => `    ${printWithJsxConverted(statement, templateContext, [bodyTransformer])}`)
    .join('\n');

  let template = '<slot></slot>';
  if (returnStatement?.expression !== undefined) {
    const expression = ts.isParenthesizedExpression(returnStatement.expression)
      ? returnStatement.expression.expression
      : returnStatement.expression;
    if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression) || ts.isJsxFragment(expression)) {
      template = jsxToLitTemplate(expression, templateContext);
    }
  }

  const tag = kebabCase(componentName);
  const lines: string[] = [`export class ${componentName}Element extends LitElement {`];

  // Reactive property + state declarations.
  const staticProps: string[] = [];
  for (const name of propertyNames) {
    staticProps.push(`    ${name}: {},`);
  }
  for (const field of stateFields) {
    staticProps.push(`    ${field.getter}: { state: true },`);
  }
  if (staticProps.length > 0) {
    lines.push('  static properties = {');
    lines.push(...staticProps);
    lines.push('  };');
  }
  for (const name of propertyNames) {
    lines.push(`  ${name}: any;`);
  }
  for (const field of stateFields) {
    const init =
      field.initializer !== undefined
        ? printer.printNode(ts.EmitHint.Expression, field.initializer, sourceFile)
        : 'undefined';
    lines.push(`  ${field.getter}: any = ${init};`);
  }

  lines.push('');
  lines.push('  render() {');
  if (renderHead.length > 0) {
    lines.push(renderHead);
  }
  lines.push(`    return html\`${template}\`;`);
  lines.push('  }');
  lines.push('}');
  lines.push(`if (!customElements.get('${tag}')) {`);
  lines.push(`  customElements.define('${tag}', ${componentName}Element);`);
  lines.push('}');

  return lines.join('\n');
}
