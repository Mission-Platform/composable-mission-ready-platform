import type { FlintDiagnostic, FlintToken } from "@mission-platform/flint-ast";
import {
  lexFlint,
  parseFlint,
  type FlintParseResult,
} from "@mission-platform/flint-parser";
import {
  checkFlint,
  type FlintTypeCheckOptions,
} from "@mission-platform/flint-types";

import { analyzeFlint } from "./analyze.js";
import { checkFlintBorrow } from "./borrow-checker.js";
import { lowerFlintToIr } from "./ir.js";

import type {
  FlintAnalysisOptions,
  FlintAnalysisReport,
  FlintCompileInput,
  FlintFrontendResult,
} from "./contracts.js";

export interface FlintQueryValidationResult {
  readonly valid: boolean;
  readonly module?: FlintParseResult["module"];
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly imports: readonly import("@mission-platform/flint-ast").FlintCapabilityImport[];
  readonly sourceImports: readonly import("@mission-platform/flint-ast").FlintSourceModuleImport[];
}

/**
 * Cache statistics tracked by the incremental query engine.
 */
export interface FlintQueryEngineStats {
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly queryCount: number;
}

/**
 * Diagnostic record formatted in SARIF v2.1.0 compliant structure.
 */
export interface FlintSarifLog {
  readonly $schema: string;
  readonly version: "2.1.0";
  readonly runs: readonly FlintSarifRun[];
}

/**
 * Single run entry in a SARIF log.
 */
export interface FlintSarifRun {
  readonly tool: {
    readonly driver: {
      readonly name: string;
      readonly version: string;
      readonly informationUri?: string;
      readonly rules: readonly FlintSarifRule[];
    };
  };
  readonly results: readonly FlintSarifResult[];
}

/**
 * Rule metadata within a SARIF tool component.
 */
export interface FlintSarifRule {
  readonly id: string;
  readonly name?: string;
  readonly shortDescription?: { readonly text: string };
  readonly fullDescription?: { readonly text: string };
  readonly defaultConfiguration?: {
    readonly level: "error" | "warning" | "note" | "none";
  };
  readonly helpUri?: string;
  readonly properties?: Readonly<Record<string, unknown>>;
}

/**
 * Result issue report within a SARIF run.
 */
export interface FlintSarifResult {
  readonly ruleId: string;
  readonly level: "error" | "warning" | "note";
  readonly message: { readonly text: string };
  readonly locations: readonly [
    {
      readonly physicalLocation: {
        readonly artifactLocation: { readonly uri: string };
        readonly region: {
          readonly startLine: number;
          readonly startColumn: number;
          readonly endLine: number;
          readonly endColumn: number;
        };
      };
    },
  ];
  readonly relatedLocations?: readonly {
    readonly id: number;
    readonly message: { readonly text: string };
    readonly physicalLocation: {
      readonly artifactLocation: { readonly uri: string };
      readonly region?: {
        readonly startLine: number;
        readonly startColumn: number;
        readonly endLine: number;
        readonly endColumn: number;
      };
    };
  }[];
  readonly fixes?: readonly {
    readonly description: { readonly text: string };
    readonly fileChanges: readonly {
      readonly artifactLocation: { readonly uri: string };
      readonly replacements: readonly {
        readonly deletedRegion: {
          readonly startLine: number;
          readonly startColumn: number;
          readonly endLine: number;
          readonly endColumn: number;
        };
        readonly insertedContent?: { readonly text: string };
      }[];
    }[];
  }[];
}

/**
 * Query engine interface implementing Salsa/Roslyn style incremental compilation memoization.
 */
export interface FlintQueryEngine {
  readonly getTokens: (
    fileName: string,
    source: string,
  ) => readonly FlintToken[];
  readonly getParsedModule: (
    fileName: string,
    source: string,
  ) => FlintParseResult;
  readonly getTypeCheck: (
    fileName: string,
    source: string,
    options?: FlintTypeCheckOptions,
  ) => FlintQueryValidationResult;
  readonly getFrontend: (input: FlintCompileInput) => FlintFrontendResult;
  readonly getAnalysis: (
    input: FlintCompileInput,
    options?: FlintAnalysisOptions,
  ) => FlintAnalysisReport | undefined;
  readonly toSarif: (
    diagnostics: readonly FlintDiagnostic[],
    options?: {
      readonly toolVersion?: string;
      readonly informationUri?: string;
    },
  ) => FlintSarifLog;
  readonly invalidate: (fileName?: string) => void;
  readonly getStats: () => FlintQueryEngineStats;
  readonly resetStats: () => void;
}

function fastHash(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function sarifLevel(
  severity: FlintDiagnostic["severity"],
): "error" | "warning" | "note" {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "info":
      return "note";
    default:
      return "error";
  }
}

export function formatFlintSarif(
  diagnostics: readonly FlintDiagnostic[],
  options: {
    readonly toolVersion?: string;
    readonly informationUri?: string;
  } = {},
): FlintSarifLog {
  const rulesMap = new Map<string, FlintSarifRule>();
  const results: FlintSarifResult[] = [];

  for (const diagnostic of diagnostics) {
    if (!rulesMap.has(diagnostic.code)) {
      rulesMap.set(diagnostic.code, {
        id: diagnostic.code,
        name: diagnostic.ruleId ?? diagnostic.code,
        shortDescription: { text: diagnostic.message },
        fullDescription: { text: diagnostic.hint ?? diagnostic.message },
        defaultConfiguration: {
          level: sarifLevel(diagnostic.severity),
        },
        properties: {
          category: diagnostic.category ?? diagnostic.phase,
          blocking: diagnostic.blocking ?? diagnostic.severity === "error",
          ...(diagnostic.owasp === undefined
            ? {}
            : { owasp: diagnostic.owasp }),
          ...(diagnostic.cwe === undefined ? {} : { cwe: diagnostic.cwe }),
        },
      });
    }

    const relatedLocations = diagnostic.evidence?.map((item, index) => ({
      id: index + 1,
      message: { text: item.message },
      physicalLocation: {
        artifactLocation: { uri: diagnostic.fileName },
        ...(item.span === undefined
          ? {}
          : {
              region: {
                startLine: item.span.line,
                startColumn: item.span.column,
                endLine: item.span.endLine,
                endColumn: item.span.endColumn,
              },
            }),
      },
    }));

    const resultEntry: FlintSarifResult = {
      ruleId: diagnostic.code,
      level: sarifLevel(diagnostic.severity),
      message: { text: diagnostic.message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: diagnostic.fileName },
            region: {
              startLine: diagnostic.span.line,
              startColumn: diagnostic.span.column,
              endLine: diagnostic.span.endLine,
              endColumn: diagnostic.span.endColumn,
            },
          },
        },
      ],
      ...(relatedLocations === undefined || relatedLocations.length === 0
        ? {}
        : { relatedLocations }),
      ...(diagnostic.hint === undefined
        ? {}
        : {
            fixes: [
              {
                description: { text: diagnostic.hint },
                fileChanges: [
                  {
                    artifactLocation: { uri: diagnostic.fileName },
                    replacements: [
                      {
                        deletedRegion: {
                          startLine: diagnostic.span.line,
                          startColumn: diagnostic.span.column,
                          endLine: diagnostic.span.endLine,
                          endColumn: diagnostic.span.endColumn,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          }),
    };

    results.push(resultEntry);
  }

  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "flint",
            version: options.toolVersion ?? "0.1.0",
            informationUri:
              options.informationUri ?? "https://mission-platform.dev/flint",
            rules: [...rulesMap.values()],
          },
        },
        results,
      },
    ],
  };
}

export function createFlintQueryEngine(): FlintQueryEngine {
  let hits = 0;
  let misses = 0;
  let evictions = 0;
  let queryCount = 0;

  const tokenCache = new Map<
    string,
    { hash: string; tokens: readonly FlintToken[] }
  >();
  const parseCache = new Map<
    string,
    { hash: string; result: FlintParseResult }
  >();
  const typecheckCache = new Map<
    string,
    { hash: string; optionsKey: string; result: FlintQueryValidationResult }
  >();
  const frontendCache = new Map<
    string,
    { hash: string; optionsKey: string; result: FlintFrontendResult }
  >();
  const analysisCache = new Map<
    string,
    { hash: string; optionsKey: string; result: FlintAnalysisReport }
  >();

  const engine: FlintQueryEngine = {
    getTokens(fileName: string, source: string): readonly FlintToken[] {
      queryCount += 1;
      const contentHash = fastHash(source);
      const cached = tokenCache.get(fileName);
      if (cached !== undefined && cached.hash === contentHash) {
        hits += 1;
        return cached.tokens;
      }
      misses += 1;
      const result = lexFlint(source, fileName).tokens;
      tokenCache.set(fileName, { hash: contentHash, tokens: result });
      return result;
    },

    getParsedModule(fileName: string, source: string): FlintParseResult {
      queryCount += 1;
      const contentHash = fastHash(source);
      const cached = parseCache.get(fileName);
      if (cached !== undefined && cached.hash === contentHash) {
        hits += 1;
        return cached.result;
      }
      misses += 1;
      const result = parseFlint(source, fileName);
      parseCache.set(fileName, { hash: contentHash, result });
      return result;
    },

    getTypeCheck(
      fileName: string,
      source: string,
      options: FlintTypeCheckOptions = {},
    ): FlintQueryValidationResult {
      queryCount += 1;
      const contentHash = fastHash(source);
      const optionsKey = JSON.stringify(options);
      const cached = typecheckCache.get(fileName);
      if (
        cached !== undefined &&
        cached.hash === contentHash &&
        cached.optionsKey === optionsKey
      ) {
        hits += 1;
        return cached.result;
      }
      misses += 1;
      const parseResult = parseFlint(source, fileName);
      const diagnostics = [...parseResult.diagnostics];
      if (parseResult.module !== undefined) {
        const typeCheckResult = checkFlint(
          parseResult.module,
          fileName,
          options,
        );
        diagnostics.push(...typeCheckResult.diagnostics);
      }
      const result: FlintQueryValidationResult = {
        valid: diagnostics.every((d) => d.severity !== "error"),
        module: parseResult.module,
        diagnostics,
        imports: parseResult.module?.imports ?? [],
        sourceImports: parseResult.module?.sourceImports ?? [],
      };
      typecheckCache.set(fileName, { hash: contentHash, optionsKey, result });
      return result;
    },

    getFrontend(input: FlintCompileInput): FlintFrontendResult {
      queryCount += 1;
      const fileName = input.fileName ?? "<input>";
      const contentHash = fastHash(input.source);
      const optionsKey = JSON.stringify({
        requestedCapabilities: input.requestedCapabilities,
      });
      const cached = frontendCache.get(fileName);
      if (
        cached !== undefined &&
        cached.hash === contentHash &&
        cached.optionsKey === optionsKey
      ) {
        hits += 1;
        return cached.result;
      }
      misses += 1;
      const validation = engine.getTypeCheck(fileName, input.source, {
        requestedCapabilities: input.requestedCapabilities,
      });
      const diagnostics = [...validation.diagnostics];
      if (validation.module !== undefined) {
        const borrowResult = checkFlintBorrow(validation.module, fileName);
        diagnostics.push(...borrowResult.diagnostics);
        lowerFlintToIr(validation.module);
      }
      const result: FlintFrontendResult = {
        fileName,
        source: input.source,
        sourceFiles: [fileName],
        module: validation.module,
        diagnostics,
        imports: validation.imports,
        sourceImports: validation.sourceImports,
        links: {
          imports: validation.imports,
          sourceImports: validation.sourceImports,
        },
      };
      frontendCache.set(fileName, { hash: contentHash, optionsKey, result });
      return result;
    },

    getAnalysis(
      input: FlintCompileInput,
      options: FlintAnalysisOptions = {},
    ): FlintAnalysisReport | undefined {
      queryCount += 1;
      const fileName = input.fileName ?? "<input>";
      const contentHash = fastHash(input.source);
      const optionsKey = JSON.stringify({
        policy: options.policy,
        disabledRules: options.disabledRules,
        ruleSeverities: options.ruleSeverities,
      });
      const cached = analysisCache.get(fileName);
      if (
        cached !== undefined &&
        cached.hash === contentHash &&
        cached.optionsKey === optionsKey
      ) {
        hits += 1;
        return cached.result;
      }
      misses += 1;
      const frontend = engine.getFrontend(input);
      const result = analyzeFlint(frontend, {
        ...options,
        source: input.source,
      });
      analysisCache.set(fileName, { hash: contentHash, optionsKey, result });
      return result;
    },

    toSarif(
      diagnostics: readonly FlintDiagnostic[],
      options: {
        readonly toolVersion?: string;
        readonly informationUri?: string;
      } = {},
    ): FlintSarifLog {
      return formatFlintSarif(diagnostics, options);
    },

    invalidate(fileName?: string): void {
      if (fileName !== undefined) {
        let count = 0;
        if (tokenCache.delete(fileName)) count += 1;
        if (parseCache.delete(fileName)) count += 1;
        if (typecheckCache.delete(fileName)) count += 1;
        if (frontendCache.delete(fileName)) count += 1;
        if (analysisCache.delete(fileName)) count += 1;
        evictions += count;
      } else {
        evictions +=
          tokenCache.size +
          parseCache.size +
          typecheckCache.size +
          frontendCache.size +
          analysisCache.size;
        tokenCache.clear();
        parseCache.clear();
        typecheckCache.clear();
        frontendCache.clear();
        analysisCache.clear();
      }
    },

    getStats(): FlintQueryEngineStats {
      return { hits, misses, evictions, queryCount };
    },

    resetStats(): void {
      hits = 0;
      misses = 0;
      evictions = 0;
      queryCount = 0;
    },
  };

  return engine;
}
