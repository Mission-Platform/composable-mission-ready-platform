import { createDiagnostic, type ForgeWebScriptDiagnostic } from '../diagnostics.js';

import type { ForgeWebScriptAnalysisFinding } from './contracts.js';

export function createForgeWebScriptAnalysisDiagnostic(
  finding: ForgeWebScriptAnalysisFinding,
): ForgeWebScriptDiagnostic {
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
