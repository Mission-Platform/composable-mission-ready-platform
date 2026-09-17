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

export function auditSupplyChain(
  options: SupplyChainAuditOptions = {},
): SupplyChainScanResult {
  const startTime = Date.now();
  const repoRoot = findRepoRoot();
  const findings: SecurityFinding[] = [];

  const manifests: Array<{ manifest: PackageManifest; relPath: string }> = [];

  // Read root manifest
  const rootManifestPath = join(repoRoot, "package.json");
  if (existsSync(rootManifestPath)) {
    try {
      const rootManifest = readJson<PackageManifest>(rootManifestPath);
      manifests.push({ manifest: rootManifest, relPath: "package.json" });
    } catch {
      // Ignored
    }
  }

  // Read all member manifests
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

  let totalDependencies = 0;
  let lifecycleScriptsCount = 0;
  const packageVersionMap = new Map<string, Map<string, string[]>>(); // depName -> version -> list of files

  for (const { manifest, relPath } of manifests) {
    // 1. Check lifecycle scripts
    if (manifest.scripts && typeof manifest.scripts === "object") {
      const lifecycleHooks = ["preinstall", "postinstall", "install"] as const;
      for (const hook of lifecycleHooks) {
        const scriptCmd = manifest.scripts[hook];
        if (typeof scriptCmd === "string" && scriptCmd.trim().length > 0) {
          lifecycleScriptsCount += 1;
          const isDangerous = DANGEROUS_LIFECYCLE_CMD.test(scriptCmd);
          const severity = isDangerous ? "high" : "medium";

          if (isSeverityAtOrAbove(severity, options.severityThreshold)) {
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
    }

    // 2. Track dependency versions & check unverified tarball URLs
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
        totalDependencies += 1;
        const trimmed = spec.trim();

        // Check unverified tarballs / URLs
        if (
          trimmed.startsWith("https://") &&
          (trimmed.endsWith(".tgz") || trimmed.endsWith(".tar.gz"))
        ) {
          if (isSeverityAtOrAbove("high", options.severityThreshold)) {
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

        // Exclude workspace packages from version divergence tracking
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
  }

  // 3. Find divergent versions across the workspace
  let duplicateCount = 0;
  for (const [depName, versionMap] of packageVersionMap.entries()) {
    if (versionMap.size > 1) {
      duplicateCount += 1;
      if (isSeverityAtOrAbove("low", options.severityThreshold)) {
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

  return {
    findings,
    scannedFiles: manifests.length,
    durationMs: Date.now() - startTime,
    clean: findings.length === 0,
    stats: {
      totalManifests: manifests.length,
      totalDependencies,
      lifecycleScriptsFound: lifecycleScriptsCount,
      duplicatePackagesFound: duplicateCount,
    },
  };
}
