/**
 * Name derivation helpers shared by every CMS target.
 *
 * A component's public name (e.g. `InView`) is projected onto the two naming
 * conventions content platforms ask for: a lower-snake-case *technical* name
 * (`in_view`) and a spaced *display* name (`In View`).
 */

/** Convert a public name to its technical name (`InView` → `in_view`). */
export function toTechnicalName(publicName: string): string {
  return publicName
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replaceAll(/[\s-]+/g, "_")
    .toLowerCase();
}

/** Convert a public name to its display name (`InView` → `In View`). */
export function toDisplayName(publicName: string): string {
  return publicName.replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2");
}

/** Convert a public name to a kebab-cased name (`InView` → `in-view`). */
export function toKebabName(publicName: string): string {
  return toTechnicalName(publicName).replaceAll("_", "-");
}
