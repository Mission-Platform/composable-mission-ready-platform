/**
 * Component analysis for the Storyblok emitter.
 *
 * {@link analyzeStoryblokComponent} reads a neutral component module and maps its
 * props interface onto a Storyblok `schema`: each prop is classified (see
 * `classify.ts`), its JSDoc becomes the field `description`, and the
 * `properties.x ?? <literal>` / `{ x = <literal> }` defaults become
 * `default_value`. The default slot / `MpChild` named-slot props become nestable
 * `bloks` fields. It returns both the Storyblok *component object* and the
 * per-field metadata the wrapper emitter needs.
 */
import ts from 'typescript';

import { findComponentFunction, isSlotElement, readSlotName } from '../../compiler/ast.js';

import { classifyType, collectTypeAliases } from './classify.js';
import { toDisplayName, toTechnicalName } from './names.js';

import type {
  AnalyzedField,
  AnalyzedStoryblokComponent,
  DefaultValue,
  FieldKind,
  StoryblokComponent,
  StoryblokComponentNames,
  StoryblokSchemaField,
} from './types.js';

/** The schema field key the default slot (a component's `children`) is exposed under. */
const DEFAULT_SLOT_FIELD = 'content';

/** The first JSDoc description attached to a node, trimmed (`undefined` when absent). */
function jsDocumentDescription(node: ts.Node): string | undefined {
  const jsDocument = ts.getJSDocCommentsAndTags(node).find((entry): entry is ts.JSDoc => ts.isJSDoc(entry));
  if (jsDocument === undefined) {
    return undefined;
  }
  const text =
    typeof jsDocument.comment === 'string' ? jsDocument.comment : ts.getTextOfJSDocComment(jsDocument.comment);
  const trimmed = text?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

/** The literal value of an expression, if it is a string/number/boolean literal. */
function literalValue(expression: ts.Expression): DefaultValue | undefined {
  if (ts.isStringLiteralLike(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) {
    return Number(expression.text);
  }
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (expression.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (
    ts.isPrefixUnaryExpression(expression) &&
    expression.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(expression.operand)
  ) {
    return -Number(expression.operand.text);
  }
  return undefined;
}

/** Extract each prop's default value from a component body (`?? lit` and `{ x = lit }`). */
function extractDefaults(
  component: ts.FunctionDeclaration,
  propertiesParameterName: string,
): Map<string, DefaultValue> {
  const defaults = new Map<string, DefaultValue>();
  const visit = (node: ts.Node): void => {
    // `const { x = 'v' } = properties` destructuring defaults.
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer !== undefined &&
      ts.isIdentifier(node.initializer) &&
      node.initializer.text === propertiesParameterName
    ) {
      for (const element of node.name.elements) {
        if (ts.isIdentifier(element.name) && element.initializer !== undefined) {
          const value = literalValue(element.initializer);
          if (value !== undefined && !defaults.has(element.name.text)) {
            defaults.set(element.name.text, value);
          }
        }
      }
    }

    // `properties.x ?? 'v'` fallback defaults.
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken &&
      ts.isPropertyAccessExpression(node.left) &&
      ts.isIdentifier(node.left.expression) &&
      node.left.expression.text === propertiesParameterName
    ) {
      const value = literalValue(node.right);
      if (value !== undefined && !defaults.has(node.left.name.text)) {
        defaults.set(node.left.name.text, value);
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(component.body ?? component);
  return defaults;
}

/** Whether the component renders the default slot (`properties.children` or a nameless `<Slot/>`). */
function usesDefaultSlot(sourceFile: ts.SourceFile, propertiesParameterName: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (isSlotElement(node) && readSlotName(node) === undefined) {
      found = true;
      return;
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === propertiesParameterName &&
      node.name.text === 'children'
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return found;
}

/** The props parameter name of a component function (defaults to `properties`). */
function propertiesParameterName(component: ts.FunctionDeclaration | undefined): string {
  const parameter = component?.parameters[0];
  return parameter !== undefined && ts.isIdentifier(parameter.name) ? parameter.name.text : 'properties';
}

/** Build a single schema field from its kind, position, JSDoc, default and optionality. */
function buildField(
  kind: Exclude<FieldKind, undefined>,
  pos: number,
  description: string | undefined,
  defaultValue: DefaultValue | undefined,
  required: boolean,
): StoryblokSchemaField {
  const field: StoryblokSchemaField = { type: kind.type, pos };
  if (description !== undefined) {
    field.description = description;
  }
  if (kind.type === 'text') {
    field.translatable = true;
  }
  if (kind.type === 'option') {
    field.options = kind.options.map((value) => ({ name: value, value }));
  }
  if (kind.type !== 'bloks' && defaultValue !== undefined) {
    field.default_value = kind.type === 'option' || kind.type === 'text' ? String(defaultValue) : defaultValue;
  }
  if (required) {
    field.required = true;
  }
  return field;
}

/**
 * Analyse a neutral component module for Storyblok, returning both its component
 * object and the per-field metadata the wrapper emitter needs.
 */
export function analyzeStoryblokComponent(
  sourceFile: ts.SourceFile,
  names: StoryblokComponentNames,
): AnalyzedStoryblokComponent {
  const component = findComponentFunction(sourceFile, names.neutralName);
  const propertiesParameterName_ = propertiesParameterName(component);
  const aliases = collectTypeAliases(sourceFile);
  const defaults =
    component === undefined ? new Map<string, DefaultValue>() : extractDefaults(component, propertiesParameterName_);

  const fields: AnalyzedField[] = [];
  let pos = 0;

  if (names.propertiesType !== undefined) {
    for (const statement of sourceFile.statements) {
      if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== names.propertiesType) {
        continue;
      }
      for (const member of statement.members) {
        if (!ts.isPropertySignature(member) || !ts.isIdentifier(member.name) || member.type === undefined) {
          continue;
        }
        const property = member.name.text;
        if (property === 'children') {
          continue;
        }
        const kind = classifyType(member.type, aliases);
        if (kind === undefined) {
          continue;
        }
        const required = member.questionToken === undefined;
        const field = buildField(kind, pos, jsDocumentDescription(member), defaults.get(property), required);
        fields.push({
          prop: property,
          field,
          isSlot: kind.type === 'bloks',
          slotName: kind.type === 'bloks' ? property : undefined,
        });
        pos += 1;
      }
    }
  }

  // The default slot (`children`) is exposed as a trailing nestable `bloks` field.
  if (
    usesDefaultSlot(sourceFile, propertiesParameterName_) &&
    !fields.some((entry) => entry.prop === DEFAULT_SLOT_FIELD)
  ) {
    fields.push({
      prop: DEFAULT_SLOT_FIELD,
      field: { type: 'bloks', pos },
      isSlot: true,
      slotName: 'default',
    });
  }

  const schema: Record<string, StoryblokSchemaField> = {};
  for (const entry of fields) {
    schema[entry.prop] = entry.field;
  }

  const technicalName = toTechnicalName(names.publicName);
  const component_object: StoryblokComponent = {
    name: technicalName,
    display_name: toDisplayName(names.publicName),
    schema,
    is_root: false,
    is_nestable: true,
    real_name: technicalName,
    color: null,
    icon: null,
    preview_field: null,
    preview_tmpl: null,
    component_group_uuid: null,
  };

  return { component: component_object, fields };
}

/** Emit only the Storyblok component object (the blok configuration) for a component. */
export function emitStoryblokComponent(sourceFile: ts.SourceFile, names: StoryblokComponentNames): StoryblokComponent {
  return analyzeStoryblokComponent(sourceFile, names).component;
}
