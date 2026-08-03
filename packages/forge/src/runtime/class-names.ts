/**
 * Framework-neutral class-name management.
 *
 * Authoring components in the neutral JSX dialect, the `class` attribute is a
 * plain string in **both** the React (`className`) and Vue (`class`) targets the
 * two-stage compiler emits. React in particular only accepts a string for
 * `className`, so — unlike Vue, which natively understands arrays/objects — the
 * conditional/array/object class forms must be collapsed to a string *before*
 * they reach the element. {@link classNames} does exactly that, the same way on
 * every framework, so a component can write:
 *
 * ```tsx
 * h('span', {
 *   class: classNames('base-badge', `base-badge--${variant}`, { 'base-badge--pill': pill }),
 * });
 * ```
 *
 * It accepts the three forms called out by the public API — a space-separated
 * string (`'a b'`), a truthiness map (`{ a: true, b: false }`), and an array
 * (`['a', condition && 'b']`) — plus any nesting/combination of them, and
 * returns the deduplicated, space-joined class string.
 */

/** A single value accepted by {@link classNames}. */
export type ClassValue =
  | string
  | number
  | bigint
  | null
  | undefined
  | boolean
  | { readonly [className: string]: boolean | null | undefined }
  | readonly ClassValue[];

/** Append the truthy class names of a single {@link ClassValue} to `classes`. */
function appendClasses(classes: string[], value: ClassValue): void {
  // Drop every falsy value (`false`, `null`, `undefined`, `''`, `0`, `0n`,
  // `NaN`) plus the truthy-but-meaningless `true`.
  if (!value || value === true) {
    return;
  }

  if (typeof value === 'string') {
    for (const token of value.split(/\s+/)) {
      if (token.length > 0) {
        classes.push(token);
      }
    }
    return;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    classes.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      appendClasses(classes, item);
    }
    return;
  }

  for (const [className, enabled] of Object.entries(value)) {
    if (enabled) {
      classes.push(className);
    }
  }
}

/**
 * Merge any number of {@link ClassValue}s into a single space-separated class
 * string, dropping falsy entries and de-duplicating repeated class names (the
 * first occurrence wins). Returns an empty string when nothing is active.
 */
export function classNames(...values: readonly ClassValue[]): string {
  const classes: string[] = [];
  for (const value of values) {
    appendClasses(classes, value);
  }
  return [...new Set(classes)].join(' ');
}
