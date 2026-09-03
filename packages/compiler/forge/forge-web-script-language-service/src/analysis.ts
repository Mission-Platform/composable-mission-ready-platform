import {
  analyzeForgeWebScript as analyzeForgeWebScriptSource,
  createDiagnostic,
  prepareForgeWebScriptFrontend,
  validateForgeWebScript,
  type ForgeWebScriptDiagnostic,
  type ForgeWebScriptSelfHostedStageReport,
} from '@mission-platform/forge-web-script';
import { runForgeWebScriptSelfHostedLexStage } from '@mission-platform/forge-web-script-runtime';

import { normalizeForgeWebScriptWorkspaceOptions } from './options.js';
import { rangeFromSpan } from './positions.js';
import { buildSymbolIndex } from './symbols.js';
import { tokenizeForgeWebScript } from './tokenization.js';

import type {
  ForgeWebScriptAnalysis,
  ForgeWebScriptAnalysisOptions,
  ForgeWebScriptDocument,
  ForgeWebScriptLanguageDiagnostic,
  ForgeWebScriptWorkspaceOptions,
} from './types.js';

export function analyzeForgeWebScript(
  document: ForgeWebScriptDocument,
  options: ForgeWebScriptWorkspaceOptions,
  analysisOptions: ForgeWebScriptAnalysisOptions = {},
): ForgeWebScriptAnalysis {
  const workspaceOptions = normalizeForgeWebScriptWorkspaceOptions(options);
  const fileName = document.fileName ?? document.uri;
  const validation = validateForgeWebScript(document.text, fileName, {
    requestedCapabilities: workspaceOptions.requestedCapabilities,
    requireExports: workspaceOptions.requireExports,
    externalFunctions: analysisOptions.importTypeEnvironment?.externalFunctions,
  });
  const tokens = tokenizeForgeWebScript(document.text, fileName);
  const index = buildSymbolIndex(document.text, validation.module, tokens);
  const selfHostedResult = runSelfHostedStage(document, workspaceOptions);
  const diagnostics = [
    ...validation.diagnostics,
    ...(selfHostedResult.diagnostic === undefined ? [] : [selfHostedResult.diagnostic]),
  ];
  const frontend =
    validation.module === undefined || validation.diagnostics.length > 0
      ? undefined
      : prepareForgeWebScriptFrontend({
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
      : analyzeForgeWebScriptSource(frontend, {
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
  document: ForgeWebScriptDocument,
  options: ForgeWebScriptWorkspaceOptions,
): { readonly report?: ForgeWebScriptSelfHostedStageReport; readonly diagnostic?: ForgeWebScriptDiagnostic } {
  const runner = options.selfHostedRunner ?? runForgeWebScriptSelfHostedLexStage;
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
          diagnostic: createDiagnostic(input.fileName, 'lex', 'FWS-BOOTSTRAP-001', 'FWS VM lex stage parity failed.', {
            start: 0,
            end: 0,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 1,
          }),
        };
  } catch (error: unknown) {
    return {
      diagnostic: createDiagnostic(
        input.fileName,
        'lex',
        'FWS-BOOTSTRAP-001',
        `FWS VM bootstrap failed: ${error instanceof Error ? error.message : String(error)}`,
        { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
      ),
    };
  }
}

function toLanguageDiagnostic(source: string, diagnostic: ForgeWebScriptDiagnostic): ForgeWebScriptLanguageDiagnostic {
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
