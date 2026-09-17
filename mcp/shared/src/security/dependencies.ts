import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";

import { findRepoRoot } from "../repo/paths.ts";
import { listAll, type PackageManifest, readJson } from "../repo/scanner.ts";
import {
  type AuditDependenciesOptions,
  isSeverityAtOrAbove,
  normalizePnpmSeverity,
  type SecurityFinding,
  type SecurityScanResult,
} from "./types.ts";

interface PnpmAdvisoryFinding {
  readonly version?: string;
  readonly paths?: readonly string[];
}

interface PnpmAdvisory {
  readonly id: number | string;
  readonly title?: string;
  readonly module_name?: string;
  readonly cves?: readonly string[];
  readonly vulnerable_versions?: string;
  readonly patched_versions?: string;
  readonly overview?: string;
  readonly recommendation?: string;
  readonly severity?: string;
  readonly url?: string;
  readonly findings?: readonly PnpmAdvisoryFinding[];
}

interface PnpmAuditOutput {
  readonly advisories?: Record<string, PnpmAdvisory>;
}

/**
 * Check if a dependency version specifier is unpinned (e.g. * or latest).
 */
function checkUnpinnedSpec(
  depName: string,
  spec: string,
  relativeFilePath: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding | undefined {
  if ((spec === "*" || spec === "latest") && isSeverityAtOrAbove("low", severityThreshold)) {
    return {
      id: "DEPENDENCY_UNPINNED_VERSION",
      category: "dependency",
      severity: "low",
      title: "Unpinned dependency version specification",
      message: `Dependency "${depName}" in ${relativeFilePath} uses unpinned version "${spec}".`,
      filePath: relativeFilePath,
      snippet: `"${depName}": "${spec}"`,
      remediation:
        "Pin to a specific version, semver range (e.g. ^1.2.3), or catalog reference.",
      owasp: "A06:2025-Vulnerable and Outdated Components",
      cwe: "CWE-1104",
      isoControl: "A.8.8",
    };
  }
  return undefined;
}

/**
 * Check if a dependency version specifier uses an insecure unencrypted protocol.
 */
function checkInsecureProtocol(
  depName: string,
  spec: string,
  relativeFilePath: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding | undefined {
  if (spec.startsWith("http://") && isSeverityAtOrAbove("high", severityThreshold)) {
    return {
      id: "DEPENDENCY_INSECURE_HTTP_URL",
      category: "dependency",
      severity: "high",
      title: "Insecure HTTP dependency protocol",
      message: `Dependency "${depName}" in ${relativeFilePath} uses unencrypted http:// URL: ${spec}.`,
      filePath: relativeFilePath,
      snippet: `"${depName}": "${spec}"`,
      remediation:
        "Use secure HTTPS (https://) or official package registries instead of unencrypted HTTP.",
      owasp: "A08:2025-Software and Data Integrity Failures",
      cwe: "CWE-319",
      isoControl: "A.8.20",
    };
  }

  if (
    (spec.startsWith("git://") || spec.startsWith("git+http://")) &&
    isSeverityAtOrAbove("high", severityThreshold)
  ) {
    return {
      id: "DEPENDENCY_INSECURE_GIT_URL",
      category: "dependency",
      severity: "high",
      title: "Insecure Git dependency protocol",
      message: `Dependency "${depName}" in ${relativeFilePath} uses unencrypted Git protocol: ${spec}.`,
      filePath: relativeFilePath,
      snippet: `"${depName}": "${spec}"`,
      remediation:
        "Use Git over SSH (git@...) or Git over HTTPS (git+https://).",
      owasp: "A08:2025-Software and Data Integrity Failures",
      cwe: "CWE-319",
      isoControl: "A.8.20",
    };
  }

  return undefined;
}

/**
 * Inspect a package.json manifest for unpinned versions and insecure transmission protocols.
 */
function checkManifestDependencies(
  manifest: PackageManifest,
  relativeFilePath: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const depSections: Array<keyof PackageManifest> = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ];

  for (const section of depSections) {
    const deps = manifest[section] as Record<string, string> | undefined;
    if (!deps || typeof deps !== "object") {
      continue;
    }

    for (const [depName, spec] of Object.entries(deps)) {
      if (typeof spec !== "string") {
        continue;
      }
      const trimmed = spec.trim();
      const unpinned = checkUnpinnedSpec(depName, trimmed, relativeFilePath, severityThreshold);
      if (unpinned) findings.push(unpinned);

      const insecure = checkInsecureProtocol(depName, trimmed, relativeFilePath, severityThreshold);
      if (insecure) findings.push(insecure);
    }
  }

  return findings;
}

/**
 * Scan workspace package.json manifests for security policy compliance.
 */
function scanWorkspaceManifests(
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): { findings: SecurityFinding[]; scannedFiles: number } {
  const findings: SecurityFinding[] = [];
  let scannedFiles = 0;

  const rootManifestPath = join(repoRoot, "package.json");
  if (existsSync(rootManifestPath)) {
    try {
      const rootManifest = readJson<PackageManifest>(rootManifestPath);
      findings.push(...checkManifestDependencies(rootManifest, "package.json", severityThreshold));
      scannedFiles += 1;
    } catch {
      // Ignored
    }
  }

  try {
    const members = listAll();
    for (const member of members) {
      const memberPkgPath = join(member.dir, "package.json");
      if (existsSync(memberPkgPath)) {
        try {
          const manifest = readJson<PackageManifest>(memberPkgPath);
          const relPath = relative(repoRoot, memberPkgPath).replaceAll("\\", "/");
          findings.push(...checkManifestDependencies(manifest, relPath, severityThreshold));
          scannedFiles += 1;
        } catch {
          continue;
        }
      }
    }
  } catch {
    // If workspace scanning fails, continue with root
  }

  return { findings, scannedFiles };
}

/**
 * Execute pnpm audit --json and parse reported vulnerabilities.
 */
function runPnpmAuditCheck(
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  let stdoutText: string;
  try {
    stdoutText = execFileSync("pnpm", ["audit", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error: unknown) {
    const execErr = error as { stdout?: string | Buffer };
    stdoutText =
      execErr.stdout !== undefined
        ? typeof execErr.stdout === "string"
          ? execErr.stdout
          : execErr.stdout.toString("utf8")
        : "";
  }

  if (stdoutText.trim().length === 0) {
    return [];
  }

  const findings: SecurityFinding[] = [];
  try {
    const auditData = JSON.parse(stdoutText) as PnpmAuditOutput;
    if (!auditData.advisories || typeof auditData.advisories !== "object") {
      return [];
    }

    for (const [advisoryId, advisory] of Object.entries(auditData.advisories)) {
      const rawSeverity = advisory.severity ?? "moderate";
      const severity = normalizePnpmSeverity(rawSeverity);
      if (!isSeverityAtOrAbove(severity, severityThreshold)) {
        continue;
      }

      const cve = advisory.cves && advisory.cves.length > 0 ? advisory.cves[0] : `GHSA-${advisoryId}`;
      const pkgName = advisory.module_name ?? "unknown-package";
      const vulnRange = advisory.vulnerable_versions ? ` (${advisory.vulnerable_versions})` : "";
      const title = advisory.title ?? `Vulnerable dependency: ${pkgName}`;

      findings.push({
        id: cve ?? `CVE-${advisoryId}`,
        category: "dependency",
        severity,
        title,
        message: `${title} in package "${pkgName}"${vulnRange}. ${advisory.overview ?? ""}`.trim(),
        filePath: "pnpm-lock.yaml",
        snippet: `Package: ${pkgName}, vulnerable: ${advisory.vulnerable_versions ?? "unknown"}, patched: ${advisory.patched_versions ?? "none"}`,
        remediation:
          advisory.recommendation ??
          `Upgrade ${pkgName} to ${advisory.patched_versions ?? "a patched version"}.`,
        owasp: "A06:2025-Vulnerable and Outdated Components",
        cwe: "CWE-1104",
        isoControl: "A.8.8",
      });
    }
  } catch {
    // Failed to parse JSON output, e.g. registry offline
  }

  return findings;
}

/**
 * Audit workspace dependencies and lockfiles for known vulnerabilities, unpinned versions, and insecure protocols.
 */
export function auditDependencies(
  options: AuditDependenciesOptions = {},
): SecurityScanResult {
  const startTime = Date.now();
  const repoRoot = findRepoRoot();
  const findings: SecurityFinding[] = [];

  const manifestResult = scanWorkspaceManifests(repoRoot, options.severityThreshold);
  findings.push(...manifestResult.findings);

  if (options.runPnpmAudit !== false) {
    const auditFindings = runPnpmAuditCheck(repoRoot, options.severityThreshold);
    findings.push(...auditFindings);
  }

  return {
    findings,
    scannedFiles: manifestResult.scannedFiles,
    durationMs: Date.now() - startTime,
    clean: findings.length === 0,
  };
}
