/**
 * Prop-type classification for every CMS target.
 *
 * A prop's TypeScript type is mapped onto a neutral {@link ContentFieldKind}:
 * string-literal unions (incl. those declared as local `type` aliases) become
 * `option` fields, `boolean`/`number`/`string` become the matching primitive
 * fields, the slot type references become nestable `children` fields, the
 * richtext/asset/link marker types become their own kinds, and callback props
 * are dropped (they are not authorable content).
 *
 * This is the single classification implementation in the repository — a fix to
 * union, alias, or marker handling benefits every target at once.
 */
import type { ContentFieldKind } from "./content-model.js";
import type {
  OxcNode,
  OxcParsedModule,
} from "@mission-platform/vite-plugin-forge/compiler/oxc.js";

/** The result of classifying a prop (`undefined` → drop the prop). */
export type ClassifiedFieldKind = ContentFieldKind | undefined;
export type CmsTypeNode = OxcNode;

/** Type references whose props are treated as nested content (`children`). */
export const SLOT_TYPE_REFERENCES: ReadonlySet<string> = new Set([
  "MpChild",
  "MpChildren",
  "MpElement",
  "MpNode",
]);

/** Type references that mark a prop as formatted rich text rather than plain text. */
export const RICHTEXT_TYPE_REFERENCES: ReadonlySet<string> = new Set([
  "MpRichText",
  "MpHtml",
  "MpMarkdown",
]);

/** Type references that mark a prop as a media asset. */
export const ASSET_TYPE_REFERENCES: ReadonlySet<string> = new Set([
  "MpAsset",
  "MpImage",
  "MpMedia",
]);

/** Type references that mark a prop as a link/URL. */
export const LINK_TYPE_REFERENCES: ReadonlySet<string> = new Set([
  "MpLink",
  "MpUrl",
]);

/** Map every top-level `type X = …` alias to its type node, for union resolution. */
export function collectTypeAliases(
  sourceFile: OxcParsedModule,
): Map<string, CmsTypeNode> {
  const aliases = new Map<string, CmsTypeNode>();
  for (const statement of oxcProgramBody(sourceFile.program)) {
    const declaration =
      statement.type === "ExportNamedDeclaration"
        ? oxcObject(statement, "declaration")
        : statement;
    if (declaration?.type === "TSTypeAliasDeclaration") {
      const name = oxcIdentifierName(oxcObject(declaration, "id"));
      const type = oxcObject(declaration, "typeAnnotation");
      if (name !== undefined && type !== undefined) aliases.set(name, type);
    }
  }
  return aliases;
}

/** The string value of a string-literal type node, if it is one. */
function oxcObject(
  node: OxcNode | undefined,
  key: string,
): OxcNode | undefined {
  const value = node?.[key];
  return typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
    ? (value as OxcNode)
    : undefined;
}

function oxcArray(node: OxcNode | undefined, key: string): OxcNode[] {
  const value = node?.[key];
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is OxcNode =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as { type?: unknown }).type === "string",
      )
    : [];
}

function oxcIdentifierName(node: OxcNode | undefined): string | undefined {
  return typeof node?.name === "string" ? node.name : undefined;
}

function oxcProgramBody(program: OxcNode): OxcNode[] {
  return oxcArray(program, "body");
}

function stringLiteralOf(node: CmsTypeNode): string | undefined {
  if (node.type !== "TSLiteralType") return undefined;
  const literal = oxcObject(node, "literal");
  return typeof literal?.value === "string" ? literal.value : undefined;
}

/** Whether a type node is a `true`/`false` literal. */
function isBooleanLiteral(node: CmsTypeNode): boolean {
  if (node.type !== "TSLiteralType") return false;
  const literal = oxcObject(node, "literal");
  return literal?.type === "Literal" && typeof literal.value === "boolean";
}

/** The marker kind a named type reference declares, when it declares one. */
function markerKind(name: string): ClassifiedFieldKind {
  if (SLOT_TYPE_REFERENCES.has(name)) {
    return { kind: "children" };
  }
  if (RICHTEXT_TYPE_REFERENCES.has(name)) {
    return { kind: "richtext" };
  }
  if (ASSET_TYPE_REFERENCES.has(name)) {
    return { kind: "asset" };
  }
  if (LINK_TYPE_REFERENCES.has(name)) {
    return { kind: "link" };
  }
  return undefined;
}

/** Classify a prop's type node into a neutral content kind, resolving local aliases/unions. */
export function classifyType(
  node: CmsTypeNode,
  aliases: Map<string, CmsTypeNode>,
  seen: Set<string> = new Set(),
): ClassifiedFieldKind {
  if (node.type === "TSParenthesizedType") {
    const inner = oxcObject(node, "typeAnnotation");
    return inner === undefined ? undefined : classifyType(inner, aliases, seen);
  }

  // Callback props are behaviour, not authorable content — drop them.
  if (node.type === "TSFunctionType") {
    return undefined;
  }

  if (node.type === "TSTypeReference") {
    const name = oxcIdentifierName(oxcObject(node, "typeName"));
    if (name === undefined) return undefined;
    const marker = markerKind(name);
    if (marker !== undefined) {
      return marker;
    }
    const alias = aliases.get(name);
    if (alias !== undefined && !seen.has(name)) {
      return classifyType(alias, aliases, new Set([...seen, name]));
    }
    return undefined;
  }

  switch (node.type) {
    case "TSBooleanKeyword": {
      return { kind: "boolean" };
    }
    case "TSNumberKeyword": {
      return { kind: "number" };
    }
    case "TSStringKeyword": {
      return { kind: "text" };
    }
    default: {
      break;
    }
  }

  const literal = stringLiteralOf(node);
  if (literal !== undefined) {
    return { kind: "option", options: [literal] };
  }
  if (isBooleanLiteral(node)) {
    return { kind: "boolean" };
  }

  if (node.type === "TSUnionType") {
    const options: string[] = [];
    let hasText = false;
    let hasNumber = false;
    let booleanOnly = true;
    for (const member of oxcArray(node, "types")) {
      const value = stringLiteralOf(member);
      if (value !== undefined) {
        options.push(value);
        booleanOnly = false;
        continue;
      }
      if (isBooleanLiteral(member) || member.type === "TSBooleanKeyword") {
        continue;
      }
      booleanOnly = false;
      const memberKind = classifyType(member, aliases, seen);
      switch (memberKind?.kind) {
        case "option": {
          options.push(...memberKind.options);
          break;
        }
        case "number": {
          hasNumber = true;
          break;
        }
        case "text": {
          hasText = true;
          break;
        }
        default: {
          break;
        }
      }
    }
    // A union mixing string literals with `string`/`number` can't be a closed
    // dropdown, so it degrades to free text; a pure literal union is an option.
    if (hasText || hasNumber) {
      return { kind: "text" };
    }
    if (options.length > 0) {
      return { kind: "option", options };
    }
    if (booleanOnly) {
      return { kind: "boolean" };
    }
  }

  return undefined;
}
