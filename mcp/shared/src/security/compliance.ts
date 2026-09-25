import { execFileSync } from "node:child_process";

import { findRepoRoot } from "../repo/paths.ts";
import { analyzeCode } from "./code.ts";
import { auditDependencies } from "./dependencies.ts";
import { scanSecrets } from "./secrets.ts";
import { auditSupplyChain } from "./supply-chain.ts";
import {
  CWE_TOP_25,
  ISO_27001_CONTROLS,
  OWASP_2025_TOP_10,
  type CollectComplianceEvidenceOptions,
  type ComplianceControlStatus,
  type ComplianceEvidenceReport,
  type ComplianceScorecard,
  type CweScorecardEntry,
  type IsoControlEvidence,
  type OwaspScorecardEntry,
  type SecurityFinding,
} from "./types.ts";

/**
 * Query current git metadata (HEAD commit SHA, branch, working tree cleanliness).
 */
function getGitMetadata(repoRoot: string): {
  commitSha?: string;
  branch?: string;
  cleanTree?: boolean;
} {
  try {
    const commitSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    const statusOutput = execFileSync("git", ["status", "--porcelain"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return {
      commitSha,
      branch,
      cleanTree: statusOutput.length === 0,
    };
  } catch {
    return {};
  }
}

/**
 * Evaluate ISO 27001 control compliance status based on findings severity and evidence completeness.
 */
function evaluateControlStatus(
  findings: readonly SecurityFinding[],
  isIncomplete = false,
): ComplianceControlStatus {
  const hasCriticalOrHigh = findings.some(
    (f) => f.severity === "critical" || f.severity === "high",
  );
  if (hasCriticalOrHigh) {
    return "non-compliant";
  }
  if (isIncomplete) {
    return "needs-review";
  }
  const hasMediumOrLow = findings.some(
    (f) => f.severity === "medium" || f.severity === "low",
  );
  if (hasMediumOrLow) {
    return "needs-review";
  }
  return "compliant";
}

/**
 * Compute specific auditing metrics for an ISO 27001 control.
 */
function computeControlMetrics(
  controlId: string,
  findingsCount: number,
  depScannedFiles: number,
  secretsScannedFiles: number,
  codeScannedFiles: number,
  supplyStats: { lifecycleScriptsFound: number; duplicatePackagesFound: number },
  gitMeta: { cleanTree?: boolean; branch?: string },
): Record<string, unknown> {
  const baseMetrics: Record<string, unknown> = { findingsCount };
  const specificMetrics: Record<string, Record<string, unknown>> = {
    "A.8.8": { scannedManifests: depScannedFiles },
    "A.8.12": { scannedFiles: secretsScannedFiles },
    "A.8.28": { scannedCodeFiles: codeScannedFiles },
    "A.8.25": { lifecycleScriptsFound: supplyStats.lifecycleScriptsFound },
    "A.8.9": { duplicatePackagesFound: supplyStats.duplicatePackagesFound },
    "A.8.32": {
      workingTreeClean: gitMeta.cleanTree,
      currentBranch: gitMeta.branch ?? "unknown",
    },
  };
  const extra = specificMetrics[controlId];
  return extra ? { ...baseMetrics, ...extra } : baseMetrics;
}

/**
 * Build descriptive compliance status notes for an ISO control.
 */
function buildControlNotes(
  controlId: string,
  status: ComplianceControlStatus,
  findingsCount: number,
  isIncomplete = false,
): string {
  if (status === "compliant") {
    return `No security violations or vulnerabilities detected for ${controlId}. Control satisfies automated audit requirements.`;
  }
  if (status === "needs-review") {
    if (isIncomplete && findingsCount === 0) {
      return `Audit evidence for ${controlId} is incomplete due to unreadable files, execution errors, or unknown git state. Verification required.`;
    }
    return `${findingsCount} moderate or low findings require verification or planned remediation.`;
  }
  return `${findingsCount} critical or high severity vulnerabilities violate control ${controlId} and require immediate remediation.`;
}

/**
 * Build a single ISO control evidence record.
 */
function buildSingleIsoEvidence(
  controlId: string,
  def: { name: string; category: string; description: string },
  findings: SecurityFinding[],
  depScannedFiles: number,
  secretsScannedFiles: number,
  codeScannedFiles: number,
  supplyStats: { lifecycleScriptsFound: number; duplicatePackagesFound: number },
  gitMeta: { cleanTree?: boolean; branch?: string },
  isIncomplete = false,
): IsoControlEvidence {
  const status = evaluateControlStatus(findings, isIncomplete);
  const metrics = computeControlMetrics(
    controlId,
    findings.length,
    depScannedFiles,
    secretsScannedFiles,
    codeScannedFiles,
    supplyStats,
    gitMeta,
  );
  const notes = buildControlNotes(controlId, status, findings.length, isIncomplete);

  return {
    controlId,
    name: def.name,
    category: def.category,
    description: def.description,
    status,
    findings,
    metrics,
    notes,
  };
}

/**
 * Build ISO 27001 control evidence items from findings and scan metrics.
 */
function buildIsoEvidenceList(
  allFindings: readonly SecurityFinding[],
  depScannedFiles: number,
  secretsScannedFiles: number,
  codeScannedFiles: number,
  supplyStats: { lifecycleScriptsFound: number; duplicatePackagesFound: number },
  gitMeta: { cleanTree?: boolean; branch?: string },
  incompleteControls: Record<string, boolean> = {},
): IsoControlEvidence[] {
  const controlFindingsMap = new Map<string, SecurityFinding[]>();
  for (const controlId of Object.keys(ISO_27001_CONTROLS)) {
    controlFindingsMap.set(controlId, []);
  }

  for (const finding of allFindings) {
    if (finding.isoControl) {
      const list = controlFindingsMap.get(finding.isoControl);
      if (list) list.push(finding);
    }
  }

  return Object.entries(ISO_27001_CONTROLS).map(([controlId, def]) => {
    const findings = controlFindingsMap.get(controlId) ?? [];
    const isIncomplete = incompleteControls[controlId] === true;
    return buildSingleIsoEvidence(
      controlId,
      def,
      findings,
      depScannedFiles,
      secretsScannedFiles,
      codeScannedFiles,
      supplyStats,
      gitMeta,
      isIncomplete,
    );
  });
}

/**
 * Build OWASP Top 10 (2025) scorecard entries from findings.
 */
function buildOwaspScorecard(
  allFindings: readonly SecurityFinding[],
): OwaspScorecardEntry[] {
  return Object.values(OWASP_2025_TOP_10).map((cat) => {
    const matchedFindings = allFindings.filter((f) =>
      f.owasp?.startsWith(cat.id),
    );
    return {
      code: cat.code,
      title: cat.title,
      findingsCount: matchedFindings.length,
      criticalCount: matchedFindings.filter((f) => f.severity === "critical").length,
      highCount: matchedFindings.filter((f) => f.severity === "high").length,
      mediumCount: matchedFindings.filter((f) => f.severity === "medium").length,
      lowCount: matchedFindings.filter((f) => f.severity === "low").length,
    };
  });
}

/**
 * Build CWE Top 25 scorecard entries ranked by frequency.
 */
function buildCweScorecard(
  allFindings: readonly SecurityFinding[],
): CweScorecardEntry[] {
  const cweFindingCounts = new Map<string, number>();
  for (const finding of allFindings) {
    if (finding.cwe) {
      cweFindingCounts.set(finding.cwe, (cweFindingCounts.get(finding.cwe) ?? 0) + 1);
    }
  }

  return Array.from(cweFindingCounts.entries())
    .map(([cweId, count]) => {
      const def = CWE_TOP_25[cweId as keyof typeof CWE_TOP_25];
      return {
        cweId,
        name: def?.name ?? "Identified Weakness",
        findingsCount: count,
      };
    })
    .sort((a, b) => b.findingsCount - a.findingsCount);
}

/**
 * Collect auditable compliance evidence across ISO 27001, OWASP 2025, and CWE Top 25.
 */
export function collectComplianceEvidence(
  options: CollectComplianceEvidenceOptions = {},
): ComplianceEvidenceReport {
  const startTime = Date.now();
  const repoRoot = findRepoRoot();

  const gitMeta = getGitMetadata(repoRoot);

  const secretsResult = scanSecrets({
    path: options.path,
    severityThreshold: options.severityThreshold,
    maxFiles: options.maxFiles,
  });

  const codeResult = analyzeCode({
    path: options.path,
    severityThreshold: options.severityThreshold,
    maxFiles: options.maxFiles,
  });

  const depResult = auditDependencies({
    path: options.path,
    runPnpmAudit: options.runPnpmAudit,
    severityThreshold: options.severityThreshold,
  });

  const supplyChainResult = auditSupplyChain({
    path: options.path,
    severityThreshold: options.severityThreshold,
  });

  const allFindings: SecurityFinding[] = [
    ...secretsResult.findings,
    ...codeResult.findings,
    ...depResult.findings,
    ...supplyChainResult.findings,
  ];

  const depIncomplete = depResult.incomplete === true || depResult.scannedFiles === 0;
  const supplyChainIncomplete =
    supplyChainResult.incomplete === true ||
    supplyChainResult.stats.totalManifests === 0;
  const manifestAuditIncomplete = depIncomplete || supplyChainIncomplete;

  const incompleteControls: Record<string, boolean> = {
    "A.8.8": manifestAuditIncomplete,
    "A.8.9": manifestAuditIncomplete,
    "A.8.12": secretsResult.incomplete === true,
    "A.8.20": manifestAuditIncomplete,
    "A.8.25": manifestAuditIncomplete,
    "A.8.28": codeResult.incomplete === true,
    "A.8.32": gitMeta.cleanTree === undefined,
  };

  const isoControls = buildIsoEvidenceList(
    allFindings,
    depResult.scannedFiles,
    secretsResult.scannedFiles,
    codeResult.scannedFiles,
    supplyChainResult.stats,
    gitMeta,
    incompleteControls,
  );

  const owaspScorecard = buildOwaspScorecard(allFindings);
  const cweScorecard = buildCweScorecard(allFindings);

  const totalControls = isoControls.length;
  const compliantControls = isoControls.filter(
    (c) => c.status === "compliant",
  ).length;
  const nonCompliantControls = isoControls.filter(
    (c) => c.status === "non-compliant",
  ).length;
  const complianceScore =
    totalControls > 0
      ? Math.round((compliantControls / totalControls) * 100)
      : 100;

  const scorecard: ComplianceScorecard = {
    iso27001ComplianceScore: complianceScore,
    totalControlsEvaluated: totalControls,
    compliantControlsCount: compliantControls,
    nonCompliantControlsCount: nonCompliantControls,
    totalFindingsCount: allFindings.length,
    criticalFindingsCount: allFindings.filter((f) => f.severity === "critical").length,
    highFindingsCount: allFindings.filter((f) => f.severity === "high").length,
    mediumFindingsCount: allFindings.filter((f) => f.severity === "medium").length,
  };

  return {
    metadata: {
      timestamp: new Date().toISOString(),
      repoRoot,
      commitSha: gitMeta.commitSha,
      branch: gitMeta.branch,
      cleanTree: gitMeta.cleanTree,
      durationMs: Date.now() - startTime,
    },
    scorecard,
    isoControls,
    owaspScorecard,
    cweScorecard,
    findings: allFindings,
  };
}

/**
 * Format ISO 27001 control table rows for markdown report.
 */
function formatIsoMarkdown(isoControls: readonly IsoControlEvidence[]): string[] {
  const lines: string[] = [
    "",
    "### ISO/IEC 27001:2022 Control Evidence",
    "| Control ID | Control Name | Status | Findings | Notes |",
    "| :--- | :--- | :--- | :--- | :--- |",
  ];
  for (const control of isoControls) {
    const statusLabel =
      control.status === "compliant"
        ? "COMPLIANT"
        : control.status === "needs-review"
          ? "NEEDS REVIEW"
          : "NON-COMPLIANT";
    lines.push(
      `| **${control.controlId}** | ${control.name} | \`${statusLabel}\` | ${control.findings.length} | ${control.notes} |`,
    );
  }
  return lines;
}

/**
 * Format OWASP 2025 breakdown table for markdown report.
 */
function formatOwaspMarkdown(owaspScorecard: readonly OwaspScorecardEntry[]): string[] {
  const lines: string[] = [
    "",
    "### OWASP Top 10 (2025) Risk Breakdown",
    "| OWASP Category | Risk Title | Total | Critical | High | Medium |",
    "| :--- | :--- | :--- | :--- | :--- | :--- |",
  ];
  for (const entry of owaspScorecard) {
    lines.push(
      `| \`${entry.code.split("-")[0]}\` | ${entry.title} | ${entry.findingsCount} | ${entry.criticalCount} | ${entry.highCount} | ${entry.mediumCount} |`,
    );
  }
  return lines;
}

/**
 * Format CWE Top 25 breakdown table for markdown report.
 */
function formatCweMarkdown(cweScorecard: readonly CweScorecardEntry[]): string[] {
  if (cweScorecard.length === 0) return [];
  const lines: string[] = [
    "",
    "### Top Identified Weaknesses (CWE Top 25)",
    "| CWE Identifier | Weakness Name | Count |",
    "| :--- | :--- | :--- |",
  ];
  for (const cwe of cweScorecard) {
    lines.push(`| **${cwe.cweId}** | ${cwe.name} | ${cwe.findingsCount} |`);
  }
  return lines;
}

/**
 * Format remediation roadmap table for markdown report.
 */
function formatRemediationMarkdown(findings: readonly SecurityFinding[]): string[] {
  const criticalAndHigh = findings.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  );
  if (criticalAndHigh.length === 0) return [];

  const lines: string[] = [
    "",
    "### Critical & High Remediation Roadmap",
    "| ID | Severity | File | OWASP / CWE | Remediation |",
    "| :--- | :--- | :--- | :--- | :--- |",
  ];
  for (const f of criticalAndHigh) {
    const location = f.line ? `\`${f.filePath}:${f.line}\`` : `\`${f.filePath}\``;
    const standard = [f.owasp?.split("-")[0], f.cwe].filter(Boolean).join(" / ");
    lines.push(
      `| **${f.id}** | \`${f.severity.toUpperCase()}\` | ${location} | ${standard} | ${f.remediation} |`,
    );
  }
  return lines;
}

/**
 * Render a comprehensive markdown compliance evidence report.
 */
export function formatComplianceMarkdown(
  report: ComplianceEvidenceReport,
): string {
  const { scorecard, metadata, isoControls, owaspScorecard, cweScorecard, findings } = report;

  const lines: string[] = [
    "# Security Compliance & Evidence Report",
    "",
    `**Generated**: ${metadata.timestamp} | **Branch**: \`${metadata.branch ?? "unknown"}\` | **Commit**: \`${metadata.commitSha?.slice(0, 8) ?? "unknown"}\` | **Clean Tree**: ${metadata.cleanTree !== undefined ? (metadata.cleanTree ? "Yes" : "No") : "Unknown"}`,
    "",
    "### Executive Compliance Scorecard",
    `- **ISO 27001 Compliance**: ${scorecard.iso27001ComplianceScore}% (${scorecard.compliantControlsCount}/${scorecard.totalControlsEvaluated} controls compliant)`,
    `- **Total Security Findings**: ${scorecard.totalFindingsCount} (${scorecard.criticalFindingsCount} critical, ${scorecard.highFindingsCount} high, ${scorecard.mediumFindingsCount} medium)`,
    ...formatIsoMarkdown(isoControls),
    ...formatOwaspMarkdown(owaspScorecard),
    ...formatCweMarkdown(cweScorecard),
    ...formatRemediationMarkdown(findings),
  ];

  return lines.join("\n");
}
