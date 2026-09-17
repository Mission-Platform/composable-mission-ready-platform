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
  if (
    (spec === "*" || spec === "latest") &&
    isSeverityAtOrAbove("low", severityThreshold)
  ) {
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
 * Check whether a specifier starts with unencrypted http protocol.
 */
function isInsecureHttp(spec: string): boolean {
  return spec.startsWith("http://");
}

/**
 * Check whether a specifier starts with unencrypted git protocol.
 */
function isInsecureGit(spec: string): boolean {
  return spec.startsWith("git://") || spec.startsWith("git+http://");
}

/**
 * Build finding for insecure HTTP dependency URL.
 */
function buildInsecureHttpFinding(
  depName: string,
  spec: string,
  relativeFilePath: string,
): SecurityFinding {
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

/**
 * Build finding for insecure Git dependency URL.
 */
function buildInsecureGitFinding(
  depName: string,
  spec: string,
  relativeFilePath: string,
): SecurityFinding {
  return {
    id: "DEPENDENCY_INSECURE_GIT_URL",
    category: "dependency",
    severity: "high",
    title: "Insecure Git dependency protocol",
    message: `Dependency "${depName}" in ${relativeFilePath} uses unencrypted Git protocol: ${spec}.`,
    filePath: relativeFilePath,
    snippet: `"${depName}": "${spec}"`,
    remediation: "Use Git over SSH (git@...) or Git over HTTPS (git+https://).",
    owasp: "A08:2025-Software and Data Integrity Failures",
    cwe: "CWE-319",
    isoControl: "A.8.20",
  };
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
  if (!isSeverityAtOrAbove("high", severityThreshold)) {
    return undefined;
  }
  if (isInsecureHttp(spec)) {
    return buildInsecureHttpFinding(depName, spec, relativeFilePath);
  }
  if (isInsecureGit(spec)) {
    return buildInsecureGitFinding(depName, spec, relativeFilePath);
  }
  return undefined;
}

/**
 * Check dependency entries within a single dependencies block.
 */
function checkDependencyEntries(
  deps: Record<string, string>,
  relativeFilePath: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const [depName, spec] of Object.entries(deps)) {
    if (typeof spec !== "string") continue;
    const trimmed = spec.trim();
    const unpinned = checkUnpinnedSpec(
      depName,
      trimmed,
      relativeFilePath,
      severityThreshold,
    );
    if (unpinned) findings.push(unpinned);

    const insecure = checkInsecureProtocol(
      depName,
      trimmed,
      relativeFilePath,
      severityThreshold,
    );
    if (insecure) findings.push(insecure);
  }
  return findings;
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
    if (deps && typeof deps === "object") {
      findings.push(
        ...checkDependencyEntries(deps, relativeFilePath, severityThreshold),
      );
    }
  }

  return findings;
}

/**
 * Read and scan a single manifest path if it exists.
 */
function scanSingleManifestPath(
  pkgPath: string,
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  if (!existsSync(pkgPath)) return [];
  try {
    const manifest = readJson<PackageManifest>(pkgPath);
    const relPath = relative(repoRoot, pkgPath).replaceAll("\\", "/");
    return checkManifestDependencies(manifest, relPath, severityThreshold);
  } catch {
    return [];
  }
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
    findings.push(
      ...scanSingleManifestPath(rootManifestPath, repoRoot, severityThreshold),
    );
    scannedFiles += 1;
  }

  try {
    const members = listAll();
    for (const member of members) {
      const memberPkgPath = join(member.dir, "package.json");
      if (existsSync(memberPkgPath)) {
        findings.push(
          ...scanSingleManifestPath(memberPkgPath, repoRoot, severityThreshold),
        );
        scannedFiles += 1;
      }
    }
  } catch {
    // If workspace scanning fails, continue with root
  }

  return { findings, scannedFiles };
}

/**
 * Execute pnpm audit subprocess and capture stdout.
 */
function executePnpmAudit(repoRoot: string): string {
  try {
    return execFileSync("pnpm", ["audit", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error: unknown) {
    const execErr = error as { stdout?: string | Buffer };
    if (!execErr.stdout) return "";
    return typeof execErr.stdout === "string"
      ? execErr.stdout
      : execErr.stdout.toString("utf8");
  }
}

/**
 * Resolve the CVE or GHSA identifier from an advisory.
 */
function resolveAdvisoryId(advisoryId: string, advisory: PnpmAdvisory): string {
  const cves = advisory.cves;
  if (Array.isArray(cves) && cves.length > 0 && cves[0]) {
    return cves[0];
  }
  return `GHSA-${advisoryId}`;
}

/**
 * Format the descriptive title and summary message for an advisory.
 */
function resolveAdvisoryMessage(
  advisory: PnpmAdvisory,
  pkgName: string,
): { title: string; message: string } {
  const title = advisory.title || `Vulnerable dependency: ${pkgName}`;
  const range = advisory.vulnerable_versions
    ? ` (${advisory.vulnerable_versions})`
    : "";
  const overview = advisory.overview || "";
  const message =
    `${title} in package "${pkgName}"${range}. ${overview}`.trim();
  return { title, message };
}

/**
 * Format snippet and remediation guidance for a vulnerable package advisory.
 */
function resolveAdvisoryRemediation(
  advisory: PnpmAdvisory,
  pkgName: string,
): { snippet: string; remediation: string } {
  const vulnerable = advisory.vulnerable_versions || "unknown";
  const patched = advisory.patched_versions || "none";
  const snippet = `Package: ${pkgName}, vulnerable: ${vulnerable}, patched: ${patched}`;
  const remediation =
    advisory.recommendation || `Upgrade ${pkgName} to ${patched}.`;
  return { snippet, remediation };
}

/**
 * Build finding from an individual pnpm audit advisory.
 */
function buildAdvisoryFinding(
  advisoryId: string,
  advisory: PnpmAdvisory,
  severity: SecurityFinding["severity"],
): SecurityFinding {
  const findingId = resolveAdvisoryId(advisoryId, advisory);
  const pkgName = advisory.module_name || "unknown-package";
  const { title, message } = resolveAdvisoryMessage(advisory, pkgName);
  const { snippet, remediation } = resolveAdvisoryRemediation(
    advisory,
    pkgName,
  );

  return {
    id: findingId,
    category: "dependency",
    severity,
    title,
    message,
    filePath: "pnpm-lock.yaml",
    snippet,
    remediation,
    owasp: "A06:2025-Vulnerable and Outdated Components",
    cwe: "CWE-1104",
    isoControl: "A.8.8",
  };
}

/**
 * Process a single advisory entry and return finding if above threshold.
 */
function processSingleAdvisory(
  advisoryId: string,
  advisory: PnpmAdvisory,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding | undefined {
  const rawSeverity = advisory.severity ?? "moderate";
  const severity = normalizePnpmSeverity(rawSeverity);
  if (!isSeverityAtOrAbove(severity, severityThreshold)) {
    return undefined;
  }
  return buildAdvisoryFinding(advisoryId, advisory, severity);
}

/**
 * Safely parse JSON and extract advisories object from pnpm audit output.
 */
function extractAuditAdvisories(
  stdoutText: string,
): Record<string, PnpmAdvisory> | undefined {
  try {
    const auditData = JSON.parse(stdoutText) as PnpmAuditOutput;
    const advisories = auditData?.advisories;
    if (advisories && typeof advisories === "object") {
      return advisories;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Convert parsed advisory entries into normalized security findings.
 */
function convertAdvisoriesToFindings(
  advisories: Record<string, PnpmAdvisory>,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const [id, advisory] of Object.entries(advisories)) {
    const finding = processSingleAdvisory(id, advisory, severityThreshold);
    if (finding) findings.push(finding);
  }
  return findings;
}

/**
 * Parse pnpm audit JSON output and convert advisories into SecurityFindings.
 */
function parseAuditAdvisories(
  stdoutText: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  const advisories = extractAuditAdvisories(stdoutText);
  if (!advisories) return [];
  return convertAdvisoriesToFindings(advisories, severityThreshold);
}

/**
 * Execute pnpm audit --json and parse reported vulnerabilities.
 */
function runPnpmAuditCheck(
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  const stdoutText = executePnpmAudit(repoRoot);
  if (!stdoutText.trim()) return [];
  return parseAuditAdvisories(stdoutText, severityThreshold);
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

  const manifestResult = scanWorkspaceManifests(
    repoRoot,
    options.severityThreshold,
  );
  findings.push(...manifestResult.findings);

  if (options.runPnpmAudit !== false) {
    const auditFindings = runPnpmAuditCheck(
      repoRoot,
      options.severityThreshold,
    );
    findings.push(...auditFindings);
  }

  return {
    findings,
    scannedFiles: manifestResult.scannedFiles,
    durationMs: Date.now() - startTime,
    clean: findings.length === 0,
  };
}
