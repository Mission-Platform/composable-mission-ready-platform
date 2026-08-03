/**
 * Template-ref rewrite for the native-`<template>` emitter path.
 *
 * A `useRef` bound to an element via a `ref="name"` string binding in the
 * emitted markup is a Vue **template ref**, so its `<script setup>` declaration
 * is switched from a plain `ref<Element | null>(null)` to Vue 3.5's purpose-built
 * `useTemplateRef<Element>('name')`. Only the native-`<template>` path emits such
 * string bindings; the render-closure fallback binds `ref: refObject` inside an
 * `h(…)` call, where a plain `ref(null)` is the correct object ref.
 */

/**
 * Re-declare each `useRef` bound to an element via a `ref="name"` string binding
 * in `markup` as `useTemplateRef<Element>('name')` instead of the plain
 * `ref<Element | null>(null)` the analysis produced. Returns the (possibly
 * rewritten) setup lines and mutates `vueImports` — adding `useTemplateRef` and
 * dropping a now-unused `ref`.
 */
export function applyTemplateRefs(
  setupLines: string[],
  markup: string,
  refElementTypes: Map<string, string | undefined>,
  vueImports: Set<string>,
): string[] {
  const templateRefNames = [...refElementTypes.keys()].filter((name) => markup.includes(` ref="${name}"`));
  if (templateRefNames.length === 0) {
    return setupLines;
  }
  vueImports.add('useTemplateRef');
  const converted = setupLines.map((line) => {
    // A `useRef` is emitted as `shallowRef` (its non-reactive container mapping);
    // match that as well as a plain `ref` for robustness.
    const name = templateRefNames.find(
      (refName) => line.startsWith(`const ${refName} = shallowRef`) || line.startsWith(`const ${refName} = ref`),
    );
    if (name === undefined) {
      return line;
    }
    const elementType = refElementTypes.get(name);
    const generic = elementType === undefined ? '' : `<${elementType}>`;
    return `const ${name} = useTemplateRef${generic}('${name}');`;
  });
  // Drop the `shallowRef`/`ref` runtime imports when no remaining setup line
  // still calls them (`useState`/other `useRef`s keep them alive when present).
  if (!converted.some((line) => /\bshallowRef\s*[<(]/.test(line))) {
    vueImports.delete('shallowRef');
  }
  if (!converted.some((line) => /\bref\s*[<(]/.test(line))) {
    vueImports.delete('ref');
  }
  return converted;
}
