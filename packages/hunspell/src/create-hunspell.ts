import type { HunspellModule } from './types'

/**
 * Lazily loads the Emscripten-compiled Hunspell WASM module.
 *
 * The import is dynamic so that the WASM bundle is only fetched when
 * spell-checking is actually enabled — it is never part of the initial chunk.
 *
 * The `.wasm` file is resolved at runtime relative to `hunspell.js` via the
 * `locateFile` hook so that bundlers (Vite, webpack) can handle the asset URL.
 */
export async function createHunspell(): Promise<HunspellModule> {
  const { default: factory } = await import('./wasm/hunspell.js')

  return await factory()
}
