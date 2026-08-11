/**
 * The platform-neutral projection of a neutral Forge component's props.
 *
 * Every CMS target (Storyblok, Astro, Ghost, Jekyll, Webflow, …) needs the same
 * facts about a component before it can emit a schema or a template: which
 * props are authorable, what *kind* of content each one holds, whether it is
 * required, what its literal default is, and which props are really slots. The
 * {@link ContentComponent} produced by `analyzeContentComponent` carries exactly
 * those facts and nothing platform-specific, so a target only has to map the
 * neutral {@link ContentFieldKind} onto its own field vocabulary.
 */

/** A literal default value a prop can carry. */
export type ContentDefaultValue = string | number | boolean;

/**
 * The content kind a prop's TypeScript type maps to.
 *
 * `undefined` is never modelled here — a prop that cannot be projected onto a
 * content field (a callback, an opaque object) is simply dropped by the
 * classifier, which returns `undefined` instead of a kind.
 */
export type ContentFieldKind =
  | { readonly kind: "text" }
  | { readonly kind: "richtext" }
  | { readonly kind: "number" }
  | { readonly kind: "boolean" }
  | { readonly kind: "option"; readonly options: readonly string[] }
  | { readonly kind: "asset" }
  | { readonly kind: "link" }
  | { readonly kind: "children" };

/** The discriminator of a {@link ContentFieldKind}. */
export type ContentFieldKindName = ContentFieldKind["kind"];

/** A single authorable field projected from a component prop. */
export interface ContentField {
  /** The prop name as authored (`variant`). */
  readonly prop: string;
  /** Zero-based declaration order, preserved for platforms that order fields. */
  readonly position: number;
  /** The neutral content kind the prop maps to. */
  readonly kind: ContentFieldKind;
  /** The prop's TypeScript type text, verbatim (`'sm' | 'md' | 'lg'`). */
  readonly tsType: string;
  /** The prop's JSDoc description, when it has one. */
  readonly description?: string;
  /** `true` when the prop signature has no `?` token. */
  readonly required: boolean;
  /** The literal default extracted from the component body, when there is one. */
  readonly defaultValue?: ContentDefaultValue;
  /** `true` for free-text content platforms usually localise. */
  readonly translatable: boolean;
  /** `true` when the field carries nested content rather than a scalar. */
  readonly isSlot: boolean;
  /** The slot this field fills (`default` for a component's `children`). */
  readonly slotName?: string;
  /** `true` when the prop is tagged `@cmsSetting` and belongs to site-wide settings. */
  readonly setting: boolean;
}

/** Every name a content platform may ask for, derived from one component. */
export interface ContentComponentNames {
  /** The neutral export name, e.g. `ForgeBadge`. */
  readonly neutralName: string;
  /** The public export name, e.g. `Badge`. */
  readonly publicName: string;
  /** The lower-snake-case name, e.g. `badge`. */
  readonly technicalName: string;
  /** The spaced display name, e.g. `Badge`. */
  readonly displayName: string;
  /** The folder / file base name the component is authored in, e.g. `forge-badge`. */
  readonly folder: string;
  /** The exported props interface name, e.g. `BadgeProperties`. */
  readonly propertiesType?: string;
}

/** The subset of {@link ContentComponentNames} a caller supplies; the rest is derived. */
export type ContentComponentNamesInput = Pick<
  ContentComponentNames,
  "neutralName" | "publicName"
> &
  Partial<Pick<ContentComponentNames, "folder" | "propertiesType">>;

/** A component projected onto the neutral content model. */
export interface ContentComponent {
  readonly names: ContentComponentNames;
  /** Authorable fields in declaration order, slots last. */
  readonly fields: readonly ContentField[];
  /** Every slot the component renders, `default` included. */
  readonly slots: readonly string[];
  /** True when the neutral IR carries state, refs, effects, or events. */
  readonly interactive: boolean;
}

/** The fields of a component that are not slots (scalar, authorable content). */
export function contentFields(
  component: ContentComponent,
): readonly ContentField[] {
  return component.fields.filter((field) => !field.isSlot);
}

/** The fields of a component that carry nested content. */
export function slotFields(
  component: ContentComponent,
): readonly ContentField[] {
  return component.fields.filter((field) => field.isSlot);
}
