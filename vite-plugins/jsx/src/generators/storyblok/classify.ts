/**
 * Prop-type classification for the Storyblok emitter.
 *
 * A prop's TypeScript type is mapped onto a Storyblok {@link FieldKind}:
 * string-literal unions (incl. those declared as local `type` aliases) become
 * `option` fields, `boolean`/`number`/`string` become the matching primitive
 * fields, the slot type references become nestable `bloks` fields, and callback
 * props are dropped (they are not authorable content).
 */
import ts from 'typescript';

import type { FieldKind } from './types.js';

/** Type references whose props are treated as nestable Storyblok content (`bloks`). */
export const SLOT_TYPE_REFERENCES: ReadonlySet<string> = new Set(['MpChild', 'MpChildren', 'MpElement', 'MpNode']);

/** Map every top-level `type X = …` alias to its type node, for union resolution. */
export function collectTypeAliases(sourceFile: ts.SourceFile): Map<string, ts.TypeNode> {
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
    (node.literal.kind === ts.SyntaxKind.TrueKeyword || node.literal.kind === ts.SyntaxKind.FalseKeyword)
  );
}

/** Classify a prop's type node into a Storyblok field kind, resolving local aliases/unions. */
export function classifyType(
  node: ts.TypeNode,
  aliases: Map<string, ts.TypeNode>,
  seen: Set<string> = new Set(),
): FieldKind {
  if (ts.isParenthesizedTypeNode(node)) {
    return classifyType(node.type, aliases, seen);
  }

  // Callback props are behaviour, not authorable content — drop them.
  if (ts.isFunctionTypeNode(node)) {
    return undefined;
  }

  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const name = node.typeName.text;
    if (SLOT_TYPE_REFERENCES.has(name)) {
      return { type: 'bloks' };
    }
    const alias = aliases.get(name);
    if (alias !== undefined && !seen.has(name)) {
      return classifyType(alias, aliases, new Set([...seen, name]));
    }
    return undefined;
  }

  switch (node.kind) {
    case ts.SyntaxKind.BooleanKeyword: {
      return { type: 'boolean' };
    }
    case ts.SyntaxKind.NumberKeyword: {
      return { type: 'number' };
    }
    case ts.SyntaxKind.StringKeyword: {
      return { type: 'text' };
    }
    default: {
      break;
    }
  }

  const literal = stringLiteralOf(node);
  if (literal !== undefined) {
    return { type: 'option', options: [literal] };
  }
  if (isBooleanLiteral(node)) {
    return { type: 'boolean' };
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
      if (isBooleanLiteral(member) || member.kind === ts.SyntaxKind.BooleanKeyword) {
        continue;
      }
      booleanOnly = false;
      const memberKind = classifyType(member, aliases, seen);
      switch (memberKind?.type) {
        case 'option': {
          options.push(...memberKind.options);
          break;
        }
        case 'number': {
          hasNumber = true;
          break;
        }
        case 'text': {
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
      return { type: 'text' };
    }
    if (options.length > 0) {
      return { type: 'option', options };
    }
    if (booleanOnly) {
      return { type: 'boolean' };
    }
  }

  return undefined;
}
