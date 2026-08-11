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
import ts from "typescript";

import type { ContentFieldKind } from "./content-model.js";

/** The result of classifying a prop (`undefined` → drop the prop). */
export type ClassifiedFieldKind = ContentFieldKind | undefined;

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
  sourceFile: ts.SourceFile,
): Map<string, ts.TypeNode> {
  const aliases = new Map<string, ts.TypeNode>();
  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement)) {
      aliases.set(statement.name.text, statement.type);
    }
  }
  return aliases;
}

/** The string value of a string-literal type node, if it is one. */
function stringLiteralOf(node: ts.TypeNode): string | undefined {
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
    return node.literal.text;
  }
  return undefined;
}

/** Whether a type node is a `true`/`false` literal. */
function isBooleanLiteral(node: ts.TypeNode): boolean {
  return (
    ts.isLiteralTypeNode(node) &&
    (node.literal.kind === ts.SyntaxKind.TrueKeyword ||
      node.literal.kind === ts.SyntaxKind.FalseKeyword)
  );
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
  node: ts.TypeNode,
  aliases: Map<string, ts.TypeNode>,
  seen: Set<string> = new Set(),
): ClassifiedFieldKind {
  if (ts.isParenthesizedTypeNode(node)) {
    return classifyType(node.type, aliases, seen);
  }

  // Callback props are behaviour, not authorable content — drop them.
  if (ts.isFunctionTypeNode(node)) {
    return undefined;
  }

  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const name = node.typeName.text;
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

  switch (node.kind) {
    case ts.SyntaxKind.BooleanKeyword: {
      return { kind: "boolean" };
    }
    case ts.SyntaxKind.NumberKeyword: {
      return { kind: "number" };
    }
    case ts.SyntaxKind.StringKeyword: {
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

  if (ts.isUnionTypeNode(node)) {
    const options: string[] = [];
    let hasText = false;
    let hasNumber = false;
    let booleanOnly = true;
    for (const member of node.types) {
      const value = stringLiteralOf(member);
      if (value !== undefined) {
        options.push(value);
        booleanOnly = false;
        continue;
      }
      if (
        isBooleanLiteral(member) ||
        member.kind === ts.SyntaxKind.BooleanKeyword
      ) {
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
