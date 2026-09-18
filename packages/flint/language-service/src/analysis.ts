import {
  analyzeFlint as analyzeFlintSource,
  createDiagnostic,
  prepareFlintFrontend,
  validateFlint,
  type FlintDiagnostic,
  type FlintSelfHostedStageReport,
} from '@mission-platform/flint';
import { runFlintSelfHostedLexStage } from '@mission-platform/flint-runtime';

import { normalizeFlintWorkspaceOptions } from './options.js';
import { rangeFromSpan } from './positions.js';
import { buildSymbolIndex } from './symbols.js';
import { tokenizeFlint } from './tokenization.js';

import type {
  FlintAnalysis,
  FlintAnalysisOptions,
  FlintDocument,
  FlintLanguageDiagnostic,
  FlintWorkspaceOptions,
} from './types.js';

export function analyzeFlint(
  document: FlintDocument,
  options: FlintWorkspaceOptions,
  analysisOptions: FlintAnalysisOptions = {},
): FlintAnalysis {
  const workspaceOptions = normalizeFlintWorkspaceOptions(options);
  const fileName = document.fileName ?? document.uri;
  const validation = validateFlint(document.text, fileName, {
    requestedCapabilities: workspaceOptions.requestedCapabilities,
    requireExports: workspaceOptions.requireExports,
    externalFunctions: analysisOptions.importTypeEnvironment?.externalFunctions,
  });
  const tokens = tokenizeFlint(document.text, fileName);
  const index = buildSymbolIndex(document.text, validation.module, tokens);
  const selfHostedResult = runSelfHostedStage(document, workspaceOptions);
  const diagnostics = [
    ...validation.diagnostics,
    ...(selfHostedResult.diagnostic === undefined ? [] : [selfHostedResult.diagnostic]),
  ];
  const frontend =
    validation.module === undefined || validation.diagnostics.length > 0
      ? undefined
      : prepareFlintFrontend({
          source: document.text,
          fileName,
          compilerVersion: '0.1.0',
          requireExports: workspaceOptions.requireExports,
          requestedCapabilities: workspaceOptions.requestedCapabilities,
          externalFunctions: analysisOptions.importTypeEnvironment?.externalFunctions,
        });
  const sourceAnalysis =
    frontend === undefined || frontend.diagnostics.length > 0
      ? undefined
      : analyzeFlintSource(frontend, {
          policy: {
            profile: 'development',
            allowedCapabilities: workspaceOptions.requestedCapabilities ?? [],
          },
        });
  const allDiagnostics = [...diagnostics, ...(sourceAnalysis?.diagnostics ?? [])];
  return {
    uri: document.uri,
    version: document.version,
    valid: validation.valid && selfHostedResult.diagnostic === undefined,
    ...(validation.module === undefined ? {} : { module: validation.module }),
    ...(analysisOptions.importTypeEnvironment === undefined
      ? {}
      : { importTypeEnvironment: analysisOptions.importTypeEnvironment }),
    diagnostics: allDiagnostics.map((diagnostic) => toLanguageDiagnostic(document.text, diagnostic)),
    symbols: index.symbols,
    tokens,
    ...(selfHostedResult.report === undefined ? {} : { selfHosted: selfHostedResult.report }),
    ...(sourceAnalysis === undefined ? {} : { analysis: sourceAnalysis }),
  };
}

function runSelfHostedStage(
  document: FlintDocument,
  options: FlintWorkspaceOptions,
): { readonly report?: FlintSelfHostedStageReport; readonly diagnostic?: FlintDiagnostic } {
  const runner = options.selfHostedRunner ?? runFlintSelfHostedLexStage;
  const input = {
    source: document.text,
    fileName: document.fileName ?? document.uri,
    compilerVersion: '0.1.0',
    requestedCapabilities: options.requestedCapabilities,
  } as const;
  try {
    const report = runner(input, options.selfHostedVmMode ?? 'interpret');
    return report.parity
      ? { report }
      : {
          report,
          diagnostic: createDiagnostic(
            input.fileName,
            'lex',
            'FLINT-BOOTSTRAP-001',
            'FWS VM lex stage parity failed.',
            {
              start: 0,
              end: 0,
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 1,
            },
          ),
        };
  } catch (error: unknown) {
    return {
      diagnostic: createDiagnostic(
        input.fileName,
        'lex',
        'FLINT-BOOTSTRAP-001',
        `FWS VM bootstrap failed: ${error instanceof Error ? error.message : String(error)}`,
        { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      ),
    };
  }
}

function toLanguageDiagnostic(source: string, diagnostic: FlintDiagnostic): FlintLanguageDiagnostic {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    phase: diagnostic.phase,
    message: diagnostic.message,
    fileName: diagnostic.fileName,
    ...(diagnostic.hint === undefined ? {} : { hint: diagnostic.hint }),
    sourceSpan: diagnostic.span,
    range: rangeFromSpan(source, diagnostic.span),
    ...(diagnostic.ruleId === undefined ? {} : { ruleId: diagnostic.ruleId }),
    ...(diagnostic.category === undefined ? {} : { category: diagnostic.category }),
    ...(diagnostic.blocking === undefined ? {} : { blocking: diagnostic.blocking }),
    ...(diagnostic.evidence === undefined ? {} : { evidence: diagnostic.evidence }),
    ...(diagnostic.owasp === undefined ? {} : { owasp: diagnostic.owasp }),
    ...(diagnostic.cwe === undefined ? {} : { cwe: diagnostic.cwe }),
  };
}
