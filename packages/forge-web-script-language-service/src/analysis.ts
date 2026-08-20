import {
  createDiagnostic,
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
  ForgeWebScriptDocument,
  ForgeWebScriptLanguageDiagnostic,
  ForgeWebScriptWorkspaceOptions,
} from './types.js';

export function analyzeForgeWebScript(
  document: ForgeWebScriptDocument,
  options: ForgeWebScriptWorkspaceOptions,
): ForgeWebScriptAnalysis {
  const workspaceOptions = normalizeForgeWebScriptWorkspaceOptions(options);
  const fileName = document.fileName ?? document.uri;
  const validation = validateForgeWebScript(document.text, fileName, {
    requestedCapabilities: workspaceOptions.requestedCapabilities,
    requireExports: workspaceOptions.requireExports,
  });
  const tokens = tokenizeForgeWebScript(document.text, fileName);
  const index = buildSymbolIndex(document.text, validation.module, tokens);
  const selfHostedResult = runSelfHostedStage(document, workspaceOptions);
  const diagnostics = [
    ...validation.diagnostics,
    ...(selfHostedResult.diagnostic === undefined ? [] : [selfHostedResult.diagnostic]),
  ];
  return {
    uri: document.uri,
    version: document.version,
    valid: validation.valid && selfHostedResult.diagnostic === undefined,
    ...(validation.module === undefined ? {} : { module: validation.module }),
    diagnostics: diagnostics.map((diagnostic) => toLanguageDiagnostic(document.text, diagnostic)),
    symbols: index.symbols,
    tokens,
    ...(selfHostedResult.report === undefined ? {} : { selfHosted: selfHostedResult.report }),
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
  };
}
