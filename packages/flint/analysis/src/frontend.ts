import {
  createDiagnostic,
  diagnosticKey,
  FLINT_SECURITY_SOURCE_TOO_LARGE,
  getSourceByteLength,
  MAX_SOURCE_INPUT_BYTES,
  type FlintDiagnostic,
  type FlintModule,
} from "@mission-platform/flint-ast";
import { parseFlint } from "@mission-platform/flint-parser";
import { checkFlint } from "@mission-platform/flint-types";

import { FlintComptimeEvaluator } from "./comptime.js";
import { lowerFlintToIr } from "./ir.js";

import type { FlintCompileInput, FlintFrontendResult } from "./contracts.js";

function checkedModule(input: FlintCompileInput): {
  readonly module?: FlintModule;
  readonly diagnostics: readonly FlintDiagnostic[];
} {
  const fileName = input.fileName;
  const source = input.source;
  const byteLength = getSourceByteLength(source);
  if (byteLength > MAX_SOURCE_INPUT_BYTES) {
    const errorDiagnostic = createDiagnostic(
      fileName,
      "parse",
      FLINT_SECURITY_SOURCE_TOO_LARGE,
      `Source exceeds maximum allowed size of ${MAX_SOURCE_INPUT_BYTES} bytes (received ${byteLength} bytes).`,
      { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
    );
    return { diagnostics: [errorDiagnostic] };
  }
  const parsed = parseFlint(source, fileName);
  if (parsed.module === undefined) {
    return { diagnostics: parsed.diagnostics };
  }

  const comptimeEvaluator = new FlintComptimeEvaluator(fileName);
  comptimeEvaluator.registerModule(parsed.module);
  const comptimeDiagnostics: FlintDiagnostic[] = [];
  if (parsed.module.comptimeStatements) {
    for (const stmt of parsed.module.comptimeStatements) {
      comptimeDiagnostics.push(...comptimeEvaluator.evaluateStatement(stmt));
    }
  }

  const checked = checkFlint(parsed.module, fileName, {
    requestedCapabilities: input.requestedCapabilities,
    requireExports: input.requireExports,
  });

  const diagnostics = [
    ...new Map(
      [
        ...parsed.diagnostics,
        ...comptimeDiagnostics,
        ...checked.diagnostics,
      ].map((d) => [diagnosticKey(d), d]),
    ).values(),
  ];

  return {
    module: parsed.module,
    diagnostics,
  };
}

/**
 * Prepares the frontend result for static analysis or subsequent compilation passes.
 */
export function prepareFlintFrontend(
  input: FlintCompileInput,
): FlintFrontendResult {
  const validation = checkedModule(input);
  const ir =
    validation.module === undefined
      ? undefined
      : lowerFlintToIr(validation.module);
  const imports = validation.module?.imports ?? [];
  const sourceImports = validation.module?.sourceImports ?? [];

  return {
    fileName: input.fileName,
    source: input.source,
    sourceFiles: [input.fileName],
    module: validation.module,
    diagnostics: validation.diagnostics,
    imports,
    sourceImports,
    ir,
    links: {
      imports,
      sourceImports,
    },
  };
}
