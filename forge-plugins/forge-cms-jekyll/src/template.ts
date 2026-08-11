/**
 * Liquid include generation.
 *
 * Jekyll has no component runtime and no module system: the only unit a site
 * author can reuse is an `_includes/*.html` partial invoked as
 * `{% include forge/badge.html variant="primary" %}`. A partial receives its
 * arguments through the ambient `include` drop, so the neutral content model is
 * projected onto Liquid in three moves:
 *
 * 1. every non-slot field is *bound* once at the top of the include, so the
 *    default extracted from the component body lives in exactly one place
 *    instead of being repeated at every use site;
 * 2. the bound values become `data-*` attributes on a single namespaced root
 *    element, which keeps the include renderable on its own and gives a site's
 *    stylesheet a stable hook that does not depend on Jekyll's own markup;
 * 3. slots stay unbound and are echoed straight from `include`, because a slot
 *    carries pre-rendered markup a `default:` filter must never touch.
 *
 * The output is deterministic — fields are emitted in declaration order — so a
 * regenerated site produces an empty diff unless a component actually changed.
 */
import {
  contentFields,
  slotFields,
  toKebabName,
} from "@mission-platform/forge-cms-plugin-api";

import type {
  ContentComponent,
  ContentDefaultValue,
  ContentField,
} from "@mission-platform/forge-cms-plugin-api";
import type {
  CompilerDiagnostic,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** The namespace used when the caller does not choose one. */
export const DEFAULT_INCLUDE_NAMESPACE = "forge";

/**
 * A Liquid literal for a neutral default value.
 *
 * Strings are single-quoted (Liquid's own convention for the `default:` filter
 * argument); numbers and booleans stay bare so Liquid keeps their type rather
 * than coercing the default to a string.
 */
export function liquidLiteral(value: ContentDefaultValue): string {
  return typeof value === "string"
    ? `'${value.replaceAll("'", String.raw`\'`)}'`
    : String(value);
}

/** The include path a component is addressed by, relative to `_includes`. */
export function includePath(
  component: ContentComponent,
  namespace: string = DEFAULT_INCLUDE_NAMESPACE,
): string {
  return `${namespace}/${component.names.technicalName}.html`;
}

/** The artifact file name of a component's include. */
export function includeFileName(
  component: ContentComponent,
  namespace: string = DEFAULT_INCLUDE_NAMESPACE,
): string {
  return `_includes/${includePath(component, namespace)}`;
}

/** The `{%- assign -%}` line that binds one non-slot field to a local. */
function assignLine(field: ContentField): string {
  const source = `include.${field.prop}`;
  return field.defaultValue === undefined
    ? `{%- assign ${field.prop} = ${source} -%}`
    : `{%- assign ${field.prop} = ${source} | default: ${liquidLiteral(
        field.defaultValue,
      )} -%}`;
}

/** Emit the Liquid include for one component. */
export function emitLiquidInclude(
  component: ContentComponent,
  namespace: string = DEFAULT_INCLUDE_NAMESPACE,
): string {
  const scalars = contentFields(component);
  const slots = slotFields(component);

  const attributes = [
    `class="${namespace}-${component.names.technicalName}"`,
    ...scalars.map(
      (field) => `data-${toKebabName(field.prop)}="{{ ${field.prop} }}"`,
    ),
  ];
  const openingTag =
    attributes.length === 1
      ? [`<div ${attributes[0]}>`]
      : ["<div", ...attributes.map((attribute) => `  ${attribute}`), ">"];

  return [
    `{%- comment -%} ${includeFileName(component, namespace)} {%- endcomment -%}`,
    ...scalars.map((field) => assignLine(field)),
    ...(scalars.length > 0 ? [""] : []),
    ...openingTag,
    ...slots.map((field) => `  {{ include.${field.prop} }}`),
    "</div>",
    "",
  ].join("\n");
}

/**
 * Collect the diagnostics the Liquid lowering reports for a component.
 *
 * Liquid can carry every neutral field kind — everything reaching an include is
 * a string in the end — so there is nothing to warn about except an ambiguity
 * Liquid itself cannot resolve: `include` is one flat namespace, so a named
 * slot sharing a name with a non-slot prop would have the prop's bound value
 * rendered where its markup was expected.
 */
export function jekyllDiagnostics(
  ir: SemanticModule,
  component: ContentComponent,
): readonly CompilerDiagnostic[] {
  const scalarNames = new Set(
    contentFields(component).map((field) => field.prop),
  );

  return component.slots
    .filter((slot) => slot !== "default" && scalarNames.has(slot))
    .map((slot) => ({
      phase: "generation" as const,
      severity: "warning" as const,
      code: "FORGE_JEKYLL_SLOT_UNSUPPORTED",
      message:
        `Named slot "${slot}" of ${component.names.publicName} collides with its "${slot}" prop; ` +
        `Liquid resolves both to \`include.${slot}\`, so the slot renders the prop's value instead of its markup.`,
      fileName: ir.fileName,
    }));
}
