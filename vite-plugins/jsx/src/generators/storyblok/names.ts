/**
 * Name derivation helpers for the Storyblok emitter.
 *
 * A component's public name (e.g. `InView`) is projected onto Storyblok's two
 * naming conventions: a lower-snake-case *technical* name (`in_view`) and a
 * spaced *display* name (`In View`).
 */

/** Convert a public name to its Storyblok technical name (`InView` → `in_view`). */
export function toTechnicalName(publicName: string): string {
  return publicName
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replaceAll(/[\s-]+/g, '_')
    .toLowerCase();
}

/** Convert a public name to its Storyblok display name (`InView` → `In View`). */
export function toDisplayName(publicName: string): string {
  return publicName.replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2');
}
