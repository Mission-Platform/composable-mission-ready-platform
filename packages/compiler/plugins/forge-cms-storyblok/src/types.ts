/**
 * Shared types for the Storyblok target.
 *
 * These describe the writable subset of a Storyblok *component object* (the
 * shape the Management API's "create a component" endpoint and `storyblok
 * push-components` consume) and the per-field analysis the wrapper emitter
 * needs. Prop classification itself lives in the shared content model, so this
 * file no longer owns any type-analysis helpers.
 */
import type { ContentComponentNamesInput } from "@mission-platform/forge-cms-plugin-api";

/** The Storyblok field types the neutral content kinds map onto. */
export type StoryblokFieldType =
  | "text"
  | "richtext"
  | "number"
  | "boolean"
  | "option"
  | "asset"
  | "multilink"
  | "bloks"
  | "tab"
  | "plugin";

/** Configuration for Storyblok's plugin-backed schema field contract. */
export interface StoryblokPluginFieldOptions {
  /** The plugin field identifier supplied as Storyblok's `field_type`. */
  readonly fieldType: string;
  /** Storyblok field names required by the plugin, when applicable. */
  readonly requiredFields?: readonly string[];
}

/** Optional Storyblok editor metadata defaults supplied by a target caller. */
export interface StoryblokMetadataOptions {
  readonly icon?: string;
  readonly color?: string;
}

/** Options shared by every projection of a neutral component onto Storyblok. */
export interface StoryblokProjectionOptions {
  readonly pluginField?: StoryblokPluginFieldOptions;
  readonly metadata?: StoryblokMetadataOptions;
}

/** A Storyblok schema field (the value of one entry in a component's `schema`). */
export interface StoryblokSchemaField {
  /** The Storyblok field type (`text`, `number`, `boolean`, `option`, `bloks`, …). */
  type: StoryblokFieldType;
  /** Ordinal position of the field within the schema. */
  pos: number;
  /** The field's help text, taken from the prop's JSDoc. */
  description?: string;
  /** Whether the field's value is localisable (set for free-text fields). */
  translatable?: boolean;
  /** The self-sourced options of an `option` field. */
  options?: { name: string; value: string }[];
  /** The field's default value (`option`/`text` → string, `number`/`boolean` → primitive). */
  default_value?: string | number | boolean;
  /** Whether the field is mandatory (set for non-optional props). */
  required?: boolean;
  /** Human-readable label for a synthetic Storyblok editor tab. */
  display_name?: string;
  /** Actual prop keys grouped under a synthetic Storyblok editor tab. */
  keys?: string[];
  /** The plugin field identifier for `type: "plugin"` fields. */
  field_type?: string;
  /** Comma-separated required field names for plugin fields. */
  required_fields?: string;
}

/** A Storyblok *component object* (the writable subset consumed when pushing components). */
export interface StoryblokComponent {
  /** The technical, lower-snake-case component name (e.g. `in_view`). */
  name: string;
  /** The human-friendly name shown in the editor (e.g. `In View`). */
  display_name: string;
  /** The component fields, keyed by field name. */
  schema: Record<string, StoryblokSchemaField>;
  /** `true` when the component may be used as a content type (root block). */
  is_root: boolean;
  /** `true` when the component may be nested inside `bloks` fields. */
  is_nestable: boolean;
  /** Mirrors {@link StoryblokComponent.name}; Storyblok keeps both. */
  real_name: string;
  /** Editor icon colour, resolved from annotations, target defaults, or the component name. */
  color: string | null;
  /** Editor icon, resolved from annotations, target defaults, or the component name. */
  icon: string | null;
  /** Field used to preview the component (left unset by the generator). */
  preview_field: string | null;
  /** Preview template (left unset by the generator). */
  preview_tmpl: string | null;
  /** Component group UUID (left unset by the generator). */
  component_group_uuid: string | null;
}

/** One analysed prop, carrying both its schema field and the data needed to wire a wrapper. */
export interface AnalyzedField {
  /** The original prop name, used as the schema field key and the wrapped component prop. */
  prop: string;
  /** The resolved schema field. */
  field: StoryblokSchemaField;
  /** Whether this field is a nestable `bloks` field (a slot). */
  isSlot: boolean;
  /** The wrapped component's slot name a `bloks` field feeds (`default` or a named slot). */
  slotName?: string;
  /** The optional editor tab label carried from the neutral content model. */
  tab?: string;
}

/** The full result of analysing one neutral component for Storyblok. */
export interface AnalyzedStoryblokComponent {
  /** The emitted Storyblok component object. */
  component: StoryblokComponent;
  /** The analysed fields, in schema order. */
  fields: AnalyzedField[];
}

/**
 * Identifying names for a discovered neutral component.
 *
 * The names themselves are derived by the shared content model; this alias
 * keeps the Storyblok-facing signature readable.
 */
export type StoryblokComponentNames = ContentComponentNamesInput;
