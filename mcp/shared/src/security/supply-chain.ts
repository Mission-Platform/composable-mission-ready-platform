import { existsSync, lstatSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

import { findRepoRoot, resolveRepoPath } from "../repo/paths.ts";
import { listAll, type PackageManifest, readJson } from "../repo/scanner.ts";

import {
  isSeverityAtOrAbove,
  type SecurityFinding,
  type SupplyChainAuditOptions,
  type SupplyChainScanResult,
} from "./types.ts";

const DANGEROUS_LIFECYCLE_CMD =
  /\b(?:curl|wget|bash|sh|powershell|cmd\.exe|eval|exec)\b/i;

/**
 * Read a package manifest safely if it exists on disk.
 */
function tryReadManifest(
  pkgPath: string,
  relPath: string,
): { manifest: PackageManifest; relPath: string } | undefined {
  if (!existsSync(pkgPath)) return undefined;
  try {
    return { manifest: readJson<PackageManifest>(pkgPath), relPath };
  } catch {
    return undefined;
  }
}

/**
 * Collect single manifest file if target path points to package.json.
 */
function collectSingleFileManifest(
  targetPath: string,
  repoRoot: string,
): Array<{ manifest: PackageManifest; relPath: string }> {
  if (!targetPath.endsWith("package.json")) {
    return [];
  }
  const relPath = relative(repoRoot, targetPath).replaceAll("\\", "/");
  const single = tryReadManifest(targetPath, relPath);
  return single ? [single] : [];
}

/**
 * Check whether a workspace member directory is inside the scoped target path.
 */
function isChildMemberDirectory(
  memberDir: string,
  targetPath: string,
): boolean {
  const rel = relative(targetPath, memberDir);
  return Boolean(rel && !rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Collect manifests for all child workspace members within the target path scope.
 */
function collectWorkspaceMemberManifests(
  targetPath: string,
  repoRoot: string,
): Array<{ manifest: PackageManifest; relPath: string }> {
  const manifests: Array<{ manifest: PackageManifest; relPath: string }> = [];
  try {
    for (const member of listAll()) {
      if (!isChildMemberDirectory(member.dir, targetPath)) continue;
      const pkgPath = join(member.dir, "package.json");
      const relPath = relative(repoRoot, pkgPath).replaceAll("\\", "/");
      const memberManifest = tryReadManifest(pkgPath, relPath);
      if (memberManifest) manifests.push(memberManifest);
    }
  } catch {
    // Continue with whatever manifests were found
  }
  return manifests;
}

/**
 * Collect direct and child member package manifests within a target directory.
 */
function collectDirectoryManifests(
  targetPath: string,
  repoRoot: string,
): Array<{ manifest: PackageManifest; relPath: string }> {
  const manifests: Array<{ manifest: PackageManifest; relPath: string }> = [];
  const directManifestPath = join(targetPath, "package.json");
  const directRelPath = relative(repoRoot, directManifestPath).replaceAll(
    "\\",
    "/",
  );
  const direct = tryReadManifest(directManifestPath, directRelPath);
  if (direct) manifests.push(direct);

  manifests.push(...collectWorkspaceMemberManifests(targetPath, repoRoot));
  return manifests;
}

/**
 * Collect root and workspace member package.json manifests within target scope.
 */
function collectManifests(
  targetPath: string,
  repoRoot: string,
): Array<{ manifest: PackageManifest; relPath: string }> {
  if (!existsSync(targetPath)) return [];

  const stat = lstatSync(targetPath);
  if (stat.isFile()) {
    return collectSingleFileManifest(targetPath, repoRoot);
  }

  return collectDirectoryManifests(targetPath, repoRoot);
}

/**
 * Sanitize shell command line by redacting credentials, tokens, and basic auth.
 */
function sanitizeCommandLine(cmd: string): string {
  return cmd
    .replaceAll(/(:\/\/)([^:]+):([^@]+)@/g, "$1$2:***@")
    .replaceAll(
      /(?:bearer|token|password|secret|key|access_token|npm_token|auth_token)\s*[:=]\s*["']?([A-Za-z0-9_.-]{12,})["']?/gi,
      (match, secret) => match.replace(secret, "***REDACTED***"),
    );
}

/**
 * Safely extract and trim a script command string.
 */
function extractLifecycleCommand(scriptCmd: unknown): string | undefined {
  if (typeof scriptCmd !== "string") return undefined;
  const trimmed = scriptCmd.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Build finding metadata for a detected lifecycle hook execution.
 */
function buildLifecycleFinding(
  hook: string,
  scriptCmd: string,
  relPath: string,
  isDangerous: boolean,
  severity: SecurityFinding["severity"],
): SecurityFinding {
  const findingId = isDangerous
    ? "SUPPLY_CHAIN_RISKY_LIFECYCLE_SCRIPT"
    : "SUPPLY_CHAIN_LIFECYCLE_SCRIPT";
  const safeCmd = sanitizeCommandLine(scriptCmd);
  const titleCmd = safeCmd.length > 50 ? `${safeCmd.slice(0, 50)}...` : safeCmd;

  return {
    id: findingId,
    category: "supply-chain",
    severity,
    title: `Lifecycle script declared in ${hook}: ${titleCmd}`,
    message: `Package manifest ${relPath} executes shell command during "${hook}": "${safeCmd}".`,
    filePath: relPath,
    snippet: `"${hook}": "${safeCmd}"`,
    remediation:
      "Avoid lifecycle install scripts in libraries. Use explicit build scripts or postinstall filters to prevent arbitrary code execution on developer machines.",
    owasp: "A03:2025-Software Supply Chain Failures",
    cwe: "CWE-94",
    isoControl: "A.8.25",
  };
}

/**
 * Check a single lifecycle hook declaration for risk.
 */
function checkSingleLifecycleHook(
  hook: string,
  scriptCmd: unknown,
  relPath: string,
  severityThreshold?: SecurityFinding["severity"],
): { finding?: SecurityFinding; declared: boolean } {
  const command = extractLifecycleCommand(scriptCmd);
  if (!command) {
    return { declared: false };
  }
  const isDangerous = DANGEROUS_LIFECYCLE_CMD.test(command);
  const severity: SecurityFinding["severity"] = isDangerous ? "high" : "medium";

  if (!isSeverityAtOrAbove(severity, severityThreshold)) {
    return { declared: true };
  }

  return {
    declared: true,
    finding: buildLifecycleFinding(
      hook,
      command,
      relPath,
      isDangerous,
      severity,
    ),
  };
}

/**
 * Safely extract the scripts dictionary from a package manifest.
 */
function extractManifestScripts(
  manifest: PackageManifest,
): Record<string, unknown> | undefined {
  const scripts = manifest.scripts;
  if (!scripts || typeof scripts !== "object") return undefined;
  return scripts as Record<string, unknown>;
}

/**
 * Inspect standard lifecycle hook scripts across a scripts map.
 */
function inspectLifecycleHooks(
  scripts: Record<string, unknown>,
  relPath: string,
  severityThreshold?: SecurityFinding["severity"],
): { findings: SecurityFinding[]; count: number } {
  const findings: SecurityFinding[] = [];
  let count = 0;
  const lifecycleHooks = ["preinstall", "postinstall", "install"] as const;

  for (const hook of lifecycleHooks) {
    const result = checkSingleLifecycleHook(
      hook,
      scripts[hook],
      relPath,
      severityThreshold,
    );
    if (result.declared) count += 1;
    if (result.finding) findings.push(result.finding);
  }

  return { findings, count };
}

/**
 * Audit package manifest lifecycle scripts (preinstall, postinstall, install).
 */
function auditLifecycleScripts(
  manifest: PackageManifest,
  relPath: string,
  severityThreshold?: SecurityFinding["severity"],
): { findings: SecurityFinding[]; count: number } {
  const scripts = extractManifestScripts(manifest);
  if (!scripts) {
    return { findings: [], count: 0 };
  }
  return inspectLifecycleHooks(scripts, relPath, severityThreshold);
}

const TARBALL_EXTENSIONS = [".tgz", ".tar.gz"] as const;
const SENSITIVE_QUERY_PARAMS = [
  "token",
  "auth",
  "key",
  "secret",
  "sig",
  "signature",
] as const;

/**
 * Check whether a URL protocol matches http or https.
 */
function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}

/**
 * Check whether a URL pathname points to a tarball archive extension.
 */
function isTarballPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return TARBALL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Parse dependency specifier as an external tarball URL if valid.
 */
function parseTarballUrl(spec: string): URL | undefined {
  try {
    const url = new URL(spec);
    if (!isHttpProtocol(url.protocol)) return undefined;
    if (!isTarballPath(url.pathname)) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

/**
 * Sanitize username and password credentials on a URL instance.
 */
function sanitizeUrlCredentials(url: URL): void {
  const hadPassword = Boolean(url.password);
  if (hadPassword) {
    url.password = "***";
    return;
  }
  if (url.username) {
    url.username = "***";
  }
}

/**
 * Redact sensitive query parameters on a URL instance.
 */
function sanitizeUrlQueryParams(url: URL): void {
  for (const param of SENSITIVE_QUERY_PARAMS) {
    if (url.searchParams.has(param)) {
      url.searchParams.set(param, "***REDACTED***");
    }
  }
}

/**
 * Sanitize credentials and sensitive query parameters from a tarball URL.
 */
function sanitizeTarballUrl(url: URL): string {
  const sanitized = new URL(url.toString());
  sanitizeUrlCredentials(sanitized);
  sanitizeUrlQueryParams(sanitized);
  return sanitized.toString();
}

/**
 * Check if a dependency specifier is an unverified external tarball.
 */
function checkTarballDependency(
  depName: string,
  spec: string,
  relPath: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding | undefined {
  const url = parseTarballUrl(spec);
  if (!url) return undefined;
  if (!isSeverityAtOrAbove("high", severityThreshold)) return undefined;

  const safeUrl = sanitizeTarballUrl(url);

  return {
    id: "SUPPLY_CHAIN_UNVERIFIED_TARBALL",
    category: "supply-chain",
    severity: "high",
    title: "Unverified external tarball dependency source",
    message: `Dependency "${depName}" in ${relPath} points directly to an unverified tarball: ${safeUrl}`,
    filePath: relPath,
    snippet: `"${depName}": "${safeUrl}"`,
    remediation:
      "Install dependencies from authenticated registries with cryptographic checksums rather than direct HTTP tarball URLs.",
    owasp: "A03:2025-Software Supply Chain Failures",
    cwe: "CWE-494",
    isoControl: "A.8.20",
  };
}

/**
 * Record a dependency version for monorepo cross-package divergence auditing.
 */
function recordDependencyVersion(
  packageVersionMap: Map<string, Map<string, string[]>>,
  depName: string,
  spec: string,
  relPath: string,
): void {
  if (spec.startsWith("workspace:")) return;

  let versionMap = packageVersionMap.get(depName);
  if (!versionMap) {
    versionMap = new Map<string, string[]>();
    packageVersionMap.set(depName, versionMap);
  }
  let fileList = versionMap.get(spec);
  if (!fileList) {
    fileList = [];
    versionMap.set(spec, fileList);
  }
  fileList.push(relPath);
}

/**
 * Audit dependencies declared within a single manifest section.
 */
function auditSingleDependencySection(
  deps: Record<string, string>,
  relPath: string,
  severityThreshold: SecurityFinding["severity"] | undefined,
  packageVersionMap: Map<string, Map<string, string[]>>,
): { findings: SecurityFinding[]; count: number } {
  const findings: SecurityFinding[] = [];
  let count = 0;

  for (const [depName, spec] of Object.entries(deps)) {
    if (typeof spec !== "string") continue;
    count += 1;
    const trimmed = spec.trim();
    const tarballFinding = checkTarballDependency(
      depName,
      trimmed,
      relPath,
      severityThreshold,
    );
    if (tarballFinding) findings.push(tarballFinding);
    recordDependencyVersion(packageVersionMap, depName, trimmed, relPath);
  }

  return { findings, count };
}

/**
 * Audit dependencies in a manifest for unverified tarballs and record versions for divergence checks.
 */
function auditManifestDependencies(
  manifest: PackageManifest,
  relPath: string,
  severityThreshold: SecurityFinding["severity"] | undefined,
  packageVersionMap: Map<string, Map<string, string[]>>,
): { findings: SecurityFinding[]; count: number } {
  const findings: SecurityFinding[] = [];
  let count = 0;

  const depSections: Array<keyof PackageManifest> = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ];

  for (const section of depSections) {
    const deps = manifest[section] as Record<string, string> | undefined;
    if (deps && typeof deps === "object") {
      const sectionResult = auditSingleDependencySection(
        deps,
        relPath,
        severityThreshold,
        packageVersionMap,
      );
      findings.push(...sectionResult.findings);
      count += sectionResult.count;
    }
  }

  return { findings, count };
}

/**
 * Format divergence finding for a package with conflicting version declarations.
 */
function buildDivergenceFinding(
  depName: string,
  versionMap: Map<string, string[]>,
): SecurityFinding {
  const versions = [...versionMap.entries()]
    .map(([ver, files]) => `${ver} (${files.join(", ")})`)
    .join(" vs ");
  const firstFile = [...versionMap.values()][0]?.[0] || "package.json";
  const versionKeys = [...versionMap.keys()].join(", ");

  return {
    id: "SUPPLY_CHAIN_VERSION_DIVERGENCE",
    category: "supply-chain",
    severity: "low",
    title: `Conflicting versions for external dependency "${depName}"`,
    message: `Package "${depName}" is declared with ${versionMap.size} different version specs across workspace manifests: ${versions}.`,
    filePath: firstFile,
    snippet: `Dependency: "${depName}", versions: ${versionKeys}`,
    remediation:
      "Align dependency versions across monorepo packages or leverage pnpm catalog definitions to prevent version drift.",
    owasp: "A03:2025-Software Supply Chain Failures",
    cwe: "CWE-1104",
    isoControl: "A.8.9",
  };
}

/**
 * Detect package version divergences across workspace members.
 */
function detectVersionDivergence(
  packageVersionMap: Map<string, Map<string, string[]>>,
  severityThreshold?: SecurityFinding["severity"],
): { findings: SecurityFinding[]; count: number } {
  const findings: SecurityFinding[] = [];
  let count = 0;
  const isLowOrAbove = isSeverityAtOrAbove("low", severityThreshold);

  for (const [depName, versionMap] of packageVersionMap.entries()) {
    if (versionMap.size <= 1) continue;
    count += 1;
    if (isLowOrAbove) {
      findings.push(buildDivergenceFinding(depName, versionMap));
    }
  }

  return { findings, count };
}

/**
 * Audit workspace package manifests for supply chain security risks: dangerous lifecycle scripts,
 * unverified tarballs, and divergent package versions.
 */
export function auditSupplyChain(
  options: SupplyChainAuditOptions = {},
): SupplyChainScanResult {
  const startTime = Date.now();
  const repoRoot = findRepoRoot();
  const targetPath = options.path
    ? resolveRepoPath(options.path, "supply chain path")
    : repoRoot;
  const manifests = collectManifests(targetPath, repoRoot);

  const findings: SecurityFinding[] = [];
  let totalDependencies = 0;
  let lifecycleScriptsCount = 0;
  const packageVersionMap = new Map<string, Map<string, string[]>>();

  for (const { manifest, relPath } of manifests) {
    const scriptsResult = auditLifecycleScripts(
      manifest,
      relPath,
      options.severityThreshold,
    );
    findings.push(...scriptsResult.findings);
    lifecycleScriptsCount += scriptsResult.count;

    const depsResult = auditManifestDependencies(
      manifest,
      relPath,
      options.severityThreshold,
      packageVersionMap,
    );
    findings.push(...depsResult.findings);
    totalDependencies += depsResult.count;
  }

  const divergenceResult = detectVersionDivergence(
    packageVersionMap,
    options.severityThreshold,
  );
  findings.push(...divergenceResult.findings);

  return {
    findings,
    scannedFiles: manifests.length,
    durationMs: Date.now() - startTime,
    clean: findings.length === 0,
    stats: {
      totalManifests: manifests.length,
      totalDependencies,
      lifecycleScriptsFound: lifecycleScriptsCount,
      duplicatePackagesFound: divergenceResult.count,
    },
  };
}
