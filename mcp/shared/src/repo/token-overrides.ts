/**
 * Design-token *override* transform.
 *
 * The implementation now lives in the reusable
 * `@mission-platform/vite-plugin-token-overrides` package (which lifts the former
 * per-app `generate-token-overrides.ts` script into a Vite plugin). This module
 * re-exports the transform so the consumer MCP `generate_token_override` tool
 * keeps a single source of truth with the plugin.
 *
 * It additionally exposes the plugin's JSON Schema for override documents and a
 * lightweight validator that flags override keys which don't map to any known
 * `--mp-*` token, so MCP tools can surface both the schema and typo warnings.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  flattenOverrides,
  type OverrideGroup,
} from "@mission-platform/vite-plugin-token-overrides/transform";

import { findRepoRoot } from "./paths.ts";
import { listOverridableTokenVariables } from "./tokens.ts";

export {
  buildTokenOverrideScss,
  flattenOverrides,
  type FlatOverride,
  type LightDarkValue,
  type OverrideGroup,
  type OverrideToken,
  type OverrideValue,
  type TokenOverrideScssOptions,
} from "@mission-platform/vite-plugin-token-overrides/transform";

/** Absolute path to the override document JSON Schema shipped by the plugin. */
export function tokenOverrideSchemaPath(): string {
  return join(
    findRepoRoot(),
    "vite-plugins",
    "token-overrides",
    "schema",
    "token-overrides.schema.json",
  );
}

/**
 * Read the DTCG override-document JSON Schema (Draft 2020-12) shipped by
 * `@mission-platform/vite-plugin-token-overrides`. The schema enumerates every
 * overridable token key defined by `@mission-platform/tokens`, so editors and
 * agents can validate/autocomplete `*.tokens.json` override documents.
 */
export function readTokenOverrideSchema(): unknown {
  const path = tokenOverrideSchemaPath();
  if (!existsSync(path)) {
    throw new Error(`Token-override schema not found at ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Result of {@link validateOverrideDocument}. */
export interface OverrideValidation {
  /** Total number of override leaves (`$value` tokens) in the document. */
  total: number;
  /**
   * Custom-property names produced by the document that don't match any known
   * `--mp-*` token from `@mission-platform/tokens` — usually typos or
   * app-specific tokens. Non-fatal: the transform still emits them verbatim.
   */
  unknownKeys: string[];
}

/**
 * Validate an override document against the set of overridable Mission Platform
 * tokens. Every leaf is flattened to its `--<prefix>-*` custom-property name and
 * checked against {@link listOverridableTokenVariables}; names with no match are
 * returned in `unknownKeys` so callers can warn about likely typos.
 */
export function validateOverrideDocument(
  document_: OverrideGroup,
  prefix = "mp",
): OverrideValidation {
  const known = new Set(
    listOverridableTokenVariables(undefined, prefix).map(
      (variable) => variable.name,
    ),
  );
  const overrides = flattenOverrides(document_, prefix);
  const unknownKeys = overrides
    .map((override) => override.name)
    .filter((name) => !known.has(name));
  return { total: overrides.length, unknownKeys };
}
