import { existsSync } from "node:fs";
import { join, relative } from "node:path";

import { findRepoRoot } from "../repo/paths.ts";
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
 * Collect root and workspace member package.json manifests.
 */
function collectManifests(
  repoRoot: string,
): Array<{ manifest: PackageManifest; relPath: string }> {
  const manifests: Array<{ manifest: PackageManifest; relPath: string }> = [];

  const rootManifestPath = join(repoRoot, "package.json");
  if (existsSync(rootManifestPath)) {
    try {
      const rootManifest = readJson<PackageManifest>(rootManifestPath);
      manifests.push({ manifest: rootManifest, relPath: "package.json" });
    } catch {
      // Ignored
    }
  }

  try {
    const members = listAll();
    for (const member of members) {
      const pkgPath = join(member.dir, "package.json");
      if (existsSync(pkgPath)) {
        try {
          const manifest = readJson<PackageManifest>(pkgPath);
          const relPath = relative(repoRoot, pkgPath).replaceAll("\\", "/");
          manifests.push({ manifest, relPath });
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Continue with whatever manifests were found
  }

  return manifests;
}

/**
 * Audit package manifest lifecycle scripts (preinstall, postinstall, install).
 */
function auditLifecycleScripts(
  manifest: PackageManifest,
  relPath: string,
  severityThreshold?: SecurityFinding["severity"],
): { findings: SecurityFinding[]; count: number } {
  const findings: SecurityFinding[] = [];
  let count = 0;

  if (!manifest.scripts || typeof manifest.scripts !== "object") {
    return { findings, count };
  }

  const lifecycleHooks = ["preinstall", "postinstall", "install"] as const;
  for (const hook of lifecycleHooks) {
    const scriptCmd = manifest.scripts[hook];
    if (typeof scriptCmd === "string" && scriptCmd.trim().length > 0) {
      count += 1;
      const isDangerous = DANGEROUS_LIFECYCLE_CMD.test(scriptCmd);
      const severity = isDangerous ? "high" : "medium";

      if (isSeverityAtOrAbove(severity, severityThreshold)) {
        findings.push({
          id: isDangerous
            ? "SUPPLY_CHAIN_RISKY_LIFECYCLE_SCRIPT"
            : "SUPPLY_CHAIN_LIFECYCLE_SCRIPT",
          category: "supply-chain",
          severity,
          title: `Lifecycle script declared in ${hook}: ${scriptCmd.slice(0, 50)}`,
          message: `Package manifest ${relPath} executes shell command during "${hook}": "${scriptCmd}".`,
          filePath: relPath,
          snippet: `"${hook}": "${scriptCmd}"`,
          remediation:
            "Avoid lifecycle install scripts in libraries. Use explicit build scripts or postinstall filters to prevent arbitrary code execution on developer machines.",
          owasp: "A08:2025-Software and Data Integrity Failures",
          cwe: "CWE-94",
          isoControl: "A.8.25",
        });
      }
    }
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
    if (!deps || typeof deps !== "object") {
      continue;
    }

    for (const [depName, spec] of Object.entries(deps)) {
      if (typeof spec !== "string") {
        continue;
      }
      count += 1;
      const trimmed = spec.trim();

      if (
        trimmed.startsWith("https://") &&
        (trimmed.endsWith(".tgz") || trimmed.endsWith(".tar.gz"))
      ) {
        if (isSeverityAtOrAbove("high", severityThreshold)) {
          findings.push({
            id: "SUPPLY_CHAIN_UNVERIFIED_TARBALL",
            category: "supply-chain",
            severity: "high",
            title: "Unverified external tarball dependency source",
            message: `Dependency "${depName}" in ${relPath} points directly to an unverified tarball: ${trimmed}`,
            filePath: relPath,
            snippet: `"${depName}": "${spec}"`,
            remediation:
              "Install dependencies from authenticated registries with cryptographic checksums rather than direct HTTP tarball URLs.",
            owasp: "A08:2025-Software and Data Integrity Failures",
            cwe: "CWE-494",
            isoControl: "A.8.20",
          });
        }
      }

      if (!trimmed.startsWith("workspace:")) {
        let versionMap = packageVersionMap.get(depName);
        if (!versionMap) {
          versionMap = new Map<string, string[]>();
          packageVersionMap.set(depName, versionMap);
        }
        let fileList = versionMap.get(trimmed);
        if (!fileList) {
          fileList = [];
          versionMap.set(trimmed, fileList);
        }
        fileList.push(relPath);
      }
    }
  }

  return { findings, count };
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

  for (const [depName, versionMap] of packageVersionMap.entries()) {
    if (versionMap.size > 1) {
      count += 1;
      if (isSeverityAtOrAbove("low", severityThreshold)) {
        const versions = Array.from(versionMap.entries())
          .map(([ver, files]) => `${ver} (${files.join(", ")})`)
          .join(" vs ");

        findings.push({
          id: "SUPPLY_CHAIN_VERSION_DIVERGENCE",
          category: "supply-chain",
          severity: "low",
          title: `Conflicting versions for external dependency "${depName}"`,
          message: `Package "${depName}" is declared with ${versionMap.size} different version specs across workspace manifests: ${versions}.`,
          filePath: Array.from(versionMap.values())[0]?.[0] ?? "package.json",
          snippet: `Dependency: "${depName}", versions: ${Array.from(versionMap.keys()).join(", ")}`,
          remediation:
            "Align dependency versions across monorepo packages or leverage pnpm catalog definitions to prevent version drift.",
          owasp: "A06:2025-Vulnerable and Outdated Components",
          cwe: "CWE-1104",
          isoControl: "A.8.9",
        });
      }
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
  const manifests = collectManifests(repoRoot);

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
