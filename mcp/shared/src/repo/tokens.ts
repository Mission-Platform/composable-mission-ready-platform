import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { findRepoRoot } from "./paths.ts";

/**
 * Reads the Mission Platform design tokens (DTCG JSON) from @mission-platform/tokens.
 * Returns parsed JSON: all categories when no category is given, or one category
 * or split source when specified. Component sources can be selected by their
 * normalized relative ID, for example `component/atoms/button`, or aggregated
 * with `component` / `component/atoms`.
 */
export function readTokens(category?: string): unknown {
  const tokensDir = join(findRepoRoot(), "packages", "ui", "tokens", "tokens");
  const sources = readTokenSources(tokensDir);

  if (category) {
    const selected = selectSources(sources, category);
    if (selected.length === 0) {
      throw new Error(
        `Token category or source "${category}" not found in ${tokensDir}`,
      );
    }
    return selected.length === 1
      ? selected[0].document
      : mergeSourceDocuments(selected);
  }

  const allTokens: Record<string, unknown> = {};
  for (const source of sources) {
    const categoryName = source.id.split("/")[0];
    if (categoryName === "component") {
      const component = isRecord(allTokens.component)
        ? allTokens.component
        : {};
      allTokens.component = mergeDocuments([component, source.document]);
    } else {
      allTokens[source.id] = source.document;
    }
  }

  return allTokens;
}

interface TokenSource {
  id: string;
  document: Record<string, unknown>;
}

function normalizeSourceId(value: string): string {
  return value
    .replaceAll("\\", "/")
    .replace(/^\.?\//, "")
    .replace(/^tokens\//, "")
    .replace(/\.tokens\.json$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function readTokenSources(tokensDir: string): TokenSource[] {
  if (!existsSync(tokensDir)) return [];

  const sources: TokenSource[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, {
      withFileTypes: true,
    }).toSorted((a, b) => a.name.localeCompare(b.name))) {
      const filePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile() && entry.name.endsWith(".tokens.json")) {
        const id = normalizeSourceId(relative(tokensDir, filePath));
        sources.push({
          document: JSON.parse(readFileSync(filePath, "utf8")) as Record<
            string,
            unknown
          >,
          id,
        });
      }
    }
  };

  visit(tokensDir);
  return sources.toSorted((a, b) => a.id.localeCompare(b.id));
}

function selectSources(
  sources: TokenSource[],
  category: string,
): TokenSource[] {
  const normalized = normalizeSourceId(category);
  return sources.filter(
    (source) =>
      source.id === normalized || source.id.startsWith(`${normalized}/`),
  );
}

function mergeSourceDocuments(sources: TokenSource[]): Record<string, unknown> {
  return mergeDocuments(sources.map((source) => source.document));
}

function mergeDocuments(
  documents: Record<string, unknown>[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const document of documents) mergeInto(result, document);
  return result;
}

function mergeInto(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (isRecord(existing) && isRecord(value)) {
      mergeInto(existing, value);
    } else if (!(key in target)) {
      target[key] = value;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A single overridable design-token CSS custom property. */
export interface TokenVariable {
  /** CSS custom-property name, e.g. `--mp-color-primary-default`. */
  name: string;
  /** Stable DTCG path used by Figma and runtime overrides. */
  path: string;
  /** Source ID relative to packages/ui/tokens/tokens, when known. */
  source?: string;
  /** Top-level DTCG group the token belongs to, e.g. `color`, `radius`, `font`. */
  group: string;
  /** DTCG `$description`, when present. */
  description?: string;
}

/**
 * Flatten the DTCG token sources into the flat list of overridable `--mp-*` CSS
 * custom-property names (optionally scoped to one category or split source), so a
 * consumer knows exactly which variables they can redefine. Component paths
 * intentionally omit the `component` wrapper from generated CSS names while
 * retaining it in `path`. Duplicate names are collapsed to one entry.
 */
export function listOverridableTokenVariables(
  category?: string,
  prefix = "mp",
): TokenVariable[] {
  const tokensDir = join(findRepoRoot(), "packages", "ui", "tokens", "tokens");
  const sources = readTokenSources(tokensDir);
  const selected = category ? selectSources(sources, category) : sources;
  if (category && selected.length === 0) {
    throw new Error(
      `Token category or source "${category}" not found in ${tokensDir}`,
    );
  }

  const byName = new Map<string, TokenVariable>();
  const walk = (node: unknown, segments: string[], source: string): void => {
    if (typeof node !== "object" || node === null) return;
    const record = node as Record<string, unknown>;
    if ("$value" in record) {
      const cssSegments =
        segments[0] === "component" ? segments.slice(1) : segments;
      const name = `--${prefix}-${cssSegments.join("-")}`;
      if (!byName.has(name)) {
        byName.set(name, {
          name,
          path: segments.join("."),
          source,
          group: cssSegments[0] ?? "",
          description:
            typeof record.$description === "string"
              ? record.$description
              : undefined,
        });
      }
      return;
    }
    for (const [key, child] of Object.entries(record)) {
      if (key.startsWith("$")) continue;
      walk(child, [...segments, key], source);
    }
  };

  for (const source of selected) walk(source.document, [], source.id);
  return [...byName.values()].toSorted((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
}
