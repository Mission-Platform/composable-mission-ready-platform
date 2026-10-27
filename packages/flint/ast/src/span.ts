/**
 * Source coordinate span defining the precise location of a token, AST node, or diagnostic in a file.
 */
export interface FlintSourceSpan {
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly column: number;
  readonly endLine: number;
  readonly endColumn: number;
}

/**
 * 1-based source location coordinate.
 */
export interface FlintSourceLocation {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}
