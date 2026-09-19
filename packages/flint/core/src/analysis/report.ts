import { createDiagnostic, type FlintDiagnostic } from '../diagnostics.js';

import type { FlintAnalysisFinding } from './contracts.js';

/**
 * Converts a static analysis rule finding into a structured Flint diagnostic.
 * Maps security and quality metadata including rule ID, category, blocking flag,
 * OWASP category, and CWE identifiers into diagnostic details.
 *
 * @param finding - Static analysis rule violation finding to convert.
 * @returns A structured FlintDiagnostic ready for emission.
 */
export function createFlintAnalysisDiagnostic(finding: FlintAnalysisFinding): FlintDiagnostic {
  return createDiagnostic(
    finding.fileName,
    'analysis',
    finding.code,
    finding.message,
    finding.span,
    finding.severity,
    finding.hint,
    {
      ruleId: finding.ruleId,
      category: finding.category,
      blocking: finding.blocking,
      evidence: finding.evidence,
      owasp: finding.owasp,
      cwe: finding.cwe,
    },
  );
}
