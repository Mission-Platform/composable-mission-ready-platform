/**
 * Webflow **Code Component** declaration generation.
 *
 * Webflow has two ways to teach the Designer about a component, and only one of
 * them can carry authorable props. The Designer API can create *elements* but
 * has no endpoint for component properties, so a library published through it
 * would arrive with every prop hard-coded. Code Components take the opposite
 * route: a `declareComponent(Component, { props })` call ships *with* the
 * component and the Designer reads the prop contract out of it. This module
 * therefore emits one `<PublicName>.webflow.tsx` declaration per component,
 * wrapping the React component the bound framework plugin co-generated into the
 * sibling `island/` tree.
 *
 * Two details of Webflow's vocabulary shape the output:
 *
 * - **There is no numeric prop type.** `props.Text` is the only honest landing
 *   place for a `number` field, so the value survives as a string and the
 *   analysed default is quoted to match; the loss is reported as a warning
 *   rather than silently absorbed.
 * - **The declaration keys are React prop names, not neutral field names.** The
 *   default slot is modelled as the `content` field by the neutral analyser but
 *   reaches the React island as `children`, so that one key is rewritten while
 *   its human-facing label stays `Content`.
 */
import {
  contentFields,
  slotFields,
  toDisplayName,
} from "@mission-platform/forge-cms-plugin-api";

import { FORGE_WEBFLOW_NUMBER_AS_TEXT, webflowWarning } from "./diagnostics.js";

import type {
  ContentComponent,
  ContentField,
  ContentFieldKind,
} from "@mission-platform/forge-cms-plugin-api";
import type { CompilerDiagnostic } from "@mission-platform/forge-plugin-api";

/** The island specifier used when the driver co-generated none (tests, dry runs). */
export const DEFAULT_ISLAND_ENTRY = "./island/index.js";

/** The component group the Designer files a library's components under. */
export const DEFAULT_WEBFLOW_GROUP = "Mission Platform";

/** The `@webflow/data-types` factory a neutral field kind is authored with. */
export type WebflowPropertyType =
  | "props.Image"
  | "props.Link"
  | "props.RichText"
  | "props.Slot"
  | "props.Text"
  | "props.Variant"
  | "props.Visibility";

/** The React prop key the default slot arrives under. */
const REACT_CHILDREN_PROPERTY = "children";

/**
 * Map a neutral content kind onto Webflow's prop vocabulary.
 *
 * `number` is the one lossy row: Webflow exposes no numeric prop, so the field
 * degrades to text and {@link webflowDeclarationDiagnostics} reports it.
 */
export function webflowPropertyType(
  kind: ContentFieldKind,
): WebflowPropertyType {
  switch (kind.kind) {
    case "richtext": {
      return "props.RichText";
    }
    case "boolean": {
      return "props.Visibility";
    }
    case "option": {
      return "props.Variant";
    }
    case "asset": {
      return "props.Image";
    }
    case "link": {
      return "props.Link";
    }
    case "children": {
      return "props.Slot";
    }
    default: {
      return "props.Text";
    }
  }
}

/** A single-quoted JavaScript string literal, escaped for the emitted source. */
function stringLiteral(value: string): string {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", String.raw`\'`)}'`;
}

/** The human-facing label a prop is shown under in the Designer. */
export function webflowDisplayName(name: string): string {
  const spaced = toDisplayName(name);
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The declaration key a field is authored under — its React prop name. */
export function webflowPropertyName(field: ContentField): string {
  return field.slotName === "default" ? REACT_CHILDREN_PROPERTY : field.prop;
}

/**
 * The `defaultValue` literal for a field, or `undefined` when it has none.
 *
 * A numeric default is quoted because the field itself was degraded to
 * `props.Text`; handing Webflow a bare number for a text prop would be a type
 * error in the emitted declaration.
 */
function defaultValueLiteral(field: ContentField): string | undefined {
  const value = field.defaultValue;
  if (value === undefined) {
    return undefined;
  }
  if (field.kind.kind === "number") {
    return stringLiteral(String(value));
  }
  return typeof value === "string" ? stringLiteral(value) : String(value);
}

/** The `<key>: props.X({ … })` line for one field. */
function propertyEntry(field: ContentField): string {
  const parts = [`name: ${stringLiteral(webflowDisplayName(field.prop))}`];
  if (field.kind.kind === "option") {
    const options = field.kind.options
      .map((option) => stringLiteral(option))
      .join(", ");
    parts.push(`options: [${options}]`);
  }
  const defaultValue = defaultValueLiteral(field);
  if (defaultValue !== undefined) {
    parts.push(`defaultValue: ${defaultValue}`);
  }
  return `    ${webflowPropertyName(field)}: ${webflowPropertyType(field.kind)}({ ${parts.join(", ")} }),`;
}

/**
 * The description the Designer shows for the component.
 *
 * The neutral content model carries no component-level description, so the
 * first field that documents itself stands in for one — a library whose props
 * are documented gets a documented component, and one whose props are not gets
 * no `description` key at all rather than an invented sentence.
 */
export function webflowDescription(
  component: ContentComponent,
): string | undefined {
  return component.fields.find((field) => field.description !== undefined)
    ?.description;
}

/** The file a component's declaration is written to. */
export function declarationFileName(component: ContentComponent): string {
  return `${component.names.publicName}.webflow.tsx`;
}

/** Options for {@link emitWebflowDeclaration}. */
export interface WebflowDeclarationOptions {
  /** Specifier of the co-generated island the declaration wraps. */
  readonly islandEntry?: string;
  /** The Designer group the component is filed under. */
  readonly group?: string;
}

/**
 * Emit the Code Component declaration for one component.
 *
 * Field order is the analysed declaration order with slots trailing it, so a
 * regenerated library produces an empty diff when nothing about the component
 * changed. The `@webflow/data-types` import is omitted for a component with no
 * authorable props, which keeps the emitted module free of unused bindings.
 */
export function emitWebflowDeclaration(
  component: ContentComponent,
  options: WebflowDeclarationOptions = {},
): string {
  const name = component.names.publicName;
  const fields = [...contentFields(component), ...slotFields(component)];
  const description = webflowDescription(component);

  const imports = [
    ...(fields.length > 0
      ? ["import { props } from '@webflow/data-types';"]
      : []),
    "import { declareComponent } from '@webflow/react';",
    "",
    `import { ${name} } from '${options.islandEntry ?? DEFAULT_ISLAND_ENTRY}';`,
  ];

  const body = [
    `export default declareComponent(${name}, {`,
    `  name: ${stringLiteral(component.names.displayName)},`,
    ...(description === undefined
      ? []
      : [`  description: ${stringLiteral(description)},`]),
    `  group: ${stringLiteral(options.group ?? DEFAULT_WEBFLOW_GROUP)},`,
    ...(fields.length === 0
      ? ["  props: {},"]
      : ["  props: {", ...fields.map((field) => propertyEntry(field)), "  },"]),
    "});",
  ];

  return [...imports, "", ...body, ""].join("\n");
}

/**
 * The diagnostics emitting one component's declaration produces.
 *
 * Only `number` is reported. Every other neutral kind has an exact Webflow
 * counterpart, so a silent build means a lossless projection.
 */
export function webflowDeclarationDiagnostics(
  component: ContentComponent,
  fileName: string,
): readonly CompilerDiagnostic[] {
  return contentFields(component)
    .filter((field) => field.kind.kind === "number")
    .map((field) =>
      webflowWarning(
        FORGE_WEBFLOW_NUMBER_AS_TEXT,
        `Webflow has no numeric prop type; "${field.prop}" on ${component.names.publicName} is authored as a text prop.`,
        fileName,
      ),
    );
}
