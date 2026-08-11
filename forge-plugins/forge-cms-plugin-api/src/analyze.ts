/**
 * Component analysis shared by every CMS target.
 *
 * {@link analyzeContentComponent} reads a neutral component module and maps its
 * props interface onto the platform-neutral content model: each prop is
 * classified (see `classify.ts`), its JSDoc becomes the field `description`,
 * and the `properties.x ?? <literal>` / `{ x = <literal> }` defaults become
 * `defaultValue`. The default slot (a component's `children`) and the `MpChild`
 * named-slot props become `children` fields.
 *
 * The optional {@link SemanticModule} is only consulted to decide whether the
 * component is *interactive* — i.e. whether a target must hydrate it with a
 * real framework island rather than render it statically.
 */
import {
  findComponentFunction,
  isSlotElement,
  readSlotName,
} from "@mission-platform/vite-plugin-forge/compiler/ast.js";
import ts from "typescript";

import { classifyType, collectTypeAliases } from "./classify.js";
import { toDisplayName, toTechnicalName } from "./names.js";

import type { ClassifiedFieldKind } from "./classify.js";
import type {
  ContentComponent,
  ContentComponentNames,
  ContentComponentNamesInput,
  ContentDefaultValue,
  ContentField,
  ContentFieldKind,
} from "./content-model.js";
import type { SemanticModule } from "@mission-platform/forge-plugin-api";

/** The field key the default slot (a component's `children`) is exposed under. */
export const DEFAULT_SLOT_FIELD = "content";

/** The JSDoc tag that promotes a prop to a site-wide CMS setting. */
export const CMS_SETTING_TAG = "cmsSetting";

/** The first JSDoc description attached to a node, trimmed (`undefined` when absent). */
function jsDocumentDescription(node: ts.Node): string | undefined {
  const jsDocument = ts
    .getJSDocCommentsAndTags(node)
    .find((entry): entry is ts.JSDoc => ts.isJSDoc(entry));
  if (jsDocument === undefined) {
    return undefined;
  }
  const text =
    typeof jsDocument.comment === "string"
      ? jsDocument.comment
      : ts.getTextOfJSDocComment(jsDocument.comment);
  const trimmed = text?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

/** Whether a node carries the `@cmsSetting` JSDoc tag. */
function hasCmsSettingTag(node: ts.Node): boolean {
  return ts
    .getJSDocCommentsAndTags(node)
    .some(
      (entry) =>
        ts.isJSDoc(entry) &&
        (entry.tags ?? []).some((tag) => tag.tagName.text === CMS_SETTING_TAG),
    );
}

/** The literal value of an expression, if it is a string/number/boolean literal. */
function literalValue(
  expression: ts.Expression,
): ContentDefaultValue | undefined {
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
): Map<string, ContentDefaultValue> {
  const defaults = new Map<string, ContentDefaultValue>();
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
        if (
          ts.isIdentifier(element.name) &&
          element.initializer !== undefined
        ) {
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
function usesDefaultSlot(
  sourceFile: ts.SourceFile,
  propertiesParameterName: string,
): boolean {
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
      node.name.text === "children"
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return found;
}

/** Every named `<Slot name="…" />` the component renders, in source order. */
function namedSlots(sourceFile: ts.SourceFile): string[] {
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (isSlotElement(node)) {
      const name = readSlotName(node);
      if (name !== undefined && !names.includes(name)) {
        names.push(name);
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return names;
}

/** The props parameter name of a component function (defaults to `properties`). */
function propertiesParameterName(
  component: ts.FunctionDeclaration | undefined,
): string {
  const parameter = component?.parameters[0];
  return parameter !== undefined && ts.isIdentifier(parameter.name)
    ? parameter.name.text
    : "properties";
}

/** The verbatim source text of a node, without relying on parent pointers. */
function nodeText(sourceFile: ts.SourceFile, node: ts.Node): string {
  return sourceFile.text.slice(node.pos, node.end).trim();
}

/** A writable view of a readonly record, used while a field is being assembled. */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** Build one neutral content field from its classified kind and surrounding facts. */
function buildField(
  property: string,
  kind: ContentFieldKind,
  position: number,
  tsType: string,
  description: string | undefined,
  defaultValue: ContentDefaultValue | undefined,
  required: boolean,
  setting: boolean,
  slotName: string | undefined,
): ContentField {
  const isSlot = kind.kind === "children";
  const field: Mutable<ContentField> = {
    prop: property,
    position,
    kind,
    tsType,
    required,
    translatable: kind.kind === "text" || kind.kind === "richtext",
    isSlot,
    setting,
  };
  if (description !== undefined) {
    field.description = description;
  }
  if (!isSlot && defaultValue !== undefined) {
    field.defaultValue = defaultValue;
  }
  if (slotName !== undefined) {
    field.slotName = slotName;
  }
  return field;
}

/** Derive the full name set from the caller-supplied subset. */
export function deriveContentComponentNames(
  names: ContentComponentNamesInput,
): ContentComponentNames {
  return {
    neutralName: names.neutralName,
    publicName: names.publicName,
    technicalName: toTechnicalName(names.publicName),
    displayName: toDisplayName(names.publicName),
    folder:
      names.folder ?? toTechnicalName(names.neutralName).replaceAll("_", "-"),
    propertiesType: names.propertiesType,
  };
}

/** True when the neutral IR carries behaviour that only a real runtime can provide. */
export function isInteractiveModule(
  semantic: SemanticModule | undefined,
): boolean {
  if (semantic === undefined) {
    return false;
  }
  const { state, refs, effects, events } = semantic.intentions;
  return (
    state.length > 0 ||
    refs.length > 0 ||
    effects.length > 0 ||
    events.length > 0
  );
}

/**
 * Analyse a neutral component module, returning its platform-neutral content
 * model: ordered authorable fields, the slots it renders, and whether it needs
 * a hydrated runtime.
 */
export function analyzeContentComponent(
  sourceFile: ts.SourceFile,
  names: ContentComponentNamesInput,
  semantic?: SemanticModule,
): ContentComponent {
  const resolved = deriveContentComponentNames(names);
  const component = findComponentFunction(sourceFile, resolved.neutralName);
  const parameterName = propertiesParameterName(component);
  const aliases = collectTypeAliases(sourceFile);
  const defaults =
    component === undefined
      ? new Map<string, ContentDefaultValue>()
      : extractDefaults(component, parameterName);

  const fields: ContentField[] = [];
  let position = 0;

  if (resolved.propertiesType !== undefined) {
    for (const statement of sourceFile.statements) {
      if (
        !ts.isInterfaceDeclaration(statement) ||
        statement.name.text !== resolved.propertiesType
      ) {
        continue;
      }
      for (const member of statement.members) {
        if (
          !ts.isPropertySignature(member) ||
          !ts.isIdentifier(member.name) ||
          member.type === undefined
        ) {
          continue;
        }
        const property = member.name.text;
        if (property === "children") {
          continue;
        }
        const kind: ClassifiedFieldKind = classifyType(member.type, aliases);
        if (kind === undefined) {
          continue;
        }
        fields.push(
          buildField(
            property,
            kind,
            position,
            nodeText(sourceFile, member.type),
            jsDocumentDescription(member),
            defaults.get(property),
            member.questionToken === undefined,
            hasCmsSettingTag(member),
            kind.kind === "children" ? property : undefined,
          ),
        );
        position += 1;
      }
    }
  }

  // The default slot (`children`) is exposed as a trailing nested-content field.
  const hasDefaultSlot = usesDefaultSlot(sourceFile, parameterName);
  if (
    hasDefaultSlot &&
    !fields.some((entry) => entry.prop === DEFAULT_SLOT_FIELD)
  ) {
    fields.push(
      buildField(
        DEFAULT_SLOT_FIELD,
        { kind: "children" },
        position,
        "MpChild[]",
        undefined,
        undefined,
        false,
        false,
        "default",
      ),
    );
  }

  const slots = [...namedSlots(sourceFile)];
  for (const field of fields) {
    if (
      field.slotName !== undefined &&
      field.slotName !== "default" &&
      !slots.includes(field.slotName)
    ) {
      slots.push(field.slotName);
    }
  }
  if (hasDefaultSlot && !slots.includes("default")) {
    slots.push("default");
  }

  return {
    names: resolved,
    fields,
    slots,
    interactive: isInteractiveModule(semantic),
  };
}
