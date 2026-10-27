import type { PropIntention, SemanticModule } from "../ir.js";

/**
 * A normalized, target-agnostic prop description.
 */
export interface NormalizedProp {
  readonly name: string;
  readonly optional: boolean;
  readonly typeText: string;
  readonly defaultValue?: string;
  readonly bindingKind?: string;
}

/**
 * The normalized props contract of a component.
 */
export interface NormalizedPropsContract {
  readonly parameterName: string;
  readonly typeText?: string;
  readonly props: readonly NormalizedProp[];
  readonly hasDefaults: boolean;
}

/**
 * The fallback type string when no declared or inferred type is present.
 */
export const UNKNOWN_PROP_TYPE = "unknown";

/**
 * Resolves the type string for a prop intention.
 */
export function resolvePropTypeText(prop: PropIntention): string {
  if (prop.type?.text && prop.type.text.trim().length > 0) {
    return prop.type.text.trim();
  }
  return UNKNOWN_PROP_TYPE;
}

/**
 * Canonicalizes the props contract from a `SemanticModule`.
 *
 * @param module - The semantic module to inspect.
 * @param defaultParameterName - The fallback props parameter name when none is declared (default: 'props').
 * @returns Canonical props contract.
 */
export function canonicalizePropsContract(
  module: SemanticModule,
  defaultParameterName = "props",
): NormalizedPropsContract {
  const intentions = module.intentions;
  const parameterName = intentions.propsParameterName ?? defaultParameterName;
  const typeText = intentions.propsType?.text;

  const props: NormalizedProp[] = intentions.props.map((prop) => {
    return {
      name: prop.name,
      optional: prop.optional,
      typeText: resolvePropTypeText(prop),
      defaultValue: prop.defaultValue?.text,
    };
  });

  const hasDefaults = props.some((prop) => prop.defaultValue !== undefined);

  return {
    parameterName,
    typeText,
    props,
    hasDefaults,
  };
}
