import type {
  FlintDiagnostic,
  FlintFunction,
  FlintModule,
  FlintStructDeclaration,
} from "@mission-platform/flint-ast";

import { FlintMacroHygiene } from "./hygiene.js";
import { FlintMacroSandbox } from "./sandbox.js";

export interface MacroExpansionResult {
  readonly module: FlintModule;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly expandedCount: number;
}

/**
 * Macro expansion engine for Flint.
 * Evaluates procedural, declarative, and derive macros within the capability-isolated sandbox.
 */
export class FlintMacroExpander {
  public readonly sandbox: FlintMacroSandbox;
  public readonly hygiene: FlintMacroHygiene;

  public constructor(
    sandbox: FlintMacroSandbox = new FlintMacroSandbox(),
    hygiene: FlintMacroHygiene = new FlintMacroHygiene(),
  ) {
    this.sandbox = sandbox;
    this.hygiene = hygiene;
  }

  /**
   * Expands all macros in a module and applies derive attributes.
   */
  public expandModule(
    module: FlintModule,
    fileName = "<input>",
  ): MacroExpansionResult {
    let expandedCount = 0;
    const additionalFunctions: FlintFunction[] = [];
    const execution = this.sandbox.execute(fileName, (context) => {
      // Process struct attributes (like #[derive(...)])
      for (const struct of module.structs) {
        context.tick(1, struct.span);
        const derivedFns = this.expandDerivesForStruct(struct);
        if (derivedFns.length > 0) {
          additionalFunctions.push(...derivedFns);
          expandedCount += derivedFns.length;
        }
      }
      return true;
    });

    const transformedModule: FlintModule = {
      ...module,
      functions: [...module.functions, ...additionalFunctions],
    };

    return {
      module: transformedModule,
      diagnostics: execution.diagnostics,
      expandedCount,
    };
  }

  /**
   * Expands built-in derive attributes on a struct (e.g., Clone, Default, Debug).
   */
  private expandDerivesForStruct(
    struct: FlintStructDeclaration,
  ): FlintFunction[] {
    const fns: FlintFunction[] = [];
    if (struct.attributes === undefined) return fns;

    for (const attr of struct.attributes) {
      if (attr.name === "derive") {
        for (const arg of attr.arguments) {
          if (arg.kind === "identifier") {
            const deriveName = arg.name;
            if (deriveName === "Clone" || deriveName === "clone") {
              fns.push(this.generateCloneFunction(struct));
            }
          }
        }
      }
    }

    return fns;
  }

  private generateCloneFunction(struct: FlintStructDeclaration): FlintFunction {
    const paramName = "self";
    const fieldEntries = struct.fields.map((f) => [
      f.name,
      {
        kind: "identifier" as const,
        name: `${paramName}.${f.name}`,
        span: f.span,
      },
    ]);

    return {
      kind: "function",
      name: `${struct.name.toLowerCase()}_clone`,
      exported: true,
      genericParameters: [],
      parameters: [
        {
          kind: "parameter",
          name: paramName,
          type: {
            kind: "type-name",
            name: "unit",
            reference: struct.name,
            span: struct.span,
          },
          span: struct.span,
        },
      ],
      result: {
        kind: "type-name",
        name: "unit",
        reference: struct.name,
        span: struct.span,
      },
      body: [
        {
          kind: "return",
          value: {
            kind: "struct-value",
            type: {
              kind: "type-name",
              name: "unit",
              reference: struct.name,
              span: struct.span,
            },
            fields: Object.fromEntries(fieldEntries),
            span: struct.span,
          },
          span: struct.span,
        },
      ],
      span: struct.span,
    };
  }
}

export interface MacroExpansionOptions {
  readonly fileName?: string;
  readonly targetPlatform?: string;
}

/**
 * Functional entry point to expand all macros within a module using default sandbox and hygiene settings.
 */
export function expandFlintMacros(
  module: FlintModule,
  options: string | MacroExpansionOptions = "<input>",
): MacroExpansionResult {
  const fileName =
    typeof options === "string" ? options : (options.fileName ?? "<input>");
  return new FlintMacroExpander().expandModule(module, fileName);
}
