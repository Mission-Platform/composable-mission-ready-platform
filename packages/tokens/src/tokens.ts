// ─── Tokens barrel ────────────────────────────────────────────────────────────
// Single entry point for all TypeScript/JavaScript design token values.
// Values are generated from the DTCG sources in `tokens/` (see scripts/generate.mjs).

import type { size } from './generated/tokens.js';

export * from './generated/tokens.js';

/** The canonical size scale shared by Forge component package APIs. */
export type SizeScale = keyof typeof size.font;
