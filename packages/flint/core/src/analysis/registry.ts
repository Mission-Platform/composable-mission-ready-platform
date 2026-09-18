import { diagnosticKey } from '../diagnostics.js';

import { FLINT_DEFAULT_ANALYSIS_RULES } from './default-rules.js';
import { isFlintAnalysisFindingBlocking } from './policy.js';
import { createFlintAnalysisDiagnostic } from './report.js';

import type {
  FlintAnalysisContext,
  FlintAnalysisFinding,
  FlintAnalysisReport,
  FlintAnalysisRule,
} from './contracts.js';

export interface FlintAnalysisRuleRegistry {
  readonly rules: readonly FlintAnalysisRule[];
  register(rule: FlintAnalysisRule): FlintAnalysisRuleRegistry;
  analyze(context: FlintAnalysisContext): FlintAnalysisReport;
}

function findingKey(finding: FlintAnalysisFinding): string {
  return JSON.stringify([
    finding.fileName,
    finding.code,
    finding.ruleId,
    finding.span.start,
    finding.span.end,
    finding.message,
  ]);
}

function uniqueRules(values: readonly FlintAnalysisRule[]): readonly FlintAnalysisRule[] {
  return values.filter((rule, index, all) => all.findIndex((candidate) => candidate.id === rule.id) === index);
}

export function createFlintAnalysisRuleRegistry(
  rules: readonly FlintAnalysisRule[] = FLINT_DEFAULT_ANALYSIS_RULES,
): FlintAnalysisRuleRegistry {
  const run = (context: FlintAnalysisContext): FlintAnalysisReport => {
    const findings: FlintAnalysisFinding[] = [];
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
          blocking: normalizedFinding.blocking ?? isFlintAnalysisFindingBlocking(normalizedFinding, context.policy),
        });
        if (findings.length >= context.policy.limits.maxFindings) break;
      }
      if (findings.length >= context.policy.limits.maxFindings) break;
    }
    const diagnostics = findings
      .map((finding) => createFlintAnalysisDiagnostic(finding))
      .filter(
        (diagnostic, index, all) =>
          all.findIndex((candidate) => diagnosticKey(candidate) === diagnosticKey(diagnostic)) === index,
      );
    return {
      diagnostics,
      findings,
      blockingFindings: findings.filter((finding) => isFlintAnalysisFindingBlocking(finding, context.policy)),
      facts: context.facts,
      policy: context.policy,
    };
  };
  return {
    rules: uniqueRules(rules),
    register(rule): FlintAnalysisRuleRegistry {
      return createFlintAnalysisRuleRegistry([...rules, rule]);
    },
    analyze: run,
  };
}
