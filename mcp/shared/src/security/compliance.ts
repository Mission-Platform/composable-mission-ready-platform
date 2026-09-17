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

function evaluateControlStatus(
  findings: readonly SecurityFinding[],
): ComplianceControlStatus {
  const hasCriticalOrHigh = findings.some(
    (f) => f.severity === "critical" || f.severity === "high",
  );
  if (hasCriticalOrHigh) {
    return "non-compliant";
  }
  const hasMediumOrLow = findings.some(
    (f) => f.severity === "medium" || f.severity === "low",
  );
  if (hasMediumOrLow) {
    return "needs-review";
  }
  return "compliant";
}

export function collectComplianceEvidence(
  options: CollectComplianceEvidenceOptions = {},
): ComplianceEvidenceReport {
  const startTime = Date.now();
  const repoRoot = findRepoRoot();

  // 1. Git metadata
  const gitMeta = getGitMetadata(repoRoot);

  // 2. Execute underlying scans
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

  // Combine findings
  const allFindings: SecurityFinding[] = [
    ...secretsResult.findings,
    ...codeResult.findings,
    ...depResult.findings,
    ...supplyChainResult.findings,
  ];

  // Group findings by ISO Control
  const controlFindingsMap = new Map<string, SecurityFinding[]>();
  for (const controlId of Object.keys(ISO_27001_CONTROLS)) {
    controlFindingsMap.set(controlId, []);
  }

  for (const finding of allFindings) {
    if (finding.isoControl && controlFindingsMap.has(finding.isoControl)) {
      controlFindingsMap.get(finding.isoControl)!.push(finding);
    }
  }

  // Build ISO control evidence list
  const isoControls: IsoControlEvidence[] = Object.entries(
    ISO_27001_CONTROLS,
  ).map(([controlId, def]) => {
    const findings = controlFindingsMap.get(controlId) ?? [];
    const status = evaluateControlStatus(findings);

    const metrics: Record<string, unknown> = {
      findingsCount: findings.length,
    };

    if (controlId === "A.8.8") {
      metrics.scannedManifests = depResult.scannedFiles;
    } else if (controlId === "A.8.12") {
      metrics.scannedFiles = secretsResult.scannedFiles;
    } else if (controlId === "A.8.28") {
      metrics.scannedCodeFiles = codeResult.scannedFiles;
    } else if (controlId === "A.8.25") {
      metrics.lifecycleScriptsFound =
        supplyChainResult.stats.lifecycleScriptsFound;
    } else if (controlId === "A.8.9") {
      metrics.duplicatePackagesFound =
        supplyChainResult.stats.duplicatePackagesFound;
    } else if (controlId === "A.8.32") {
      metrics.workingTreeClean = gitMeta.cleanTree ?? true;
      metrics.currentBranch = gitMeta.branch ?? "unknown";
    }

    const notes =
      status === "compliant"
        ? `No security violations or vulnerabilities detected for ${controlId}. Control satisfies automated audit requirements.`
        : status === "needs-review"
          ? `${findings.length} moderate or low findings require verification or planned remediation.`
          : `${findings.length} critical or high severity vulnerabilities violate control ${controlId} and require immediate remediation.`;

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
  });

  // Build OWASP 2025 Scorecard
  const owaspScorecard: OwaspScorecardEntry[] = Object.values(
    OWASP_2025_TOP_10,
  ).map((cat) => {
    const matchedFindings = allFindings.filter(
      (f) => f.owasp && f.owasp.startsWith(cat.id),
    );
    return {
      code: cat.code,
      title: cat.title,
      findingsCount: matchedFindings.length,
      criticalCount: matchedFindings.filter((f) => f.severity === "critical")
        .length,
      highCount: matchedFindings.filter((f) => f.severity === "high").length,
      mediumCount: matchedFindings.filter((f) => f.severity === "medium")
        .length,
      lowCount: matchedFindings.filter((f) => f.severity === "low").length,
    };
  });

  // Build CWE Top 25 Scorecard
  const cweFindingCounts = new Map<string, number>();
  for (const finding of allFindings) {
    if (finding.cwe) {
      cweFindingCounts.set(
        finding.cwe,
        (cweFindingCounts.get(finding.cwe) ?? 0) + 1,
      );
    }
  }

  const cweScorecard: CweScorecardEntry[] = Array.from(
    cweFindingCounts.entries(),
  )
    .map(([cweId, count]) => {
      const def = CWE_TOP_25[cweId as keyof typeof CWE_TOP_25];
      return {
        cweId,
        name: def?.name ?? "Identified Weakness",
        findingsCount: count,
      };
    })
    .sort((a, b) => b.findingsCount - a.findingsCount);

  // Build Overall Scorecard
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
    criticalFindingsCount: allFindings.filter((f) => f.severity === "critical")
      .length,
    highFindingsCount: allFindings.filter((f) => f.severity === "high").length,
    mediumFindingsCount: allFindings.filter((f) => f.severity === "medium")
      .length,
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

export function formatComplianceMarkdown(
  report: ComplianceEvidenceReport,
): string {
  const { scorecard, metadata, isoControls, owaspScorecard, cweScorecard } =
    report;

  const lines: string[] = [
    `# Security Compliance & Evidence Report`,
    ``,
    `**Generated**: ${metadata.timestamp} | **Branch**: \`${metadata.branch ?? "unknown"}\` | **Commit**: \`${metadata.commitSha?.slice(0, 8) ?? "unknown"}\` | **Clean Tree**: ${metadata.cleanTree ? "Yes" : "No"}`,
    ``,
    `### Executive Compliance Scorecard`,
    `- **ISO 27001 Compliance**: ${scorecard.iso27001ComplianceScore}% (${scorecard.compliantControlsCount}/${scorecard.totalControlsEvaluated} controls compliant)`,
    `- **Total Security Findings**: ${scorecard.totalFindingsCount} (${scorecard.criticalFindingsCount} critical, ${scorecard.highFindingsCount} high, ${scorecard.mediumFindingsCount} medium)`,
    ``,
    `### ISO/IEC 27001:2022 Control Evidence`,
    `| Control ID | Control Name | Status | Findings | Notes |`,
    `| :--- | :--- | :--- | :--- | :--- |`,
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

  lines.push(
    ``,
    `### OWASP Top 10 (2025) Risk Breakdown`,
    `| OWASP Category | Risk Title | Total | Critical | High | Medium |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- |`,
  );

  for (const entry of owaspScorecard) {
    lines.push(
      `| \`${entry.code.split("-")[0]}\` | ${entry.title} | ${entry.findingsCount} | ${entry.criticalCount} | ${entry.highCount} | ${entry.mediumCount} |`,
    );
  }

  if (cweScorecard.length > 0) {
    lines.push(
      ``,
      `### Top Identified Weaknesses (CWE Top 25)`,
      `| CWE Identifier | Weakness Name | Count |`,
      `| :--- | :--- | :--- |`,
    );
    for (const cwe of cweScorecard) {
      lines.push(`| **${cwe.cweId}** | ${cwe.name} | ${cwe.findingsCount} |`);
    }
  }

  if (report.findings.length > 0) {
    lines.push(
      ``,
      `### Critical & High Remediation Roadmap`,
      `| ID | Severity | File | OWASP / CWE | Remediation |`,
      `| :--- | :--- | :--- | :--- | :--- |`,
    );
    const criticalAndHigh = report.findings.filter(
      (f) => f.severity === "critical" || f.severity === "high",
    );
    for (const f of criticalAndHigh) {
      const location = f.line
        ? `\`${f.filePath}:${f.line}\``
        : `\`${f.filePath}\``;
      const standard = [f.owasp?.split("-")[0], f.cwe]
        .filter(Boolean)
        .join(" / ");
      lines.push(
        `| **${f.id}** | \`${f.severity.toUpperCase()}\` | ${location} | ${standard} | ${f.remediation} |`,
      );
    }
  }

  return lines.join("\n");
}
