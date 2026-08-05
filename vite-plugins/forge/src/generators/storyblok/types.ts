/**
 * Shared types for the Storyblok emitter.
 *
 * These describe the writable subset of a Storyblok *component object* (the
 * shape the Management API's "create a component" endpoint and `storyblok
 * push-components` consume), the per-field analysis the wrapper emitter needs,
 * and the small internal helper types used while classifying prop types.
 */

/** A Storyblok schema field (the value of one entry in a component's `schema`). */
export interface StoryblokSchemaField {
  /** The Storyblok field type (`text`, `number`, `boolean`, `option`, `bloks`). */
  type: 'text' | 'number' | 'boolean' | 'option' | 'bloks';
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
  /** Editor icon colour (left unset by the generator). */
  color: string | null;
  /** Editor icon (left unset by the generator). */
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
}

/** The full result of analysing one neutral component for Storyblok. */
export interface AnalyzedStoryblokComponent {
  /** The emitted Storyblok component object. */
  component: StoryblokComponent;
  /** The analysed fields, in schema order. */
  fields: AnalyzedField[];
}

/** Identifying names for a discovered neutral component. */
export interface StoryblokComponentNames {
  /** The neutral export name, e.g. `ForgeBadge`. */
  neutralName: string;
  /** The public name the component ships under, e.g. `Badge`. */
  publicName: string;
  /** The exported props interface name, e.g. `BadgeProperties` (if any). */
  propertiesType?: string;
}

/** A literal default value extracted from a component body. */
export type DefaultValue = string | number | boolean;

/** The schema field kind a prop type maps to (`undefined` → drop the prop). */
export type FieldKind =
  | { type: 'text' }
  | { type: 'number' }
  | { type: 'boolean' }
  | { type: 'option'; options: string[] }
  | { type: 'bloks' }
  | undefined;
