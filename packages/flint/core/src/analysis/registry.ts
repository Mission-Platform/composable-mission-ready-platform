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

/**
 * Registry of static analysis rules that can inspect Flint compiler outputs.
 */
export interface FlintAnalysisRuleRegistry {
  /** Active rules registered in this registry. */
  readonly rules: readonly FlintAnalysisRule[];
  /**
   * Registers an additional static analysis rule and returns a new updated registry.
   *
   * @param rule - Rule definition to append to the registry.
   * @returns A new FlintAnalysisRuleRegistry with the rule added.
   */
  register(rule: FlintAnalysisRule): FlintAnalysisRuleRegistry;
  /**
   * Executes all registered rules against an analysis context.
   *
   * @param context - Analysis context containing frontend outputs, policy, and facts.
   * @returns Comprehensive report of findings, blocking violations, and diagnostics.
   */
  analyze(context: FlintAnalysisContext): FlintAnalysisReport;
}

/**
 * Computes a unique hash key for a static analysis finding to deduplicate identical occurrences.
 *
 * @param finding - Finding to serialize.
 * @returns JSON key string representing file, code, rule, span, and message.
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
 * Filters a list of analysis rules, keeping only unique rules by ID.
 *
 * @param values - List of rules to filter.
 * @returns Deduplicated list of analysis rules.
 */
function uniqueRules(values: readonly FlintAnalysisRule[]): readonly FlintAnalysisRule[] {
  return values.filter((rule, index, all) => all.findIndex((candidate) => candidate.id === rule.id) === index);
}

/**
 * Creates an immutable rule registry populated with default or custom analysis rules.
 *
 * @param rules - Initial rules to register (defaults to standard ruleset).
 * @returns An initialized FlintAnalysisRuleRegistry.
 */
export function createFlintAnalysisRuleRegistry(
  rules: readonly FlintAnalysisRule[] = FLINT_DEFAULT_ANALYSIS_RULES,
): FlintAnalysisRuleRegistry {
  // skipcq: JS-D1001, JS-R1005
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
    /**
     * Registers an additional rule and returns a new registry.
     *
     * @param rule - Analysis rule to register.
     * @returns A new FlintAnalysisRuleRegistry with the rule added.
     */
    register(rule): FlintAnalysisRuleRegistry {
      return createFlintAnalysisRuleRegistry([...rules, rule]);
    },
    analyze: run,
  };
}
