import type { SourceSpan } from "./ir.js";

/** Pipeline phases that can report a compiler diagnostic. */
export type CompilerPhase =
  "frontend" | "ir" | "inference" | "optimization" | "generation" | "build";

/** Severity of a compiler diagnostic. */
export type CompilerDiagnosticSeverity = "error" | "warning" | "info";

/** A diagnostic that retains enough source context for phase-level reporting. */
export interface CompilerDiagnostic {
  readonly phase: CompilerPhase;
  readonly severity: CompilerDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly fileName: string;
  readonly span?: SourceSpan;
}

/** Create a diagnostic without coupling the phase contracts to TypeScript nodes. */
export function createCompilerDiagnostic(
  diagnostic: Omit<CompilerDiagnostic, "fileName"> & { fileName?: string },
): CompilerDiagnostic {
  return {
    ...diagnostic,
    fileName: diagnostic.fileName ?? "<unknown>",
  };
}
