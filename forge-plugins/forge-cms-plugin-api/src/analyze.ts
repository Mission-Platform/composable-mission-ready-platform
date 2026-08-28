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
  isOxcNode,
  oxcArray,
  oxcIdentifierName,
  oxcLiteralValue,
  oxcNodeText,
  oxcObject,
  oxcProgramBody,
  oxcTypeNode,
  type OxcNode,
  type OxcParsedModule,
} from "@mission-platform/vite-plugin-forge/compiler/oxc.js";

import { classifyType, collectTypeAliases } from "./classify.js";
import { toDisplayName, toTechnicalName } from "./names.js";

import type { ClassifiedFieldKind } from "./classify.js";
import type {
  ContentComponent,
  ContentComponentMetadata,
  ContentComponentNames,
  ContentComponentNamesInput,
  ContentDefaultValue,
  ContentField,
  ContentFieldKind,
} from "./content-model.js";
import type { SemanticModule } from "@mission-platform/forge-plugin-api";

function isSlotNode(node: OxcNode): boolean {
  const opening =
    node.type === "JSXElement" ? oxcObject(node, "openingElement") : node;
  if (opening === undefined) return false;
  return (
    (node.type === "JSXElement" || node.type === "JSXSelfClosingElement") &&
    oxcIdentifierName(oxcObject(opening, "name")) === "Slot"
  );
}

function readSlotName(node: OxcNode): string | undefined {
  const opening =
    node.type === "JSXElement" ? oxcObject(node, "openingElement") : node;
  if (opening === undefined) return undefined;
  for (const attribute of oxcArray(opening, "attributes")) {
    if (
      attribute.type !== "JSXAttribute" ||
      oxcIdentifierName(oxcObject(attribute, "name")) !== "name"
    )
      continue;
    const value = oxcObject(attribute, "value");
    if (value?.type === "Literal")
      return typeof value.value === "string" ? value.value : undefined;
    if (value?.type === "JSXExpressionContainer") {
      const expression = oxcObject(value, "expression");
      return typeof oxcLiteralValue(expression) === "string"
        ? (oxcLiteralValue(expression) as string)
        : undefined;
    }
  }
  return undefined;
}

function findComponentFunction(
  module: OxcParsedModule,
  name: string,
): OxcNode | undefined {
  for (const statement of oxcProgramBody(module.program)) {
    const declaration =
      statement.type === "ExportNamedDeclaration" ||
      statement.type === "ExportDefaultDeclaration"
        ? oxcObject(statement, "declaration")
        : statement;
    if (
      declaration?.type === "FunctionDeclaration" &&
      oxcIdentifierName(oxcObject(declaration, "id")) === name
    )
      return declaration;
  }
  return undefined;
}

/** The field key the default slot (a component's `children`) is exposed under. */
export const DEFAULT_SLOT_FIELD = "content";

/** The JSDoc tag that promotes a prop to a site-wide CMS setting. */
export const CMS_SETTING_TAG = "cmsSetting";
/** The JSDoc tag that assigns a prop to an editor tab. */
export const CMS_TAB_TAG = "cmsTab";

/** The JSDoc tags for optional component-level editor metadata. */
export const CMS_ICON_TAG = "cmsIcon";
export const CMS_COLOR_TAG = "cmsColor";
/** British spelling accepted for source annotations. */
export const CMS_COLOUR_TAG = "cmsColour";

function isCommentGap(gap: string): boolean {
  return /^\s*(?:(?:export|default|declare|async)\s+)*$/.test(gap);
}

/** The first JSDoc description attached to a node, trimmed (`undefined` when absent). */
function commentsFor(module: OxcParsedModule, node: OxcNode): string[] {
  const preceding = module.comments
    .filter((comment) => comment.end <= node.start)
    .toSorted((left, right) => right.end - left.end);
  const nearest = preceding.find((comment) =>
    isCommentGap(module.source.slice(comment.end, node.start)),
  );
  if (nearest === undefined) return [];

  const associated = [nearest];
  let next = nearest;
  for (const comment of preceding.slice(preceding.indexOf(nearest) + 1)) {
    if (!/^\s*$/.test(module.source.slice(comment.end, next.start))) break;
    associated.push(comment);
    next = comment;
  }
  return associated.map((comment) =>
    comment.value
      .replaceAll(/^\s*\* ?/gm, "")
      .replaceAll(/^\s*\/\*+|\*\/\s*$/g, "")
      .trim(),
  );
}

function jsDocumentDescription(
  module: OxcParsedModule,
  node: OxcNode,
): string | undefined {
  const description = commentsFor(module, node)
    .map((comment) =>
      comment
        .split("\n")
        .filter((line) => !line.trim().startsWith("@"))
        .join("\n")
        .trim(),
    )
    .find((comment) => comment.length > 0);
  return description === undefined || description.length === 0
    ? undefined
    : description;
}

/** Whether a node carries the `@cmsSetting` JSDoc tag. */
function hasCmsSettingTag(module: OxcParsedModule, node: OxcNode): boolean {
  return commentsFor(module, node).some((comment) =>
    new RegExp(String.raw`^@${CMS_SETTING_TAG}(?:\s|$)`, "m").test(comment),
  );
}

/** Read and normalize a string-valued JSDoc tag, ignoring empty annotations. */
function jsDocumentTagValue(
  module: OxcParsedModule,
  node: OxcNode | undefined,
  tagNames: readonly string[],
): string | undefined {
  if (node === undefined) return undefined;
  for (const comment of commentsFor(module, node)) {
    for (const tagName of tagNames) {
      const match = comment.match(
        new RegExp(String.raw`^@${tagName}(?:\s*:\s*|\s+)(.+)$`, "m"),
      );
      if (match?.[1] !== undefined) return match[1].trim().replace(/^:\s*/, "");
    }
  }
  return undefined;
}

/** Extract optional component-level metadata from its function JSDoc. */
function componentMetadata(
  module: OxcParsedModule,
  component: OxcNode | undefined,
): ContentComponentMetadata | undefined {
  const icon = jsDocumentTagValue(module, component, [CMS_ICON_TAG]);
  const color = jsDocumentTagValue(module, component, [
    CMS_COLOR_TAG,
    CMS_COLOUR_TAG,
  ]);
  if (icon === undefined && color === undefined) {
    return undefined;
  }
  return {
    ...(icon === undefined ? {} : { icon }),
    ...(color === undefined ? {} : { color }),
  };
}

/** The literal value of an expression, if it is a string/number/boolean literal. */
function literalValue(
  expression: OxcNode | undefined,
): ContentDefaultValue | undefined {
  const value = oxcLiteralValue(expression);
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  if (expression?.type === "UnaryExpression" && expression.operator === "-") {
    const operand = literalValue(oxcObject(expression, "argument"));
    return typeof operand === "number" ? -operand : undefined;
  }
  return undefined;
}

/** Extract each prop's default value from a component body (`?? lit` and `{ x = lit }`). */
function extractDefaults(
  component: OxcNode,
  propertiesParameterName: string,
): Map<string, ContentDefaultValue> {
  const defaults = new Map<string, ContentDefaultValue>();
  const visit = (node: OxcNode): void => {
    // `const { x = 'v' } = properties` destructuring defaults.
    if (node.type === "VariableDeclarator") {
      const binding = oxcObject(node, "id");
      const initializer = oxcObject(node, "init");
      if (
        binding?.type === "ObjectPattern" &&
        oxcIdentifierName(initializer) === propertiesParameterName
      ) {
        for (const element of oxcArray(binding, "properties")) {
          const key = oxcObject(element, "key");
          const valueNode = oxcObject(element, "value");
          const value =
            valueNode === undefined
              ? undefined
              : literalValue(oxcObject(valueNode, "right"));
          const property = oxcIdentifierName(key);
          if (
            property !== undefined &&
            value !== undefined &&
            !defaults.has(property)
          )
            defaults.set(property, value);
        }
      }
    }

    // `properties.x ?? 'v'` fallback defaults.
    if (node.type === "LogicalExpression" && node.operator === "??") {
      const left = oxcObject(node, "left");
      const object =
        left === undefined
          ? undefined
          : oxcIdentifierName(oxcObject(left, "object"));
      const property =
        left === undefined
          ? undefined
          : oxcIdentifierName(oxcObject(left, "property"));
      const value = literalValue(oxcObject(node, "right"));
      if (
        object === propertiesParameterName &&
        property !== undefined &&
        value !== undefined &&
        !defaults.has(property)
      )
        defaults.set(property, value);
    }
    for (const child of Object.values(node)) {
      if (isOxcNode(child)) visit(child);
      else if (Array.isArray(child)) {
        for (const item of child) {
          if (isOxcNode(item)) visit(item);
        }
      }
    }
  };
  visit(oxcObject(component, "body") ?? component);
  return defaults;
}

/** Whether the component renders the default slot (`properties.children` or a nameless `<Slot/>`). */
function usesDefaultSlot(
  sourceFile: OxcParsedModule,
  propertiesParameterName: string,
): boolean {
  let found = false;
  const visit = (node: OxcNode): void => {
    if (found) {
      return;
    }
    if (isSlotNode(node) && readSlotName(node) === undefined) {
      found = true;
      return;
    }
    if (
      node.type === "MemberExpression" &&
      oxcIdentifierName(oxcObject(node, "object")) ===
        propertiesParameterName &&
      oxcIdentifierName(oxcObject(node, "property")) === "children"
    ) {
      found = true;
      return;
    }
    for (const child of Object.values(node)) {
      if (isOxcNode(child)) visit(child);
      else if (Array.isArray(child)) {
        for (const item of child) {
          if (isOxcNode(item)) visit(item);
        }
      }
    }
  };
  visit(sourceFile.program);
  return found;
}

/** Every named `<Slot name="…" />` the component renders, in source order. */
function namedSlots(sourceFile: OxcParsedModule): string[] {
  const names: string[] = [];
  const visit = (node: OxcNode): void => {
    if (isSlotNode(node)) {
      const name = readSlotName(node);
      if (name !== undefined && !names.includes(name)) {
        names.push(name);
      }
    }
    for (const child of Object.values(node)) {
      if (isOxcNode(child)) visit(child);
      else if (Array.isArray(child)) {
        for (const item of child) {
          if (isOxcNode(item)) visit(item);
        }
      }
    }
  };
  visit(sourceFile.program);
  return names;
}

/** The props parameter name of a component function (defaults to `properties`). */
function propertiesParameterName(component: OxcNode | undefined): string {
  const parameter =
    component === undefined ? undefined : oxcArray(component, "params")[0];
  return parameter !== undefined && oxcIdentifierName(parameter) !== undefined
    ? (oxcIdentifierName(parameter) as string)
    : "properties";
}

/** The verbatim source text of a node, without relying on parent pointers. */
function nodeText(sourceFile: OxcParsedModule, node: OxcNode): string {
  return oxcNodeText(sourceFile.source, node).trim();
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
  tab: string | undefined,
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
  if (tab !== undefined) {
    field.tab = tab;
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
    ...(names.sourceDir === undefined ? {} : { sourceDir: names.sourceDir }),
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
  sourceFile: OxcParsedModule,
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
    for (const statement of oxcProgramBody(sourceFile.program)) {
      const declaration =
        statement.type === "ExportNamedDeclaration"
          ? oxcObject(statement, "declaration")
          : statement;
      if (
        declaration?.type !== "TSInterfaceDeclaration" ||
        oxcIdentifierName(oxcObject(declaration, "id")) !==
          resolved.propertiesType
      )
        continue;
      const body = oxcObject(declaration, "body");
      if (body === undefined) continue;
      for (const member of oxcArray(body, "body")) {
        if (member.type !== "TSPropertySignature") continue;
        const property = oxcIdentifierName(oxcObject(member, "key"));
        const type = oxcTypeNode(oxcObject(member, "typeAnnotation"));
        if (property === undefined || type === undefined) continue;
        if (property === "children") {
          continue;
        }
        const kind: ClassifiedFieldKind = classifyType(type, aliases);
        if (kind === undefined) {
          continue;
        }
        fields.push(
          buildField(
            property,
            kind,
            position,
            nodeText(sourceFile, type),
            jsDocumentDescription(sourceFile, member),
            defaults.get(property),
            member.optional !== true,
            hasCmsSettingTag(sourceFile, member),
            jsDocumentTagValue(sourceFile, member, [CMS_TAB_TAG]),
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
        undefined,
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

  const metadata = componentMetadata(sourceFile, component);
  const analyzed: Mutable<ContentComponent> = {
    names: resolved,
    fields,
    slots,
    interactive: isInteractiveModule(semantic),
  };
  if (metadata !== undefined) {
    analyzed.metadata = metadata;
  }
  return analyzed;
}
