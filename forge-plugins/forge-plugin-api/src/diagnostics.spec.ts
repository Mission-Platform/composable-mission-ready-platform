import { describe, expect, it } from "vitest";

import {
  CompilerDiagnosticError,
  createCompilerDiagnostic,
  formatCompilerDiagnostic,
  throwOnCompilerErrors,
} from ".";

import type { CompilerDiagnostic } from ".";

const sourceSpan = {
  start: 12,
  end: 19,
  line: 3,
  column: 5,
} as const;

function diagnostic(
  severity: CompilerDiagnostic["severity"],
  overrides: Partial<CompilerDiagnostic> = {},
): CompilerDiagnostic {
  return {
    phase: "frontend",
    severity,
    code: "FORGE_TEST_DIAGNOSTIC",
    message: "Something needs attention.",
    fileName: "src/Example.tsx",
    ...overrides,
  };
}

describe("Forge compiler diagnostics API", () => {
  it("exports the shared diagnostic helpers from the package root", () => {
    expect(CompilerDiagnosticError).toBeTypeOf("function");
    expect(createCompilerDiagnostic).toBeTypeOf("function");
    expect(formatCompilerDiagnostic).toBeTypeOf("function");
    expect(throwOnCompilerErrors).toBeTypeOf("function");
  });

  it("formats a diagnostic with its source location and stable code", () => {
    expect(
      formatCompilerDiagnostic(
        diagnostic("error", {
          code: "FORGE_FRONTEND_PARSE_ERROR",
          span: sourceSpan,
        }),
      ),
    ).toBe(
      "[FORGE_FRONTEND_PARSE_ERROR] src/Example.tsx:3:5: Something needs attention.",
    );
  });

  it("falls back to character offsets when line and column are unavailable", () => {
    expect(
      formatCompilerDiagnostic(
        diagnostic("error", { span: { start: 12, end: 19 } }),
      ),
    ).toBe(
      "[FORGE_TEST_DIAGNOSTIC] src/Example.tsx:12-19: Something needs attention.",
    );
  });

  it("keeps only error diagnostics in CompilerDiagnosticError", () => {
    const warning = diagnostic("warning", { code: "FORGE_TEST_WARNING" });
    const info = diagnostic("info", { code: "FORGE_TEST_INFO" });
    const error = diagnostic("error", {
      code: "FORGE_TEST_ERROR",
      message: "Compilation cannot continue.",
      span: sourceSpan,
    });
    const secondError = diagnostic("error", {
      code: "FORGE_TEST_SECOND_ERROR",
      message: "Another error prevents output.",
    });

    const thrown = new CompilerDiagnosticError([
      warning,
      info,
      error,
      secondError,
    ]);

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown.name).toBe("CompilerDiagnosticError");
    expect(thrown.diagnostics).toEqual([error, secondError]);
    expect(thrown.message).toBe(
      "[FORGE_TEST_ERROR] src/Example.tsx:3:5: Compilation cannot continue.\n" +
        "[FORGE_TEST_SECOND_ERROR] src/Example.tsx: Another error prevents output.",
    );
    expect(thrown.message).not.toContain("FORGE_TEST_WARNING");
    expect(thrown.message).not.toContain("FORGE_TEST_INFO");
  });

  it("does not throw when diagnostics are absent or non-errors", () => {
    expect(() => throwOnCompilerErrors()).not.toThrow();
    const nonErrors = [diagnostic("warning"), diagnostic("info")];

    expect(() => throwOnCompilerErrors(nonErrors)).not.toThrow();
    expect(nonErrors).toEqual([diagnostic("warning"), diagnostic("info")]);
  });

  it("throws an error containing only error-severity diagnostics", () => {
    const error = diagnostic("error", { code: "FORGE_TEST_ERROR" });

    expect(() =>
      throwOnCompilerErrors([
        diagnostic("warning", { code: "FORGE_TEST_WARNING" }),
        error,
        diagnostic("info", { code: "FORGE_TEST_INFO" }),
      ]),
    ).toThrowError(new CompilerDiagnosticError([error]));
  });

  it("supplies a stable fallback file name for created diagnostics", () => {
    expect(
      createCompilerDiagnostic({
        phase: "generation",
        severity: "error",
        code: "FORGE_TEST_DIAGNOSTIC",
        message: "Missing source file.",
      }),
    ).toMatchObject({ fileName: "<unknown>" });
  });
});
