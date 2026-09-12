import {
  walkRenderNodes,
  type GenericComponent,
  type GenericRenderNode,
  type PropIntention,
} from "@mission-platform/forge-plugin-api";

import {
  leadingObjectPattern,
  parsePropsBinding,
  type PropsBinding,
} from "../transformers/props-binding.js";
import {
  indexedAccessType,
  type PropsTypeReference,
} from "../transformers/props-type.js";

import { escapeForPattern } from "./identifier.js";
import { UNKNOWN_TYPE, type WebComponentsReactiveProperty } from "./types.js";

/** The type an optional property or an unseeded state cell is widened with. */
export const UNDEFINED_TYPE = "undefined";

/** The default props parameter name when the component declares none. */
export const DEFAULT_PROPS_PARAMETER = "properties";

/** The neutral prop that is rendered through slots rather than declared on the element. */
export const SLOTTED_PROP = "children";

/** Pattern matching a `const { ... } = properties` destructuring statement. */
export const PROPS_DESTRUCTURING =
  /^(?:const|let|var)\s+(\{[\S\s]*\})\s*=\s*([A-Za-z_$][\w$]*)\s*;?$/;

/**
 * Standard HTMLElement members and ARIA mixin properties inherited by any custom element.
 */
export const INHERITED_ELEMENT_MEMBERS: ReadonlySet<string> = new Set([
  // Node / Element
  "className",
  "id",
  "innerHTML",
  "nodeValue",
  "outerHTML",
  "role",
  "scrollLeft",
  "scrollTop",
  "slot",
  "textContent",
  // HTMLElement
  "accessKey",
  "autocapitalize",
  "autofocus",
  "contentEditable",
  "dir",
  "draggable",
  "enterKeyHint",
  "hidden",
  "inert",
  "innerText",
  "inputMode",
  "lang",
  "nonce",
  "outerText",
  "popover",
  "spellcheck",
  "style",
  "tabIndex",
  "title",
  "translate",
  "writingSuggestions",
  // ARIAMixin — the exact member names only
  "ariaAtomic",
  "ariaAutoComplete",
  "ariaBusy",
  "ariaChecked",
  "ariaColCount",
  "ariaColIndex",
  "ariaColSpan",
  "ariaCurrent",
  "ariaDescription",
  "ariaDisabled",
  "ariaExpanded",
  "ariaHasPopup",
  "ariaHidden",
  "ariaKeyShortcuts",
  "ariaLabel",
  "ariaLevel",
  "ariaLive",
  "ariaModal",
  "ariaMultiLine",
  "ariaMultiSelectable",
  "ariaOrientation",
  "ariaPlaceholder",
  "ariaPosInSet",
  "ariaPressed",
  "ariaReadOnly",
  "ariaRelevant",
  "ariaRequired",
  "ariaRoleDescription",
  "ariaRowCount",
  "ariaRowIndex",
  "ariaRowSpan",
  "ariaSelected",
  "ariaSetSize",
  "ariaSort",
  "ariaValueMax",
  "ariaValueMin",
  "ariaValueNow",
  "ariaValueText",
]);

/** A props object pattern, and where the component states it. */
export interface PropsBindingSite {
  readonly binding: PropsBinding;
  /**
   * `true` when the pattern is the component's parameter. A body pattern already
   * survives into the render head as a statement (rewritten to `= this`), but a
   * parameter one has no statement, so the head has to be given one.
   */
  readonly fromParameter: boolean;
}

/** Every props object pattern the component destructures, parameter first. */
export function propsBindingSites(
  component: GenericComponent,
  propsParameterName: string,
): PropsBindingSite[] {
  const sites: PropsBindingSite[] = [];
  const { parameter } = component;
  if (parameter?.binding === "object-pattern") {
    const pattern = leadingObjectPattern(parameter.text);
    const binding =
      pattern === undefined ? undefined : parsePropsBinding(pattern);
    if (binding !== undefined) {
      sites.push({ binding, fromParameter: true });
    }
  }
  for (const statement of component.body) {
    if (statement.statementKind !== "variable") {
      continue;
    }
    const match = PROPS_DESTRUCTURING.exec(statement.text.text.trim());
    if (match?.[2] !== propsParameterName) {
      continue;
    }
    const binding = parsePropsBinding(match[1] ?? "");
    if (binding !== undefined) {
      sites.push({ binding, fromParameter: false });
    }
  }
  return sites;
}

/**
 * Find locals that are safe native default-slot passthroughs.
 */
export function slotAliasesOf(
  component: GenericComponent,
  propsParameterName: string,
  sites: readonly PropsBindingSite[],
): ReadonlyMap<string, string> {
  const aliases = new Map<string, string>();
  for (const site of sites) {
    for (const entry of site.binding.entries) {
      const local = entry.locals.length === 1 ? entry.locals[0] : undefined;
      if (
        entry.member === SLOTTED_PROP &&
        entry.defaultValue === undefined &&
        local !== undefined
      ) {
        aliases.set(local, "default");
      }
    }
  }

  const direct = `${propsParameterName}.children`.replace(/\s+/g, "");
  for (const statement of component.body) {
    if (statement.statementKind !== "variable") {
      continue;
    }
    const match = /^const\s+([A-Za-z_$][\w$]*)\s*=\s*(.*?)\s*;?$/.exec(
      statement.text.text.trim(),
    );
    if (match === null) {
      continue;
    }
    const local = match[1];
    const source = (match[2] ?? "").replace(/\s+/g, "");
    if (source === direct || aliases.has(source)) {
      aliases.set(local, "default");
    }
  }
  return aliases;
}

/** Every `<propsParameter>.<name>` member read found in the given source texts. */
export function collectPropertyReads(
  propsParameterName: string,
  texts: readonly string[],
): string[] {
  const pattern = new RegExp(
    String.raw`(?<![\w$.])${escapeForPattern(propsParameterName)}\s*\??\.\s*([A-Za-z_$][\w$]*)`,
    "g",
  );
  const names: string[] = [];
  for (const text of texts) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1];
      if (name !== undefined) {
        names.push(name);
      }
    }
  }
  return names;
}

/** Every expression text carried by a render tree's attributes and interpolated children. */
export function collectRenderExpressionTexts(
  nodes: readonly GenericRenderNode[],
): string[] {
  const texts: string[] = [];
  walkRenderNodes(nodes, (node) => {
    if (typeof node.tag !== "string") {
      texts.push(node.tag.text);
    }
    for (const attribute of node.attributes) {
      if (attribute.kind === "jsx-spread-attribute") {
        texts.push(attribute.expression.text);
        continue;
      }
      if (
        attribute.value?.kind === "expression" &&
        attribute.value.expression !== undefined
      ) {
        texts.push(attribute.value.expression.text);
      }
    }
    for (const child of node.children) {
      if (child.kind === "expression-node" && child.expression !== undefined) {
        texts.push(child.expression.text);
      }
    }
  });
  return texts;
}

/**
 * The reactive property names of a component: declared props, the members of
 * every props destructuring, plus discovered `properties.x` reads.
 */
export function reactivePropertyNames(
  component: GenericComponent,
  props: readonly PropIntention[],
  propsParameterName: string,
  bindings: readonly PropsBindingSite[],
): string[] {
  const names = new Set<string>(props.map((prop) => prop.name));
  for (const site of bindings) {
    for (const member of site.binding.members) {
      names.add(member);
    }
  }
  const texts = [
    ...component.body.map((statement) => statement.text.text),
    ...collectRenderExpressionTexts(
      component.returnNode === undefined ? [] : [component.returnNode],
    ),
  ];
  for (const name of collectPropertyReads(propsParameterName, texts)) {
    names.add(name);
  }
  names.delete(SLOTTED_PROP);
  return [...names];
}

/**
 * The default a props pattern applies to `member`, when one of them does.
 */
export function bindingDefaultOf(
  sites: readonly PropsBindingSite[],
  member: string,
): string | undefined {
  for (const site of sites) {
    for (const entry of site.binding.entries) {
      if (entry.member === member && entry.defaultValue !== undefined) {
        return entry.defaultValue;
      }
    }
  }
  return undefined;
}

/** The nesting depth of every character of a type, so top-level tokens can be found. */
export function typeDepths(text: string): number[] {
  const depths: number[] = [];
  let depth = 0;
  for (const [index, char] of [...text].entries()) {
    if ("([{<".includes(char)) {
      depth += 1;
      depths.push(depth - 1);
      continue;
    }
    // The `>` of an arrow closes nothing — it is part of `=>`.
    if (")]}".includes(char) || (char === ">" && text[index - 1] !== "=")) {
      depth -= 1;
      depths.push(depth);
      continue;
    }
    depths.push(depth);
  }
  return depths;
}

/** The members of a top-level type union, ignoring nested/bracketed unions. */
export function splitTopLevelUnion(text: string): string[] {
  const depths = typeDepths(text);
  const members: string[] = [];
  let last = 0;
  for (const [index, char] of [...text].entries()) {
    if (char === "|" && depths[index] === 0) {
      members.push(text.slice(last, index).trim());
      last = index + 1;
    }
  }
  members.push(text.slice(last).trim());
  return members;
}

/** Whether a type's outermost form is a function type (`(…) => …`). */
export function hasTopLevelArrow(text: string): boolean {
  const depths = typeDepths(text);
  return [...text].some(
    (char, index) =>
      char === "=" && text[index + 1] === ">" && depths[index] === 0,
  );
}

/**
 * Widen a declared type with `undefined`, the way an optional prop reads on the
 * element class.
 */
export function widenOptionalType(text: string): string {
  const members = splitTopLevelUnion(text);
  if (members.includes(UNDEFINED_TYPE)) {
    return text;
  }
  return `${members.length === 1 && hasTopLevelArrow(text) ? `(${text})` : text} | ${UNDEFINED_TYPE}`;
}

/**
 * The type of a reactive property.
 */
export function propertyTypeOf(
  name: string,
  declared: PropIntention | undefined,
  propsType: PropsTypeReference | undefined,
): { type: string; declared: boolean } {
  if (propsType !== undefined && propsType.members.has(name)) {
    return { type: indexedAccessType(propsType, name), declared: true };
  }
  const text = declared?.type?.text.trim();
  if (text === undefined || text.length === 0) {
    return { type: UNKNOWN_TYPE, declared: false };
  }
  return {
    type: declared?.optional === true ? widenOptionalType(text) : text,
    declared: true,
  };
}

/**
 * Build reactive properties for a component.
 */
export function planReactiveProperties(
  component: GenericComponent,
  declaredProps: readonly PropIntention[],
  propsParameterName: string,
  propsBindings: readonly PropsBindingSite[],
  propsType: PropsTypeReference | undefined,
): WebComponentsReactiveProperty[] {
  const propertyNames = reactivePropertyNames(
    component,
    declaredProps,
    propsParameterName,
    propsBindings,
  );
  return propertyNames.map((name) => {
    const declaredProperty = declaredProps.find(
      (candidate) => candidate.name === name,
    );
    const resolved = propertyTypeOf(name, declaredProperty, propsType);
    return {
      name,
      attribute: name.toLowerCase(),
      type: resolved.type,
      optional: declaredProperty?.optional ?? true,
      declared: resolved.declared,
      inherited: INHERITED_ELEMENT_MEMBERS.has(name),
      defaultValue:
        declaredProperty?.defaultValue?.text ??
        bindingDefaultOf(propsBindings, name),
      declaration: {},
    };
  });
}
