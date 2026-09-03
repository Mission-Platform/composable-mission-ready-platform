import type { SourceSpan } from "./ir.js";

/** Pipeline phases that can report a compiler diagnostic. */
export type CompilerPhase =
  | "frontend"
  | "ir"
  | "inference"
  | "target-lowering"
  | "optimization"
  | "generation"
  | "build";

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
  /** Explicit target metadata for diagnostics emitted by a target plugin. */
  readonly targetId?: string;
  /** Additional source files involved in a graph or resolution diagnostic. */
  readonly relatedFiles?: readonly string[];
}

/** Format a diagnostic for a compiler error without losing its source location. */
export function formatCompilerDiagnostic(
  diagnostic: CompilerDiagnostic,
): string {
  let location = diagnostic.fileName;
  if (diagnostic.span !== undefined) {
    location =
      diagnostic.span.line === undefined || diagnostic.span.column === undefined
        ? `${diagnostic.fileName}:${diagnostic.span.start}-${diagnostic.span.end}`
        : `${diagnostic.fileName}:${diagnostic.span.line}:${diagnostic.span.column}`;
  }
  return `[${diagnostic.code}] ${location}: ${diagnostic.message}`;
}

/** Error raised when a compiler phase cannot produce a sound target module. */
export class CompilerDiagnosticError extends Error {
  readonly diagnostics: readonly CompilerDiagnostic[];

  constructor(diagnostics: readonly CompilerDiagnostic[]) {
    const errors = diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    );
    super(
      errors
        .map((diagnostic) => formatCompilerDiagnostic(diagnostic))
        .join("\n"),
    );
    this.name = "CompilerDiagnosticError";
    this.diagnostics = [...errors];
  }
}

/** Abort a compiler pipeline when a phase reported one or more errors. */
export function throwOnCompilerErrors(
  diagnostics: readonly CompilerDiagnostic[] | undefined,
): void {
  const errors =
    diagnostics?.filter((diagnostic) => diagnostic.severity === "error") ?? [];
  if (errors.length > 0) {
    throw new CompilerDiagnosticError(errors);
  }
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
