/**
 * Body analysis for the Vue emitter — building the {@link RewriteScope}.
 *
 * Before the body can be rewritten, the emitter needs to know which identifiers
 * are destructured props, reactive state (`useState`), refs (`useRef`) or memos
 * (`useMemo`), so references to them are rewritten correctly. {@link
 * analyseScope} performs that first read-only pass.
 */
import ts from 'typescript';

import { type RewriteScope } from '../../compiler/ast.js';

import { singleDeclaration } from './shared.js';

/** Collect the hook/destructuring metadata into a {@link RewriteScope}. */
export function analyseScope(
  body: ts.Block,
  propertiesParameterName: string,
  styleModuleNames: Set<string>,
): RewriteScope {
  const scope: RewriteScope = {
    propsParamName: propertiesParameterName,
    destructuredProps: new Set(),
    stateNames: new Set(),
    setterToState: new Map(),
    refNames: new Set(),
    memoNames: new Set(),
    styleModuleNames,
  };

  for (const statement of body.statements) {
    const declaration = singleDeclaration(statement);
    if (declaration === undefined) {
      continue;
    }

    // `const { … } = properties` → destructured props.
    if (
      ts.isObjectBindingPattern(declaration.name) &&
      declaration.initializer !== undefined &&
      ts.isIdentifier(declaration.initializer) &&
      declaration.initializer.text === propertiesParameterName
    ) {
      for (const element of declaration.name.elements) {
        if (ts.isIdentifier(element.name)) {
          scope.destructuredProps.add(element.name.text);
        }
      }
      continue;
    }

    if (declaration.initializer === undefined || !ts.isCallExpression(declaration.initializer)) {
      continue;
    }
    const callee = declaration.initializer.expression;
    if (!ts.isIdentifier(callee)) {
      continue;
    }

    // `const [value, setValue] = useState(…)`
    if (
      callee.text === 'useState' &&
      ts.isArrayBindingPattern(declaration.name) &&
      declaration.name.elements.length === 2
    ) {
      const [valueElement, setterElement] = declaration.name.elements;
      if (
        ts.isBindingElement(valueElement) &&
        ts.isIdentifier(valueElement.name) &&
        ts.isBindingElement(setterElement) &&
        ts.isIdentifier(setterElement.name)
      ) {
        scope.stateNames.add(valueElement.name.text);
        scope.setterToState.set(setterElement.name.text, valueElement.name.text);
      }
      continue;
    }

    if (!ts.isIdentifier(declaration.name)) {
      continue;
    }
    // `const ref = useRef(…)`
    if (callee.text === 'useRef') {
      scope.refNames.add(declaration.name.text);
    }
    // `const memo = useMemo(…)`
    if (callee.text === 'useMemo') {
      scope.memoNames.add(declaration.name.text);
    }
  }

  return scope;
}
