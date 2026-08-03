/**
 * DOM attribute aliases for the SolidJS target.
 *
 * The neutral dialect is authored in React's camelCase vocabulary
 * (`className`, `htmlFor`). SolidJS renders to the DOM using the native
 * attribute names, so those two are aliased back to `class` / `for` both in JSX
 * attributes and in the object literals passed to explicit `h(…)` calls. Event
 * handlers (`onClick`, `onInput`, …) and the remaining attributes are accepted
 * by Solid verbatim, so no further remapping is required.
 */

/** Neutral (React-style) attribute names that differ from SolidJS's DOM vocabulary. */
export const SOLID_ALIASES: Readonly<Record<string, string>> = {
  className: 'class',
  htmlFor: 'for',
};
