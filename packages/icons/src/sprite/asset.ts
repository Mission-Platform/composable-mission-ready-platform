import { ICON_SYMBOL_DEFINITIONS } from './definitions';
import { serializeSprite } from './serialize';

/** Deterministic SVG asset containing the package's canonical icon symbols. */
export const ICON_SPRITE_ASSET = serializeSprite(ICON_SYMBOL_DEFINITIONS);
