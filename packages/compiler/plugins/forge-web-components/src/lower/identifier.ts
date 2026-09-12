/** Escape a name for embedding in a regular expression. */
export function escapeForPattern(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** Whether the given text references the bare identifier `name`. */
export function referencesIdentifier(text: string, name: string): boolean {
  return new RegExp(
    String.raw`(?<![\w$])${escapeForPattern(name)}(?![\w$])`,
  ).test(text);
}

/**
 * Whether the text reads `name` as a **scope** identifier rather than as the
 * member name of something else.
 *
 * `modelValue?.format` reads `modelValue`, not `format`, so a local called
 * `format` is neither needed by that text nor blocked by it. The distinction
 * matters for `promotedHeadLocals`, which would otherwise refuse to promote
 * a derivation whose members happen to share a name with a render-head local.
 */
export function referencesLocal(text: string, name: string): boolean {
  const pattern = new RegExp(
    String.raw`(?<![\w$])${escapeForPattern(name)}(?![\w$])`,
    "g",
  );
  for (const match of text.matchAll(pattern)) {
    const before = text.slice(0, match.index).trimEnd();
    // `a.b` / `a?.b` — but `...b` is a spread of `b`, which *is* a read.
    if (!before.endsWith(".") || before.endsWith("..")) {
      return true;
    }
  }
  return false;
}
