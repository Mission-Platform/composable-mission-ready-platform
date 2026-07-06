/**
 * DOM attribute aliases for the React target.
 *
 * A handful of DOM attribute names differ between the neutral dialect and
 * React's vocabulary; these are aliased both in JSX attributes and in the
 * object literals passed to explicit `h(…)` calls.
 */

/** DOM attribute names that differ between the neutral dialect and React. */
export const REACT_ALIASES: Readonly<Record<string, string>> = {
  class: 'className',
  for: 'htmlFor',
};
