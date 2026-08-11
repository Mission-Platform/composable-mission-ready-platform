/**
 * Projection of the neutral content model onto Storyblok's field vocabulary.
 *
 * The shared `analyzeContentComponent` already resolved which props are
 * authorable, what kind of content each holds, its JSDoc description, literal
 * default, and slot role. All that remains here is the platform mapping —
 * neutral kind → Storyblok field type — plus the assembly of the Storyblok
 * *component object* the Management API consumes.
 */
import {
  analyzeContentComponent,
  type ContentComponent,
  type ContentField,
} from "@mission-platform/forge-cms-plugin-api";

import type {
  AnalyzedField,
  AnalyzedStoryblokComponent,
  StoryblokComponent,
  StoryblokComponentNames,
  StoryblokFieldType,
  StoryblokSchemaField,
} from "./types.js";
import type ts from "typescript";

/** The Storyblok field type a neutral content kind maps onto. */
export function contentKindToStoryblokFieldType(
  kind: ContentField["kind"],
): StoryblokFieldType {
  switch (kind.kind) {
    case "richtext": {
      return "richtext";
    }
    case "number": {
      return "number";
    }
    case "boolean": {
      return "boolean";
    }
    case "option": {
      return "option";
    }
    case "asset": {
      return "asset";
    }
    case "link": {
      return "multilink";
    }
    case "children": {
      return "bloks";
    }
    default: {
      return "text";
    }
  }
}

/**
 * Map one neutral field onto a Storyblok schema field.
 *
 * Key insertion order is significant: the emitted `<folder>.json` is compared
 * against what Storyblok's CLI produced before this projection was generalised,
 * so `type`/`pos`/`description`/`translatable`/`options`/`default_value`/
 * `required` must keep their historical order.
 */
export function contentFieldToStoryblokField(
  field: ContentField,
): StoryblokSchemaField {
  const type = contentKindToStoryblokFieldType(field.kind);
  const schemaField: StoryblokSchemaField = { type, pos: field.position };
  if (field.description !== undefined) {
    schemaField.description = field.description;
  }
  if (field.translatable) {
    schemaField.translatable = true;
  }
  if (field.kind.kind === "option") {
    schemaField.options = field.kind.options.map((value) => ({
      name: value,
      value,
    }));
  }
  if (type !== "bloks" && field.defaultValue !== undefined) {
    schemaField.default_value =
      type === "option" || type === "text"
        ? String(field.defaultValue)
        : field.defaultValue;
  }
  if (field.required) {
    schemaField.required = true;
  }
  return schemaField;
}

/** Project a neutral content component onto its Storyblok component object and fields. */
export function toStoryblokComponent(
  component: ContentComponent,
): AnalyzedStoryblokComponent {
  const fields: AnalyzedField[] = component.fields.map((field) => ({
    prop: field.prop,
    field: contentFieldToStoryblokField(field),
    isSlot: field.isSlot,
    slotName: field.slotName,
  }));

  const schema: Record<string, StoryblokSchemaField> = {};
  for (const entry of fields) {
    schema[entry.prop] = entry.field;
  }

  const technicalName = component.names.technicalName;
  /* eslint-disable unicorn/no-null -- null is required by Storyblok's component object schema. */
  const componentObject: StoryblokComponent = {
    name: technicalName,
    display_name: component.names.displayName,
    schema,
    is_root: false,
    is_nestable: true,
    real_name: technicalName,
    color: null,
    icon: null,
    preview_field: null,
    preview_tmpl: null,
    component_group_uuid: null,
  };
  /* eslint-enable unicorn/no-null */

  return { component: componentObject, fields };
}

/** Analyse a neutral component module for Storyblok. */
export function analyzeStoryblokComponent(
  sourceFile: ts.SourceFile,
  names: StoryblokComponentNames,
): AnalyzedStoryblokComponent {
  return toStoryblokComponent(analyzeContentComponent(sourceFile, names));
}

/** Emit only the Storyblok component object (the blok configuration) for a component. */
export function emitStoryblokComponent(
  sourceFile: ts.SourceFile,
  names: StoryblokComponentNames,
): StoryblokComponent {
  return analyzeStoryblokComponent(sourceFile, names).component;
}
