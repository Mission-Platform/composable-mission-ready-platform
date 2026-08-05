import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { findRepoRoot } from './paths.ts';

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
