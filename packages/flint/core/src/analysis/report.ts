import { createDiagnostic, type FlintDiagnostic } from '../diagnostics.js';

import type { FlintAnalysisFinding } from './contracts.js';

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
