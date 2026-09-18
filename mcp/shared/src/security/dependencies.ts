import { execFileSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

import { findRepoRoot, resolveRepoPath } from "../repo/paths.ts";
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
      owasp: "A03:2025-Software Supply Chain Failures",
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
    owasp: "A03:2025-Software Supply Chain Failures",
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
    owasp: "A03:2025-Software Supply Chain Failures",
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

function scanSingleFileTarget(
  targetPath: string,
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): { findings: SecurityFinding[]; scannedFiles: number } {
  if (targetPath.endsWith("package.json")) {
    return {
      findings: scanSingleManifestPath(targetPath, repoRoot, severityThreshold),
      scannedFiles: 1,
    };
  }
  return { findings: [], scannedFiles: 0 };
}

function isChildMember(memberDir: string, targetPath: string): boolean {
  const rel = relative(targetPath, memberDir);
  return Boolean(rel && !rel.startsWith("..") && !isAbsolute(rel));
}

function scanWorkspaceMemberManifests(
  targetPath: string,
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): { findings: SecurityFinding[]; scannedFiles: number } {
  const findings: SecurityFinding[] = [];
  let scannedFiles = 0;
  try {
    for (const member of listAll()) {
      if (!isChildMember(member.dir, targetPath)) continue;
      const memberPkg = join(member.dir, "package.json");
      if (existsSync(memberPkg)) {
        findings.push(...scanSingleManifestPath(memberPkg, repoRoot, severityThreshold));
        scannedFiles += 1;
      }
    }
  } catch {
    // If workspace scanning fails, continue with collected
  }
  return { findings, scannedFiles };
}

function scanDirectoryManifests(
  targetPath: string,
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): { findings: SecurityFinding[]; scannedFiles: number } {
  const findings: SecurityFinding[] = [];
  let scannedFiles = 0;

  const directPkg = join(targetPath, "package.json");
  if (existsSync(directPkg)) {
    findings.push(...scanSingleManifestPath(directPkg, repoRoot, severityThreshold));
    scannedFiles += 1;
  }

  const memberResult = scanWorkspaceMemberManifests(targetPath, repoRoot, severityThreshold);
  findings.push(...memberResult.findings);
  scannedFiles += memberResult.scannedFiles;

  return { findings, scannedFiles };
}

/**
 * Scan workspace package.json manifests for security policy compliance within a scoped path.
 */
function scanScopedManifests(
  targetPath: string,
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): { findings: SecurityFinding[]; scannedFiles: number } {
  if (!existsSync(targetPath)) {
    return { findings: [], scannedFiles: 0 };
  }

  const stat = lstatSync(targetPath);
  if (stat.isFile()) {
    return scanSingleFileTarget(targetPath, repoRoot, severityThreshold);
  }

  return scanDirectoryManifests(targetPath, repoRoot, severityThreshold);
}

interface PnpmAuditExecutionResult {
  readonly stdout: string;
  readonly error?: string;
}

function extractStdoutString(stdout: string | Buffer | undefined): string {
  if (!stdout) return "";
  if (typeof stdout === "string") return stdout;
  return stdout.toString("utf8");
}

function handleAuditExecutionError(error: unknown): PnpmAuditExecutionResult {
  const execErr = error as { stdout?: string | Buffer; message?: string };
  const stdoutText = extractStdoutString(execErr.stdout);
  if (stdoutText.trim().startsWith("{")) {
    return { stdout: stdoutText };
  }
  const errMessage = execErr.message ?? String(error);
  return { stdout: "", error: `pnpm audit execution failed: ${errMessage}` };
}

/**
 * Execute pnpm audit subprocess and capture stdout.
 */
function executePnpmAudit(repoRoot: string): PnpmAuditExecutionResult {
  try {
    const stdout = execFileSync("pnpm", ["audit", "--json"], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout };
  } catch (error: unknown) {
    return handleAuditExecutionError(error);
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
    owasp: "A03:2025-Software Supply Chain Failures",
    cwe: "CWE-1104",
    isoControl: "A.8.8",
  };
}

function isPathInScope(pkgRel: string, targetPrefix: string): boolean {
  const rel = relative(targetPrefix, pkgRel);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function hasMatchingFindingPath(
  finding: PnpmAdvisoryFinding,
  targetPrefix: string,
): boolean {
  const paths = finding.paths ?? [];
  for (const p of paths) {
    const topSegment = p.split(">")[0] ?? "";
    const pkgRel = topSegment.replaceAll("__", "/");
    if (isPathInScope(pkgRel, targetPrefix)) {
      return true;
    }
  }
  return false;
}

function isAdvisoryInPathScope(
  advisory: PnpmAdvisory,
  targetPath: string,
  repoRoot: string,
): boolean {
  if (targetPath === repoRoot) return true;
  const relTarget = relative(repoRoot, targetPath).replaceAll("\\", "/");
  const targetPrefix = relTarget.endsWith("/package.json")
    ? relTarget.slice(0, -"/package.json".length)
    : relTarget.replace(/\/+$/, "");

  if (!targetPrefix || targetPrefix === ".") return true;

  const findings = advisory.findings ?? [];
  return findings.some((f) => hasMatchingFindingPath(f, targetPrefix));
}

/**
 * Process a single advisory entry and return finding if above threshold.
 */
function processSingleAdvisory(
  advisoryId: string,
  advisory: PnpmAdvisory,
  severityThreshold?: SecurityFinding["severity"],
  targetPath?: string,
  repoRoot?: string,
): SecurityFinding | undefined {
  if (targetPath && repoRoot && !isAdvisoryInPathScope(advisory, targetPath, repoRoot)) {
    return undefined;
  }
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
): { advisories?: Record<string, PnpmAdvisory>; error?: string } {
  try {
    const auditData = JSON.parse(stdoutText) as PnpmAuditOutput;
    const advisories = auditData?.advisories;
    if (advisories && typeof advisories === "object") {
      return { advisories };
    }
    return { advisories: {} };
  } catch (err) {
    return {
      error: `Failed to parse pnpm audit JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Convert parsed advisory entries into normalized security findings.
 */
function convertAdvisoriesToFindings(
  advisories: Record<string, PnpmAdvisory>,
  severityThreshold?: SecurityFinding["severity"],
  targetPath?: string,
  repoRoot?: string,
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const [id, advisory] of Object.entries(advisories)) {
    const finding = processSingleAdvisory(id, advisory, severityThreshold, targetPath, repoRoot);
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
  targetPath?: string,
  repoRoot?: string,
): { findings: SecurityFinding[]; error?: string } {
  const result = extractAuditAdvisories(stdoutText);
  if (result.error) return { findings: [], error: result.error };
  const advisories = result.advisories ?? {};
  return {
    findings: convertAdvisoriesToFindings(advisories, severityThreshold, targetPath, repoRoot),
  };
}

/**
 * Execute pnpm audit --json and parse reported vulnerabilities.
 */
function runPnpmAuditCheck(
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
  targetPath?: string,
): { findings: SecurityFinding[]; errors: string[] } {
  const auditExec = executePnpmAudit(repoRoot);
  const errors: string[] = [];
  if (auditExec.error) {
    errors.push(auditExec.error);
    return { findings: [], errors };
  }
  if (!auditExec.stdout.trim()) {
    return { findings: [], errors };
  }
  const parsed = parseAuditAdvisories(auditExec.stdout, severityThreshold, targetPath, repoRoot);
  if (parsed.error) errors.push(parsed.error);
  return { findings: parsed.findings, errors };
}

function resolveAuditTargetPath(optionsPath: string | undefined, repoRoot: string): string {
  if (optionsPath) {
    return resolveRepoPath(optionsPath, "dependency audit path");
  }
  return repoRoot;
}

function buildAuditResult(
  findings: SecurityFinding[],
  scannedFiles: number,
  errors: string[],
  startTime: number,
): SecurityScanResult {
  const hasErrors = errors.length > 0;
  return {
    findings,
    scannedFiles,
    durationMs: Date.now() - startTime,
    clean: findings.length === 0 && !hasErrors,
    incomplete: hasErrors ? true : undefined,
    errors: hasErrors ? errors : undefined,
  };
}

/**
 * Audit workspace dependencies and lockfiles for known vulnerabilities, unpinned versions, and insecure protocols.
 */
export function auditDependencies(
  options: AuditDependenciesOptions = {},
): SecurityScanResult {
  const startTime = Date.now();
  const repoRoot = findRepoRoot();
  const targetPath = resolveAuditTargetPath(options.path, repoRoot);
  const findings: SecurityFinding[] = [];
  const errors: string[] = [];

  const manifestResult = scanScopedManifests(
    targetPath,
    repoRoot,
    options.severityThreshold,
  );
  findings.push(...manifestResult.findings);

  if (options.runPnpmAudit !== false) {
    const auditResult = runPnpmAuditCheck(
      repoRoot,
      options.severityThreshold,
      targetPath,
    );
    findings.push(...auditResult.findings);
    errors.push(...auditResult.errors);
  }

  return buildAuditResult(findings, manifestResult.scannedFiles, errors, startTime);
}
