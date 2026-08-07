import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {findRepoRoot} from './paths.ts';

/**
 * Reads the Mission Platform design tokens (DTCG JSON) from @mission-platform/tokens.
 * Returns parsed JSON: all categories when no category is given, or one category
 * when specified.
 */
export function readTokens(category?: string): unknown {
  const tokensDir = join(findRepoRoot(), 'packages', 'tokens', 'tokens');

  if (category) {
    const filename = `${category}.tokens.json`;
    const filePath = join(tokensDir, filename);

    if (!existsSync(filePath)) {
      throw new Error(`Token category "${category}" not found in ${tokensDir}`);
    }

    return JSON.parse(readFileSync(filePath, 'utf8'));
  }

  // No category: read all *.tokens.json files in the directory.
  const files = readdirSync(tokensDir).filter((file) => file.endsWith('.tokens.json'));
  const allTokens: Record<string, unknown> = {};

  for (const file of files) {
    const cat = file.replace('.tokens.json', '');
    allTokens[cat] = JSON.parse(readFileSync(join(tokensDir, file), 'utf8'));
  }

  return allTokens;
}

/** A single overridable design-token CSS custom property. */
export interface TokenVariable {
  /** CSS custom-property name, e.g. `--mp-color-primary-default`. */
  name: string;
  /** Top-level DTCG group the token belongs to, e.g. `color`, `radius`, `font`. */
  group: string;
  /** DTCG `$description`, when present. */
  description?: string;
}

/**
 * Flatten the DTCG token sources into the flat list of overridable `--mp-*` CSS
 * custom-property names (optionally scoped to one category), so a consumer knows
 * exactly which variables they can redefine. Names are derived the same way the
 * token generator derives them: the DTCG path joined with `-`, prefixed `--mp-`.
 * Duplicate names (e.g. the same semantic colour in the light and dark theme
 * files) are collapsed to a single entry.
 */
export function listOverridableTokenVariables(category?: string, prefix = 'mp'): TokenVariable[] {
  const documents = category
    ? {[category]: readTokens(category)}
    : (readTokens() as Record<string, unknown>);

  const byName = new Map<string, TokenVariable>();
  const walk = (node: unknown, segments: string[]): void => {
    if (typeof node !== 'object' || node === null) return;
    const record = node as Record<string, unknown>;
    if ('$value' in record) {
      const name = `--${prefix}-${segments.join('-')}`;
      if (!byName.has(name)) {
        byName.set(name, {
          name,
          group: segments[0] ?? '',
          description: typeof record.$description === 'string' ? record.$description : undefined,
        });
      }
      return;
    }
    for (const [key, child] of Object.entries(record)) {
      if (key.startsWith('$')) continue;
      walk(child, [...segments, key]);
    }
  };

  for (const document_ of Object.values(documents)) walk(document_, []);
  return [...byName.values()].toSorted((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
