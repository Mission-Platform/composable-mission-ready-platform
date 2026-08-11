/**
 * Neutral → Vue attribute vocabulary for the **render-closure** path.
 *
 * The neutral dialect is authored in React's camelCase vocabulary (`className`,
 * `colSpan`), and the native-`<template>` transformer translates it while it
 * prints the markup (`className` → `class` / `:class`). A component that cannot
 * be expressed as a `<template>` keeps its JSX verbatim inside
 * `const render = () => …`, so nothing translates it — and Vue does not
 * understand the React spelling:
 *
 * - `class` is normalised by `createVNode` (an array/object collapses to a class
 *   string), while `className` is set straight onto the element as a DOM
 *   property, so `className={['a', { b: on }]}` renders the literal
 *   `class="a,[object Object]"` and the component loses its styling entirely;
 * - Vue's JSX intrinsic elements type native attributes by their HTML
 *   (lowercase) name, so `colSpan` also fails to type-check against them.
 *
 * The rewrite is anchored on the attribute-name spans {@link scanJsx} reports,
 * so only a real JSX attribute name is translated: an identifier
 * (`properties.className`), an object key (`{ className: … }`) and element text
 * are all left alone.
 */
import {
  CLASS_NAME_ATTRIBUTE,
  JSX_ATTRIBUTE_RENAMES,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";

import { scanJsx } from "./jsx-scan.js";

/** The Vue spelling of a neutral attribute name, or `undefined` when unchanged. */
function vueAttributeName(name: string): string | undefined {
  if (name === CLASS_NAME_ATTRIBUTE) {
    return "class";
  }
  return JSX_ATTRIBUTE_RENAMES.get(name);
}

/**
 * Translate every neutral JSX attribute name in a render-closure fragment to
 * its Vue spelling. Spans are rewritten back to front so each replacement
 * leaves the indices of the ones still to come untouched.
 */
export function rewriteClosureAttributes(text: string): string {
  const { attributes } = scanJsx(text);
  let output = text;
  for (const attribute of attributes.toReversed()) {
    const renamed = vueAttributeName(attribute.name);
    if (renamed === undefined) {
      continue;
    }
    output =
      output.slice(0, attribute.start) + renamed + output.slice(attribute.end);
  }
  return output;
}
