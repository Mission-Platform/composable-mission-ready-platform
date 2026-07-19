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
        /\bMp(Child|Element|Node|RenderProperty)\b/.test(member.type.getText(sourceFile))
      ) {
        names.add(member.name.text);
      }
    }
  }
  return names;
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
