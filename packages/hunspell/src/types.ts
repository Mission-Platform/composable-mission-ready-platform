// Re-export the auto-generated types that Emscripten emitted at build time.
// `MainModule` is re-exported under the friendlier `HunspellModule` alias.
export type {
  MainModule as HunspellModule,
  HunspellChecker,
  StringVector,
  TokenResult,
  TokenResultVector,
} from './wasm/hunspell';
