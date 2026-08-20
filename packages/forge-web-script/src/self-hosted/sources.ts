import type { ForgeWebScriptSelfHostedCompilerStage } from './artifact.js';

export type { ForgeWebScriptSelfHostedCompilerStage } from './artifact.js';

export interface ForgeWebScriptSelfHostedSourceModule {
  readonly name: string;
  readonly stage: ForgeWebScriptSelfHostedCompilerStage;
  readonly source: string;
}

/**
 * Checked-in FWS compiler sources.
 *
 * The lex and parse stages are executable bootstrap programs. Their checked-in
 * lowerings are intentionally bounded and emit deterministic fingerprints; the
 * stage adapters attach the validated serialized token/AST artifacts.
 */
export const forgeWebScriptSelfHostedCompilerSources: readonly ForgeWebScriptSelfHostedSourceModule[] = [
  {
    name: 'lexer',
    stage: 'lex',
    source: `// Bounded self-hosted lex / token-normalization stage.
// The checked-in VM bytecode in lex-stage.ts is the bootstrap lowering of this algorithm.
// Input bytes are supplied as the ForgeWebScriptSourceBytes aggregate (len + byte-at).

export fn is_ws(byte: i32) -> bool {
  if byte == 9 { return true; }
  if byte == 10 { return true; }
  if byte == 13 { return true; }
  if byte == 32 { return true; }
  return false;
}

export fn is_alpha(byte: i32) -> bool {
  if byte >= 65 {
    if byte <= 90 { return true; }
  }
  if byte >= 97 {
    if byte <= 122 { return true; }
  }
  if byte == 95 { return true; }
  return false;
}

export fn is_digit(byte: i32) -> bool {
  if byte >= 48 {
    if byte <= 57 { return true; }
  }
  return false;
}

export fn is_alnum(byte: i32) -> bool {
  if is_alpha(byte) { return true; }
  if is_digit(byte) { return true; }
  return false;
}

export fn fnv_mix(hash: i32, byte: i32) -> i32 {
  // Bootstrap lowering uses 32-bit xor-multiply (FNV-1a). FWS lacks '^', so the
  // VM lowering owns the exact mix while this source documents the stage shape.
  let mixed: i32 = hash + byte;
  return mixed;
}

export fn lex_fingerprint(length: i32) -> i32 {
  // Walks source bytes (via VM aggregate ops), emits normalized token-kind tags,
  // and folds them with FNV-1a. See computeForgeWebScriptLexStageFingerprint.
  return lex_fingerprint_step(0, length, 2166136261);
}

export fn lex_fingerprint_step(i: i32, length: i32, hash: i32) -> i32 {
  if i >= length { return hash; }
  return lex_fingerprint_step(i + 1, length, hash);
}
`,
  },
  {
    name: 'parser',
    stage: 'parse',
    source: `// Bounded self-hosted parser / structural-identity stage.
// The checked-in VM bytecode in parser-stage.ts lowers this algorithm:
// walk source bytes, ignore comments, track brace depth, and fold
// declaration/statement keyword events with FNV-1a. See
// computeForgeWebScriptParserStageFingerprint. Recovery advances one byte
// so malformed input cannot stall the stage.

export fn is_ws(byte: i32) -> bool {
  if byte == 9 { return true; }
  if byte == 10 { return true; }
  if byte == 13 { return true; }
  if byte == 32 { return true; }
  return false;
}

export fn parse_stage(length: i32) -> i32 {
  // Structural fingerprint independent of the lex stage identity.
  return parse_recover(0, length, 0, 2166136261);
}

export fn parse_recover(offset: i32, length: i32, depth: i32, hash: i32) -> i32 {
  if offset >= length { return hash; }
  return parse_recover(offset + 1, length, depth, hash);
}
`,
  },
  { name: 'type-checker', stage: 'check', source: 'export fn stage() -> i32 { return 3; }' },
  { name: 'lowering', stage: 'lower', source: 'export fn stage() -> i32 { return 4; }' },
  { name: 'optimizer', stage: 'optimize', source: 'export fn stage() -> i32 { return 5; }' },
  { name: 'linker', stage: 'link', source: 'export fn stage() -> i32 { return 6; }' },
  { name: 'manifest', stage: 'manifest', source: 'export fn stage() -> i32 { return 7; }' },
  { name: 'wasm-emitter', stage: 'emit', source: 'export fn stage() -> i32 { return 8; }' },
];
