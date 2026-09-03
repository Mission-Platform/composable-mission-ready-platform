/**
 * A single grammar or style issue reported by Harper.
 *
 * Positions are zero-based character offsets into the checked text, matching
 * the span data returned by the harper.js WebAssembly engine.
 */
export interface HarperIssue {
  /** The flagged text span. */
  text: string;
  /** Zero-based start offset in the source string. */
  offset: number;
  /** Character length of the flagged span. */
  length: number;
  /** Human-readable description of the rule violation. */
  message: string;
  /** Rule identifier, e.g. `"harper/SpellCheck"`. */
  ruleId: string;
  /**
   * LSP-style severity:
   *  1 = Error, 2 = Warning, 3 = Information, 4 = Hint
   */
  severity: 1 | 2 | 3 | 4;
  /** Replacement candidates offered by Harper, if any. */
  suggestions: string[];
}

/**
 * Message sent from the main thread to the Harper worker.
 */
export interface HarperWorkerRequest {
  text: string;
}

/**
 * Message sent from the Harper worker back to the main thread.
 */
export type HarperWorkerResponse = HarperIssue[];
