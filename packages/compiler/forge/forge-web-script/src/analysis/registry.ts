import { diagnosticKey } from '../diagnostics.js';

import { FORGE_WEB_SCRIPT_DEFAULT_ANALYSIS_RULES } from './default-rules.js';
import { isForgeWebScriptAnalysisFindingBlocking } from './policy.js';
import { createForgeWebScriptAnalysisDiagnostic } from './report.js';

import type {
  ForgeWebScriptAnalysisContext,
  ForgeWebScriptAnalysisFinding,
  ForgeWebScriptAnalysisReport,
  ForgeWebScriptAnalysisRule,
} from './contracts.js';

export interface ForgeWebScriptAnalysisRuleRegistry {
  readonly rules: readonly ForgeWebScriptAnalysisRule[];
  register(rule: ForgeWebScriptAnalysisRule): ForgeWebScriptAnalysisRuleRegistry;
  analyze(context: ForgeWebScriptAnalysisContext): ForgeWebScriptAnalysisReport;
}

function findingKey(finding: ForgeWebScriptAnalysisFinding): string {
  return JSON.stringify([
    finding.fileName,
    finding.code,
    finding.ruleId,
    finding.span.start,
    finding.span.end,
    finding.message,
  ]);
}

function uniqueRules(values: readonly ForgeWebScriptAnalysisRule[]): readonly ForgeWebScriptAnalysisRule[] {
  return values.filter((rule, index, all) => all.findIndex((candidate) => candidate.id === rule.id) === index);
}

export function createForgeWebScriptAnalysisRuleRegistry(
  rules: readonly ForgeWebScriptAnalysisRule[] = FORGE_WEB_SCRIPT_DEFAULT_ANALYSIS_RULES,
): ForgeWebScriptAnalysisRuleRegistry {
  const run = (context: ForgeWebScriptAnalysisContext): ForgeWebScriptAnalysisReport => {
    const findings: ForgeWebScriptAnalysisFinding[] = [];
    for (const rule of uniqueRules(rules)) {
      for (const finding of rule.analyze(context)) {
        if (findings.some((candidate) => findingKey(candidate) === findingKey(finding))) continue;
        const normalizedFinding = {
          ...finding,
          ruleId: finding.ruleId || rule.id,
          category: finding.category || rule.category,
        };
        findings.push({
          ...normalizedFinding,
          blocking:
            normalizedFinding.blocking ?? isForgeWebScriptAnalysisFindingBlocking(normalizedFinding, context.policy),
        });
        if (findings.length >= context.policy.limits.maxFindings) break;
      }
      if (findings.length >= context.policy.limits.maxFindings) break;
    }
    const diagnostics = findings
      .map((finding) => createForgeWebScriptAnalysisDiagnostic(finding))
      .filter(
        (diagnostic, index, all) =>
          all.findIndex((candidate) => diagnosticKey(candidate) === diagnosticKey(diagnostic)) === index,
      );
    return {
      diagnostics,
      findings,
      blockingFindings: findings.filter((finding) => isForgeWebScriptAnalysisFindingBlocking(finding, context.policy)),
      facts: context.facts,
      policy: context.policy,
    };
  };
  return {
    rules: uniqueRules(rules),
    register(rule): ForgeWebScriptAnalysisRuleRegistry {
      return createForgeWebScriptAnalysisRuleRegistry([...rules, rule]);
    },
    analyze: run,
  };
}
