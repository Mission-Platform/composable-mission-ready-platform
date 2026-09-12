import { oxcArray, oxcIdentifierName, oxcObject, oxcProgramBody, type OxcNode, type OxcParsedModule } from './oxc.js';

const SLOT_TAG = 'Slot';

/** Whether an Oxc node is a neutral named-slot element. */
export function isSlotElement(node: OxcNode): boolean {
  if (node.type === 'JSXSelfClosingElement' || node.type === 'JSXOpeningElement') {
    return oxcIdentifierName(oxcObject(node, 'name')) === SLOT_TAG;
  }
  if (node.type === 'JSXElement') {
    const opening = oxcObject(node, 'openingElement');
    return opening !== undefined && oxcIdentifierName(oxcObject(opening, 'name')) === SLOT_TAG;
  }
  return false;
}

/** Read the static `name="…"` of an Oxc `<Slot>` element. */
export function readSlotName(node: OxcNode): string | undefined {
  const opening = node.type === 'JSXElement' ? oxcObject(node, 'openingElement') : node;
  if (opening === undefined) return undefined;

  for (const attribute of oxcArray(opening, 'attributes')) {
    if (attribute.type !== 'JSXAttribute' || oxcIdentifierName(oxcObject(attribute, 'name')) !== 'name') continue;
    const value = oxcObject(attribute, 'value');
    if (value === undefined) return undefined;
    if (typeof value.value === 'string') return value.value;
    const expression = oxcObject(value, 'expression');
    if (typeof expression?.value === 'string') return expression.value;
  }
  return undefined;
}

/** Find an exported Oxc function declaration for a neutral component by name. */
export function findComponentFunction(sourceFile: OxcParsedModule, name: string): OxcNode | undefined {
  for (const statement of oxcProgramBody(sourceFile.program)) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
        ? (oxcObject(statement, 'declaration') ?? statement)
        : statement;
    if (declaration?.type === 'FunctionDeclaration' && oxcIdentifierName(oxcObject(declaration, 'id')) === name) {
      return declaration;
    }
  }
  return undefined;
}
