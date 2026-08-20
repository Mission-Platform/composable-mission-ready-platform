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
  StoryblokProjectionOptions,
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
  options: StoryblokProjectionOptions = {},
): StoryblokSchemaField {
  const type =
    field.setting && options.pluginField !== undefined
      ? "plugin"
      : contentKindToStoryblokFieldType(field.kind);
  const schemaField: StoryblokSchemaField = { type, pos: field.position };
  if (type === "plugin" && options.pluginField !== undefined) {
    schemaField.field_type = options.pluginField.fieldType;
    const requiredFields = options.pluginField.requiredFields;
    if (requiredFields !== undefined && requiredFields.length > 0) {
      schemaField.required_fields = requiredFields.join(",");
    }
  }
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

/** Turn a normalized tab label into a stable, schema-safe key base. */
function tabKeyBase(label: string): string {
  const slug = label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 0)
    .join("_");
  return `tab_${slug.length > 0 ? slug : "group"}`;
}

/** Allocate a tab key without colliding with props or another tab. */
function tabKey(label: string, usedKeys: Set<string>): string {
  const base = tabKeyBase(label);
  let key = base;
  let suffix = 2;
  while (usedKeys.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  usedKeys.add(key);
  return key;
}

/** Add synthetic tab fields and assign one deterministic position sequence. */
function assembleSchema(
  fields: AnalyzedField[],
): Record<string, StoryblokSchemaField> {
  const groups = new Map<
    string,
    { label: string; keys: string[]; key?: string }
  >();
  for (const entry of fields) {
    const label = entry.tab;
    if (label === undefined) {
      continue;
    }
    const group = groups.get(label);
    if (group === undefined) {
      groups.set(label, { label, keys: [entry.prop] });
    } else {
      group.keys.push(entry.prop);
    }
  }

  const usedKeys = new Set(fields.map((entry) => entry.prop));
  for (const group of groups.values()) {
    group.key = tabKey(group.label, usedKeys);
  }

  const schema: Record<string, StoryblokSchemaField> = {};
  const emittedTabs = new Set<string>();
  let position = 0;
  for (const entry of fields) {
    const label = entry.tab;
    const group = label === undefined ? undefined : groups.get(label);
    if (group !== undefined && !emittedTabs.has(label)) {
      const key = group.key ?? tabKey(label, usedKeys);
      schema[key] = {
        type: "tab",
        display_name: label,
        keys: group.keys,
        pos: position,
      };
      emittedTabs.add(label);
      position += 1;
    }
    entry.field = { ...entry.field, pos: position };
    schema[entry.prop] = entry.field;
    position += 1;
  }
  return schema;
}

/** A resolved pair of Storyblok editor metadata values. */
export interface ResolvedStoryblokMetadata {
  icon: string;
  color: string;
}

/** Produce a stable unsigned hash for a component technical name. */
function nameHash(name: string): number {
  let hash = 2_166_136_261;
  for (const character of name) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** Normalize a caller-provided metadata value, treating blank values as absent. */
function metadataValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Resolve editor metadata once for a component.
 *
 * An explicit component annotation wins over target defaults. When neither is
 * supplied, the technical name gives the icon a stable identifier and the
 * name hash gives it a repeatable Storyblok colour.
 */
export function resolveStoryblokMetadata(
  component: ContentComponent,
  options: StoryblokProjectionOptions = {},
): ResolvedStoryblokMetadata {
  const technicalName = component.names.technicalName;
  const hash = nameHash(technicalName);
  const fallbackColor = `#${hash.toString(16).padStart(8, "0").slice(-6)}`;
  const annotatedIcon = metadataValue(component.metadata?.icon);
  const configuredIcon = metadataValue(options.metadata?.icon);
  const annotatedColor = metadataValue(component.metadata?.color);
  const configuredColor = metadataValue(options.metadata?.color);
  return {
    icon: annotatedIcon ?? configuredIcon ?? `block-icon-${technicalName}`,
    color: annotatedColor ?? configuredColor ?? fallbackColor,
  };
}

/** Project a neutral content component onto its Storyblok component object and fields. */
export function toStoryblokComponent(
  component: ContentComponent,
  options: StoryblokProjectionOptions = {},
): AnalyzedStoryblokComponent {
  const fields: AnalyzedField[] = component.fields.map((field) => ({
    prop: field.prop,
    field: contentFieldToStoryblokField(field, options),
    isSlot: field.isSlot,
    slotName: field.slotName,
    tab: field.tab,
  }));

  const schema = assembleSchema(fields);

  const technicalName = component.names.technicalName;
  const metadata = resolveStoryblokMetadata(component, options);
  /* eslint-disable unicorn/no-null -- null is required by Storyblok's component object schema. */
  const componentObject: StoryblokComponent = {
    name: technicalName,
    display_name: component.names.displayName,
    schema,
    is_root: false,
    is_nestable: true,
    real_name: technicalName,
    color: metadata.color,
    icon: metadata.icon,
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
  options: StoryblokProjectionOptions = {},
): AnalyzedStoryblokComponent {
  return toStoryblokComponent(
    analyzeContentComponent(sourceFile, names),
    options,
  );
}

/** Emit only the Storyblok component object (the blok configuration) for a component. */
export function emitStoryblokComponent(
  sourceFile: ts.SourceFile,
  names: StoryblokComponentNames,
  options: StoryblokProjectionOptions = {},
): StoryblokComponent {
  return analyzeStoryblokComponent(sourceFile, names, options).component;
}
