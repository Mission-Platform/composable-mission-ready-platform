/**
 * DOM attribute aliases for the SolidJS target.
 *
 * The neutral dialect is authored in React's camelCase vocabulary
 * (`className`, `htmlFor`). SolidJS renders to the DOM using the native
 * attribute names, so those two are aliased back to `class` / `for` both in JSX
 * attributes and in the object literals passed to explicit `h(…)` calls. Event
 * handlers (`onClick`, `onInput`, …) and every other attribute are accepted by
 * Solid verbatim, so no further remapping is required.
 */

/** Neutral (React-style) attribute names that differ from SolidJS's DOM vocabulary. */
export const SOLID_ALIASES: Readonly<Record<string, string>> = {
  className: "class",
  htmlFor: "for",
};

/** Neutral element type names that resolve to Solid's `JSX.Element`. */
export const SOLID_ELEMENT_TYPE_NAMES: ReadonlySet<string> = new Set([
  "MpChild",
  "MpElement",
]);

/** The Solid type every neutral element type name resolves to. */
export const SOLID_ELEMENT_TYPE = "JSX.Element";

/** Alias a neutral attribute/prop name to its SolidJS DOM name. */
export function aliasAttributeName(name: string): string {
  return SOLID_ALIASES[name] ?? name;
}
