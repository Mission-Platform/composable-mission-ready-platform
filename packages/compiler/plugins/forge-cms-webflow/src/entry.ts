/**
 * The module entry barrel for the Webflow target.
 *
 * Webflow itself never imports this file — it globs the built declarations
 * listed in `webflow.json` — but the shared build helpers bundle the target
 * through a single entry, so the barrel is what makes every declaration reach
 * `dist/cms/webflow/react/`. It also gives a consumer a typed way to import a
 * declaration directly, for a test or a custom registration step.
 *
 * Each declaration is re-exported as `<PublicName>Component` — `Badge` becomes
 * `BadgeComponent`. The suffix is not decoration: the same output tree also
 * contains the co-generated island, whose barrel exports every component under
 * its bare public name, so an unsuffixed re-export could shadow the very
 * component the declaration wraps. A neutral component the author called
 * `ForgeBadgeComponent` is the only way to reach the suffixed name, and it
 * would then have no bare `Badge` export to collide with.
 */
import type { ContentComponent } from "@mission-platform/forge-cms-plugin-api";

/** The barrel export name a component's declaration is re-exported under. */
export function entryExportName(component: ContentComponent): string {
  return `${component.names.publicName}Component`;
}

/** Emit the `index.ts` barrel re-exporting every emitted declaration. */
export function emitWebflowEntry(
  components: readonly ContentComponent[],
): string {
  const lines = components.map(
    (component) =>
      `export { default as ${entryExportName(component)} } from './${component.names.publicName}.webflow.js';`,
  );
  return `${lines.join("\n")}\n`;
}
