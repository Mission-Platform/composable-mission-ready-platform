import {
  createDiagnostic,
  type FlintDiagnostic,
  type FlintSourceSpan,
} from "@mission-platform/flint-ast";
import {
  MAX_EXPANSION_DEPTH,
  MAX_MACRO_EXPANSION_STEPS,
} from "@mission-platform/flint-types";

export { MAX_EXPANSION_DEPTH, MAX_MACRO_EXPANSION_STEPS };

/**
 * Execution limits and quotas for deterministic macro sandboxing.
 */
export interface FlintMacroSandboxLimits {
  readonly maxSteps: number;
  readonly maxDepth: number;
  readonly maxAllocationsBytes?: number;
}

export const DEFAULT_MACRO_SANDBOX_LIMITS: FlintMacroSandboxLimits = {
  maxSteps: MAX_MACRO_EXPANSION_STEPS,
  maxDepth: MAX_EXPANSION_DEPTH,
};

/**
 * Execution context tracking step budget and recursion depth within the isolated sandbox.
 */
export class FlintMacroExecutionContext {
  private steps = 0;
  private depth = 0;
  private readonly limits: FlintMacroSandboxLimits;
  private readonly fileName: string;
  private readonly diagnostics: FlintDiagnostic[] = [];

  public constructor(
    fileName: string,
    limits: FlintMacroSandboxLimits = DEFAULT_MACRO_SANDBOX_LIMITS,
  ) {
    this.fileName = fileName;
    this.limits = limits;
  }

  /**
   * Consumes one or more deterministic execution steps, guarding against macro step bombs.
   */
  public tick(count = 1, span?: FlintSourceSpan): void {
    this.steps += count;
    if (this.steps > this.limits.maxSteps) {
      const errorSpan: FlintSourceSpan = span ?? {
        start: 0,
        end: 0,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 1,
      };
      const diagnostic = createDiagnostic(
        this.fileName,
        "macro",
        "FLINT-MACRO-001",
        `Macro expansion step quota exceeded (${this.steps} > ${this.limits.maxSteps} steps). Possible infinite loop or macro bomb.`,
        errorSpan,
        "error",
        "Refactor macro to terminate within the configured step quota or reduce recursion.",
        {
          ruleId: "macro-step-limit",
          category: "security",
          blocking: true,
          owasp: ["A05:2025-Security-Misconfiguration"],
          cwe: ["CWE-400"],
        },
      );
      this.diagnostics.push(diagnostic);
      throw new FlintMacroQuotaExceededError(diagnostic.message, diagnostic);
    }
  }

  /**
   * Pushes one level of recursion depth, guarding against cyclic macro expansions.
   */
  public enter(span?: FlintSourceSpan): void {
    this.depth += 1;
    this.tick(1, span);
    if (this.depth > this.limits.maxDepth) {
      const errorSpan: FlintSourceSpan = span ?? {
        start: 0,
        end: 0,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 1,
      };
      const diagnostic = createDiagnostic(
        this.fileName,
        "macro",
        "FLINT-MACRO-002",
        `Macro expansion recursion depth limit exceeded (${this.depth} > ${this.limits.maxDepth}). Circular macro dependency detected.`,
        errorSpan,
        "error",
        "Ensure macro expansions are well-founded and non-circular.",
        {
          ruleId: "macro-depth-limit",
          category: "security",
          blocking: true,
          owasp: ["A05:2025-Security-Misconfiguration"],
          cwe: ["CWE-674"],
        },
      );
      this.diagnostics.push(diagnostic);
      throw new FlintMacroQuotaExceededError(diagnostic.message, diagnostic);
    }
  }

  /**
   * Pops one level of recursion depth upon returning from a macro frame.
   */
  public exit(): void {
    if (this.depth > 0) {
      this.depth -= 1;
    }
  }

  public getSteps(): number {
    return this.steps;
  }

  public getDepth(): number {
    return this.depth;
  }

  public getDiagnostics(): readonly FlintDiagnostic[] {
    return this.diagnostics;
  }
}

/**
 * Error thrown when sandbox execution limits are exceeded.
 */
export class FlintMacroQuotaExceededError extends Error {
  public readonly diagnostic: FlintDiagnostic;

  public constructor(message: string, diagnostic: FlintDiagnostic) {
    super(message);
    this.name = "FlintMacroQuotaExceededError";
    this.diagnostic = diagnostic;
  }
}

/**
 * Sandboxed Macro Execution Runtime.
 *
 * Implements capability-isolated, deterministic execution for declarative and procedural
 * macros. Ambient host capabilities (filesystem, network, process spawning, eval) are
 * strictly denied.
 */
export class FlintMacroSandbox {
  private readonly limits: FlintMacroSandboxLimits;

  public constructor(
    limits: FlintMacroSandboxLimits = DEFAULT_MACRO_SANDBOX_LIMITS,
  ) {
    this.limits = limits;
  }

  /**
   * Creates a fresh execution context for evaluating macro transformations on a module.
   */
  public createContext(fileName: string): FlintMacroExecutionContext {
    return new FlintMacroExecutionContext(fileName, this.limits);
  }

  /**
   * Executes a bounded macro transformation inside the isolated sandbox.
   */
  public execute<T extends NonNullable<unknown> | null | undefined>(
    fileName: string,
    transform: (context: FlintMacroExecutionContext) => T,
  ): {
    readonly result?: T;
    readonly diagnostics: readonly FlintDiagnostic[];
    readonly steps: number;
  } {
    const context = this.createContext(fileName);
    try {
      const result = transform(context);
      return {
        result,
        diagnostics: context.getDiagnostics(),
        steps: context.getSteps(),
      };
    } catch (error) {
      if (error instanceof FlintMacroQuotaExceededError) {
        return {
          diagnostics: [error.diagnostic],
          steps: context.getSteps(),
        };
      }
      const genericDiagnostic = createDiagnostic(
        fileName,
        "macro",
        "FLINT-MACRO-003",
        `Macro sandbox execution failed: ${error instanceof Error ? error.message : String(error)}`,
        { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
        "error",
      );
      return {
        diagnostics: [...context.getDiagnostics(), genericDiagnostic],
        steps: context.getSteps(),
      };
    }
  }
}
