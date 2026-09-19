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

/**
 * Computes a deterministic identity key for deduplicating analysis findings.
 *
 * @param finding Finding to key.
 * @returns Serialized JSON string key.
 */
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

/**
 * Filters an array of analysis rules to ensure uniqueness by rule ID.
 *
 * @param values Array of rules.
 * @returns Deduplicated array of rules.
 */
function uniqueRules(values: readonly FlintAnalysisRule[]): readonly FlintAnalysisRule[] {
  return values.filter((rule, index, all) => all.findIndex((candidate) => candidate.id === rule.id) === index);
}

/**
 * Normalizes a finding produced by a rule against rule defaults and context policy.
 *
 * @param finding Raw finding from rule.
 * @param rule Executing rule definition.
 * @param context Analysis context.
 * @returns Normalized finding with blocking state populated.
 */
function normalizeRuleFinding(
  finding: FlintAnalysisFinding,
  rule: FlintAnalysisRule,
  context: FlintAnalysisContext,
): FlintAnalysisFinding {
  const normalized = {
    ...finding,
    ruleId: finding.ruleId || rule.id,
    category: finding.category || rule.category,
  };
  return {
    ...normalized,
    blocking: normalized.blocking ?? isFlintAnalysisFindingBlocking(normalized, context.policy),
  };
}

/**
 * Creates an extensible analysis rule registry populated with given rules.
 *
 * @param rules Array of analysis rules to register.
 * @returns Rule registry instance.
 */
export function createFlintAnalysisRuleRegistry(
  rules: readonly FlintAnalysisRule[] = FLINT_DEFAULT_ANALYSIS_RULES,
): FlintAnalysisRuleRegistry {
  const run = (context: FlintAnalysisContext): FlintAnalysisReport => {
    const findings: FlintAnalysisFinding[] = [];
    const seenFindingKeys = new Set<string>();

    for (const rule of uniqueRules(rules)) {
      for (const rawFinding of rule.analyze(context)) {
        const key = findingKey(rawFinding);
        if (seenFindingKeys.has(key)) continue;
        seenFindingKeys.add(key);

        findings.push(normalizeRuleFinding(rawFinding, rule, context));
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
