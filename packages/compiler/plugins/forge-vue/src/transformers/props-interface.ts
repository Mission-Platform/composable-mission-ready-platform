/**
 * Props / events / models derivation for the Vue emitter.
 *
 * The component's public surface is already recorded on the semantic IR:
 * `intentions.props` carries every props-interface member with its declared type
 * text and optionality. Vue splits that surface three ways:
 *
 * - an `on<Event>` member typed with an **inline function type** is an event and
 *   is declared with `defineEmits`,
 * - a member marked `@model <onEvent>` is fused with its change event into a
 *   single `defineModel` two-way binding,
 * - everything else (minus node-typed slot content) stays a runtime prop in
 *   `defineProps`.
 *
 * The `@model` tag lives in a JSDoc comment, which the IR does not model as a
 * field — but the props interface is carried over verbatim in
 * `ast.declarations`, and a statement's recorded text includes its members'
 * comments, so the tag is read from that text with a small targeted scan.
 */
import { sourceBacked } from "@mission-platform/forge-plugin-api";
import { eventNameForProperty } from "@mission-platform/forge-plugin-api/compiler/ast.js";

import { maskLiterals, matchBracket, splitTopLevel } from "./text.js";

import type {
  GenericStatement,
  PropIntention,
} from "@mission-platform/forge-plugin-api";

/** A runtime prop rendered into the type-based `defineProps<{ … }>()`. */
export interface VuePropertySignature {
  readonly name: string;
  readonly typeText: string;
  readonly optional: boolean;
}

/** An `on<Event>` prop rendered into `defineEmits<{ … }>()`. */
export interface VueEventSignature {
  readonly propName: string;
  readonly eventName: string;
  readonly paramsText: string;
  readonly paramNames: string[];
}

/** A prop fused with its change event into a `defineModel` binding. */
export interface VueModelSignature {
  readonly propName: string;
  readonly modelName: string | undefined;
  readonly typeText: string;
  readonly optional: boolean;
  readonly eventPropName: string;
}

/** The canonical model prop Vue exposes as the nameless default `v-model`. */
const DEFAULT_MODEL_PROP = "modelValue";

/** Neutral type names that mark a prop as slot content rather than data. */
const NODE_TYPE_NAMES: ReadonlySet<string> = new Set([
  "MpChild",
  "MpChildren",
  "MpElement",
  "MpNode",
  "MpRenderProperty",
]);

/**
 * The props interface's name as written on the component's parameter, unwrapping
 * the `Readonly<…>` the neutral authoring style applies (`Readonly<CardProperties>`
 * → `CardProperties`). Returns `undefined` for an inline type literal.
 */
export function resolvePropsTypeName(
  typeText: string | undefined,
): string | undefined {
  if (typeText === undefined) {
    return undefined;
  }
  const trimmed = typeText.trim();
  const wrapped =
    /^Readonly\s*<([\s\S]*)>$/.exec(trimmed)?.[1]?.trim() ?? trimmed;
  return /^[A-Za-z_$][\w$]*$/.test(wrapped) ? wrapped : undefined;
}

/**
 * One member of an interface / type-literal body, as it is written.
 *
 * A member is **not** a line: its type annotation can span many lines (a
 * multi-line parameter list, a union broken across lines, an inline object
 * type), and its leading JSDoc belongs to it. {@link text} therefore covers the
 * member's leading comments, its whole declaration and its terminator, so that
 * removing a member removes exactly the member.
 */
export interface InterfaceMember {
  /** The declared name, or `undefined` for an unnamed member (an index signature, a method, trailing trivia). */
  readonly name: string | undefined;
  /** Whether the member is declared optional (`name?:`). */
  readonly optional: boolean;
  /** The declared type text with comments removed, or `undefined` when unnamed. */
  readonly typeText: string | undefined;
  /** The member's verbatim text: leading comments, declaration, terminator and trailing newline. */
  readonly text: string;
}

/** Length of the whitespace-and-comment run starting at `from`. */
function triviaLength(text: string, from: number): number {
  let index = from;
  while (index < text.length) {
    if (/\s/.test(text[index])) {
      index += 1;
      continue;
    }
    if (text.startsWith("//", index)) {
      const newline = text.indexOf("\n", index);
      index = newline === -1 ? text.length : newline + 1;
      continue;
    }
    if (text.startsWith("/*", index)) {
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 2;
      continue;
    }
    break;
  }
  return index - from;
}

/**
 * Index just past the `;` (or `,`) that terminates the member starting at
 * `from`, considering only separators at member depth zero — a `;` inside an
 * inline object type and a `,` inside a parameter list or a generic argument
 * list belong to the member. Returns `text.length` for an unterminated member.
 */
function memberEnd(
  text: string,
  from: number,
  mask: readonly boolean[],
): number {
  let depth = 0;
  let angle = 0;
  for (let index = from; index < text.length; index += 1) {
    if (mask[index]) {
      continue;
    }
    const character = text[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
      continue;
    }
    // Generic argument lists must not be mistaken for a member boundary;
    // `=>` is not an angle bracket, so it is excluded explicitly.
    if (character === "<") {
      angle += 1;
      continue;
    }
    if (character === ">" && text[index - 1] !== "=") {
      angle -= 1;
      continue;
    }
    if (depth === 0 && angle <= 0 && (character === ";" || character === ",")) {
      return index + 1;
    }
  }
  return text.length;
}

/**
 * Length of the member's own trailing run: same-line spacing, an end-of-line
 * comment and the newline. Keeping these with the member they annotate means a
 * removed member takes its whole line with it, and the comment documenting the
 * *following* member is not mistaken for its own.
 */
function trailingLength(text: string, from: number): number {
  let index = from;
  while (index < text.length && (text[index] === " " || text[index] === "\t")) {
    index += 1;
  }
  if (text.startsWith("//", index)) {
    const newline = text.indexOf("\n", index);
    index = newline === -1 ? text.length : newline;
  }
  if (text[index] === "\r") {
    index += 1;
  }
  if (text[index] === "\n") {
    index += 1;
  }
  return index - from;
}

/** A member's declared type, with its comments stripped and terminator removed. */
function memberTypeText(declaration: string, from: number): string {
  return declaration
    .slice(from)
    .replaceAll(/\/\*[\s\S]*?\*\//g, " ")
    .replaceAll(/\/\/[^\n]*/g, " ")
    .trim()
    .replace(/[;,]$/, "")
    .trim();
}

/**
 * The `{ … }` body range of an interface or type-literal declaration.
 *
 * The first `{` in the text is not necessarily the body: `interface A extends
 * B<{ c: string }> { … }` opens a brace inside its type arguments first, so the
 * body is the first brace at bracket **and** angle depth zero.
 */
function interfaceBodyRange(
  text: string,
): { open: number; close: number } | undefined {
  const mask = maskLiterals(text);
  let depth = 0;
  let angle = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (mask[index]) {
      continue;
    }
    const character = text[index];
    if (character === "{" && depth === 0 && angle <= 0) {
      const close = matchBracket(text, index);
      return close === -1 ? undefined : { open: index, close };
    }
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
      continue;
    }
    if (character === "<") {
      angle += 1;
      continue;
    }
    if (character === ">" && text[index - 1] !== "=") {
      angle -= 1;
    }
  }
  return undefined;
}

/**
 * Split an interface / type-literal body into whole member declarations.
 *
 * This is the single reader every member-level operation shares, so recovering
 * props and removing them cannot disagree about where a member begins and ends.
 */
export function interfaceMembers(body: string): InterfaceMember[] {
  const mask = maskLiterals(body);
  const members: InterfaceMember[] = [];
  let index = 0;
  while (index < body.length) {
    const start = index;
    const declarationStart = start + triviaLength(body, start);
    if (declarationStart >= body.length) {
      // Trailing whitespace or a dangling comment: no member, but the text is
      // still part of the body and must survive a prune.
      members.push({
        name: undefined,
        optional: false,
        typeText: undefined,
        text: body.slice(start),
      });
      break;
    }
    const terminated = memberEnd(body, declarationStart, mask);
    const end = terminated + trailingLength(body, terminated);
    const declaration = body.slice(declarationStart, end);
    const head = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)(\s*\?)?\s*:/.exec(
      declaration,
    );
    members.push({
      name: head?.[1],
      optional: head?.[2] !== undefined,
      typeText:
        head === null ? undefined : memberTypeText(declaration, head[0].length),
      text: body.slice(start, end),
    });
    index = end;
  }
  return members;
}

/**
 * Recover the props from the interface declaration itself.
 *
 * A parameter annotated `Readonly<CardProperties>` defeats the neutral prop
 * inference, which then records no props at all — the component would lose every
 * `defineProps` member and every `defineEmits` event. The interface is carried
 * over verbatim in `ast.declarations`, so its members are read straight from the
 * recorded text as a fallback.
 */
export function interfaceProps(
  declaration: GenericStatement | undefined,
): PropIntention[] {
  if (declaration === undefined) {
    return [];
  }
  const body = interfaceBodyRange(declaration.text.text);
  if (body === undefined) {
    return [];
  }
  const props: PropIntention[] = [];
  for (const member of interfaceMembers(
    declaration.text.text.slice(body.open + 1, body.close),
  )) {
    if (
      member.name === undefined ||
      member.typeText === undefined ||
      member.typeText.length === 0
    ) {
      continue;
    }
    props.push({
      name: member.name,
      optional: member.optional,
      type: sourceBacked(member.typeText, "type"),
    });
  }
  return props;
}

/** Whether a declared type text refers to renderable node content. */
export function isNodeTypeText(typeText: string | undefined): boolean {
  if (typeText === undefined) {
    return false;
  }
  return [...NODE_TYPE_NAMES].some((name) =>
    new RegExp(String.raw`\b${name}\b`).test(typeText),
  );
}

/**
 * A `typeName → node-typed field names` index over the module's interfaces and
 * type-literal aliases.
 *
 * Unlike {@link nodeTypedPropertyNames} (a flat, receiver-agnostic name set),
 * this keeps the owning type, so a member read can be classified **receiver
 * type-aware**: `item.icon` where `item: ToolbarItem` and `ToolbarItem.icon:
 * MpElement` holds a VNode, whereas `crumb.icon` where `Crumb.icon: string` is
 * a plain field — even though both members are called `icon`.
 */
export function nodeTypedFieldsByTypeName(
  declarations: readonly GenericStatement[],
): Map<string, Set<string>> {
  const byType = new Map<string, Set<string>>();
  for (const declaration of declarations) {
    if (declaration.name === undefined) {
      continue;
    }
    if (
      declaration.statementKind !== "interface" &&
      declaration.statementKind !== "type-alias"
    ) {
      continue;
    }
    const names = nodeTypedPropertyNames(interfaceProps(declaration));
    if (names.size > 0) {
      byType.set(declaration.name, names);
    }
  }
  return byType;
}

/** Every prop whose declared type is renderable node content. */
export function nodeTypedPropertyNames(
  props: readonly PropIntention[],
): Set<string> {
  return new Set(
    props
      .filter((prop) => isNodeTypeText(prop.type?.text))
      .map((prop) => prop.name),
  );
}

/**
 * Top-level functions whose **declared return type** is renderable node content
 * (`function variantIcon(variant: Variant): MpElement`).
 *
 * A call of one produces a VNode, so it belongs in a `<component :is>` host: an
 * interpolation would hand the VNode to `toDisplayString`, which JSON-serialises
 * the circular structure and throws out of the render function.
 */
export function nodeReturningFunctionNames(
  declarations: readonly GenericStatement[],
): Set<string> {
  const names = new Set<string>();
  for (const declaration of declarations) {
    const name = declaration.name;
    if (name === undefined) {
      continue;
    }
    const text = declaration.text.text;
    // The return annotation of a `function` declaration, or of a const-bound
    // arrow — in both cases the type between the parameter list and the body.
    const returnType =
      new RegExp(
        String.raw`function\s+${name}\s*(?:<[^>]*>)?\s*\([\s\S]*?\)\s*:\s*([^{]+)\{`,
      ).exec(text)?.[1] ??
      new RegExp(
        String.raw`const\s+${name}\s*=\s*(?:<[^>]*>)?\s*\([\s\S]*?\)\s*:\s*([^=]+)=>`,
      ).exec(text)?.[1];
    if (isNodeTypeText(returnType)) {
      names.add(name);
    }
  }
  return names;
}

/**
 * Whether a declared type text is an **inline function type** (`(a: A) => void`)
 * rather than a named alias — only the inline form is treated as an event.
 */
function isInlineFunctionType(typeText: string): boolean {
  return /^\(.*\)\s*=>/s.test(typeText.trim());
}

/** The parameter list source text of an inline function type. */
function functionTypeParameters(typeText: string): string {
  const trimmed = typeText.trim();
  const close = trimmed.lastIndexOf(")", trimmed.indexOf("=>"));
  return close === -1 ? "" : trimmed.slice(1, close).trim();
}

/** The runtime prop signatures rendered into `defineProps`. */
export function propertySignatures(
  props: readonly PropIntention[],
): VuePropertySignature[] {
  return props
    .filter((prop) => prop.name !== "children")
    .map((prop) => ({
      name: prop.name,
      typeText: prop.type?.text ?? "unknown",
      optional: prop.optional,
    }));
}

/** The event signatures rendered into `defineEmits`. */
export function eventSignatures(
  props: readonly PropIntention[],
): VueEventSignature[] {
  const events: VueEventSignature[] = [];
  for (const prop of props) {
    const typeText = prop.type?.text;
    if (
      !/^on[A-Z]/.test(prop.name) ||
      typeText === undefined ||
      !isInlineFunctionType(typeText)
    ) {
      continue;
    }
    // A callback declared across several lines carries its indentation into the
    // parameter text; `defineEmits` renders it inside a tuple type, so each
    // parameter is folded back onto one line and the authored trailing comma
    // (dropped by the split) does not survive.
    const parameters = splitTopLevel(functionTypeParameters(typeText), ",").map(
      (parameter) => parameter.replaceAll(/\s*\n\s*/g, " ").trim(),
    );
    const paramNames = parameters.map(
      (parameter, index) =>
        /^([A-Za-z_$][\w$]*)/.exec(parameter)?.[1] ?? `argument${index}`,
    );
    events.push({
      propName: prop.name,
      eventName: eventNameForProperty(prop.name),
      paramsText: parameters.join(", "),
      paramNames,
    });
  }
  return events;
}

/**
 * Read the `@model <onEvent>` JSDoc tags declared on a props interface. The
 * interface's recorded statement text contains its members' doc comments, so
 * each tag is paired with the member name that follows it.
 */
export function readModelTags(
  declaration: GenericStatement | undefined,
): Map<string, string> {
  const tags = new Map<string, string>();
  if (declaration === undefined) {
    return tags;
  }
  const text = declaration.text.text;
  const pattern =
    /@model\s+(\w+)[\s\S]*?\*\/\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*\??\s*:/g;
  for (const match of text.matchAll(pattern)) {
    if (match[1] !== undefined && match[2] !== undefined) {
      tags.set(match[2], match[1]);
    }
  }
  return tags;
}

/** The `defineModel` signatures for every prop marked with a `@model` tag. */
export function modelSignatures(
  props: readonly PropIntention[],
  modelTags: ReadonlyMap<string, string>,
): VueModelSignature[] {
  const models: VueModelSignature[] = [];
  for (const prop of props) {
    const eventPropName = modelTags.get(prop.name);
    if (eventPropName === undefined) {
      continue;
    }
    models.push({
      propName: prop.name,
      modelName: prop.name === DEFAULT_MODEL_PROP ? undefined : prop.name,
      typeText: prop.type?.text ?? "unknown",
      optional: prop.optional,
      eventPropName,
    });
  }
  return models;
}

/**
 * Prune the carried-over props interface to exactly the members the emitted
 * `defineProps<{ … }>()` declares: events, `@model` props and node-typed slots
 * live on `defineEmits` / `defineModel` / `<slot>`, so leaving them on the
 * interface would make the component's public type disagree with its runtime
 * props.
 *
 * Removal is per **member declaration**, not per line: a multi-line event
 * callback (`onChange?: (\n  next: string,\n) => void;`) must go in one piece —
 * dropping only the line that carries the name would leave a `) => void;`
 * fragment behind — and its leading JSDoc goes with it rather than being left
 * orphaned above the next member.
 */
export function pruneInterfaceMembers(
  text: string,
  dropped: ReadonlySet<string>,
): string {
  if (dropped.size === 0) {
    return text;
  }
  const body = interfaceBodyRange(text);
  if (body === undefined) {
    return text;
  }
  const kept = interfaceMembers(text.slice(body.open + 1, body.close))
    .filter((member) => member.name === undefined || !dropped.has(member.name))
    .map((member) => member.text)
    .join("");
  return `${text.slice(0, body.open + 1)}${kept}${text.slice(body.close)}`;
}
