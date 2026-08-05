/**
 * Props-interface analysis for the Vue module emitter.
 *
 * Two small, pure readers over the neutral component's source file: one resolves
 * the name of the props interface referenced by the component's first parameter,
 * the other collects the members of that interface whose declared type carries
 * framework nodes (slot content). Both feed the emitter's decision about which
 * interface members become runtime `defineProps`, `defineEmits`, or slots.
 */
import ts from 'typescript';

import { printNode } from '../../compiler/ast.js';

/** Prop names whose declared type holds framework nodes (`MpChild`/`MpElement`/`MpNode`/`MpRenderProperty`). */
export function nodeTypedPropertyNames(sourceFile: ts.SourceFile, interfaceName: string | undefined): Set<string> {
  const names = new Set<string>();
  if (interfaceName === undefined) {
    return names;
  }
  for (const statement of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(statement) || statement.name.text !== interfaceName) {
      continue;
    }
    for (const member of statement.members) {
      if (
        ts.isPropertySignature(member) &&
        ts.isIdentifier(member.name) &&
        member.type !== undefined &&
        /\bMp(Child|Element|Node|RenderProperty)\b/.test(printNode(member.type, sourceFile))
      ) {
        names.add(member.name.text);
      }
    }
  }
  return names;
}

/** All property names across all interfaces and type literals in `sourceFile` whose declared type holds framework nodes. */
export function allNodeTypedPropertyNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const scanType = (typeNode: ts.TypeNode | undefined, name: string): void => {
    if (typeNode !== undefined && /\bMp(Child|Element|Node|RenderProperty)\b/.test(printNode(typeNode, sourceFile))) {
      names.add(name);
    }
  };

  for (const statement of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(statement)) {
      for (const member of statement.members) {
        if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
          scanType(member.type, member.name.text);
        }
      }
    }
    if (ts.isTypeAliasDeclaration(statement) && ts.isTypeLiteralNode(statement.type)) {
      for (const member of statement.type.members) {
        if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
          scanType(member.type, member.name.text);
        }
      }
    }
  }
  return names;
}

/**
 * A `typeName → node-typed field names` index over every interface and type
 * literal alias in `sourceFile`.
 *
 * Unlike {@link allNodeTypedPropertyNames} (a flat name set, receiver-agnostic),
 * this keeps the owning type, so a member read can be classified **receiver
 * type-aware**: `item.icon` where `item: WysiwygToolbarItem` and
 * `WysiwygToolbarItem.icon: MpElement` is node-valued, whereas `node.label`
 * where `node: TreeNode` and `TreeNode.label: string` is a plain field — even
 * when some *other* type in the same file declares a node-typed `label`.
 */
export function nodeTypedFieldsByTypeName(sourceFile: ts.SourceFile): Map<string, Set<string>> {
  const byType = new Map<string, Set<string>>();
  const collect = (typeName: string, members: ts.NodeArray<ts.TypeElement>): void => {
    const names = new Set<string>();
    for (const member of members) {
      if (
        ts.isPropertySignature(member) &&
        ts.isIdentifier(member.name) &&
        member.type !== undefined &&
        /\bMp(Child|Element|Node|RenderProperty)\b/.test(printNode(member.type, sourceFile))
      ) {
        names.add(member.name.text);
      }
    }
    if (names.size > 0) {
      byType.set(typeName, names);
    }
  };
  for (const statement of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(statement)) {
      collect(statement.name.text, statement.members);
    }
    if (ts.isTypeAliasDeclaration(statement) && ts.isTypeLiteralNode(statement.type)) {
      collect(statement.name.text, statement.type.members);
    }
  }
  return byType;
}

/**
 * Resolve the props-interface name referenced by a component's first parameter
 * type. A bare type reference (`FooProps`) yields its name directly; a
 * utility-type wrapper — currently `Readonly<FooProps>` — is unwrapped to the
 * inner type reference so the interface is still found. Without this, `Readonly`
 * would be taken as the interface name, `extractPropertySignatures` would
 * match no interface, and the component's `defineProps` would never be emitted.
 * Anything else (an inline type literal, an unrecognised wrapper, …) yields
 * `undefined`.
 */
export function resolvePropertiesTypeName(type: ts.TypeNode | undefined): string | undefined {
  if (type === undefined || !ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName)) {
    return undefined;
  }
  if (type.typeName.text === 'Readonly' && type.typeArguments?.length === 1) {
    return resolvePropertiesTypeName(type.typeArguments[0]);
  }
  return type.typeName.text;
}
