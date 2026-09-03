/**
 * Handlebars partial generation for the Ghost target.
 *
 * Ghost themes have no component model and no module system: the closest thing
 * to a Forge component is a *partial* under `partials/`, invoked with
 * `{{> forge/badge variant="primary"}}`. So each neutral component is projected
 * onto exactly one `.hbs` partial whose hash parameters are the component's
 * authorable fields.
 *
 * Three properties of Handlebars drive the emitted shape:
 *
 * - **There are no defaults.** A missing hash parameter is simply falsy, so a
 *   neutral `defaultValue` has to be re-expressed as an inline
 *   `{{#if x}}{{x}}{{else}}<default>{{/if}}` fallback. Fields without a default
 *   get the bare `{{#if x}}…{{/if}}` guard so an unset parameter renders
 *   nothing rather than the literal string `undefined`.
 * - **Block content arrives as `@partial-block`,** not as a named argument, so
 *   the default slot is rendered with `{{#if @partial-block}}{{> @partial-block}}{{/if}}`
 *   and only *named* slots can be passed as (pre-rendered, unescaped) hash
 *   parameters.
 * - **A theme styles what it can select.** Every non-slot field is therefore
 *   also mirrored onto a `data-*` attribute of the root element, which lets a
 *   theme author restyle the component without the generated markup having to
 *   guess at class names.
 */
import {
  contentFields,
  slotFields,
  toKebabName,
} from "@mission-platform/forge-cms-plugin-api";

import { FORGE_GHOST_FIELD_UNSUPPORTED, ghostWarning } from "./diagnostics.js";

import type {
  ContentComponent,
  ContentField,
} from "@mission-platform/forge-cms-plugin-api";
import type { CompilerDiagnostic } from "@mission-platform/forge-plugin-api";

/** The partial name a component is invoked under (`{{> forge/badge}}`). */
export function ghostPartialName(component: ContentComponent): string {
  return `forge/${component.names.technicalName}`;
}

/** The theme-relative path the partial is written to. */
export function ghostPartialFileName(component: ContentComponent): string {
  return `partials/${ghostPartialName(component)}.hbs`;
}

/** The `data-*` attribute a field is mirrored onto for theme-side styling. */
function dataAttribute(field: ContentField): string {
  return `data-${toKebabName(field.prop)}="{{${field.prop}}}"`;
}

/** The guarded expression that renders one non-slot field's value. */
function fieldExpression(field: ContentField): string {
  return field.defaultValue === undefined
    ? `{{#if ${field.prop}}}{{${field.prop}}}{{/if}}`
    : `{{#if ${field.prop}}}{{${field.prop}}}{{else}}${String(field.defaultValue)}{{/if}}`;
}

/**
 * The expression that renders one slot.
 *
 * The default slot is the partial's block content; a named slot is a hash
 * parameter carrying already-rendered markup, so it is emitted unescaped.
 */
function slotExpression(field: ContentField): string {
  return field.slotName === "default"
    ? "{{#if @partial-block}}{{> @partial-block}}{{/if}}"
    : `{{#if ${field.prop}}}{{{${field.prop}}}}{{/if}}`;
}

/**
 * Emit the Handlebars partial for one component.
 *
 * The output is deterministic — fields keep their declaration order and slots
 * trail them — so a regenerated theme produces an empty diff when nothing about
 * the component changed.
 */
export function emitGhostPartial(component: ContentComponent): string {
  const technical = component.names.technicalName;
  const fields = contentFields(component);
  const slots = slotFields(component);
  const root = `forge-${technical}`;

  const attributes = fields.map((field) => `  ${dataAttribute(field)}`);
  const open =
    attributes.length === 0
      ? `<div class="${root}">`
      : [`<div class="${root}"`, ...attributes, ">"].join("\n");

  const body = [
    ...fields.map(
      (field) =>
        `  <span class="${root}__${toKebabName(field.prop)}">${fieldExpression(field)}</span>`,
    ),
    ...slots.map((field) => `  ${slotExpression(field)}`),
  ];

  return [
    `{{!-- partials/forge/${technical}.hbs --}}`,
    open,
    ...body,
    "</div>",
    "",
  ].join("\n");
}

/**
 * The diagnostics emitting one component's partial produces.
 *
 * Only `number` is reported: Ghost has no numeric type anywhere in its theme
 * API, so the value survives as rendered text and any arithmetic a theme wants
 * to do with it has to happen before the partial is invoked.
 */
export function ghostTemplateDiagnostics(
  component: ContentComponent,
  fileName: string,
): readonly CompilerDiagnostic[] {
  return contentFields(component)
    .filter((field) => field.kind.kind === "number")
    .map((field) =>
      ghostWarning(
        FORGE_GHOST_FIELD_UNSUPPORTED,
        `Ghost has no numeric field type; "${field.prop}" on ${component.names.publicName} is rendered as text.`,
        fileName,
      ),
    );
}
