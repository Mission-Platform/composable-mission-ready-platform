export type SecurityFindingSeverity =
  "critical" | "high" | "medium" | "low" | "info";

export type SecurityFindingCategory =
  | "secret"
  | "vulnerability"
  | "dependency"
  | "policy"
  | "supply-chain"
  | "compliance";

export interface SecurityFinding {
  readonly id: string;
  readonly category: SecurityFindingCategory;
  readonly severity: SecurityFindingSeverity;
  readonly title: string;
  readonly message: string;
  readonly filePath: string;
  readonly line?: number;
  readonly column?: number;
  readonly snippet?: string;
  readonly remediation: string;
  readonly owasp?: string;
  readonly cwe?: string;
  readonly isoControl?: string;
}

export interface SecurityScanResult {
  readonly findings: readonly SecurityFinding[];
  readonly scannedFiles: number;
  readonly durationMs: number;
  readonly clean: boolean;
  readonly incomplete?: boolean;
  readonly skippedFiles?: number;
  readonly unreadableFiles?: number;
  readonly oversizedFiles?: number;
  readonly errors?: readonly string[];
}

export interface OwaspCategoryDefinition {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
}

export const OWASP_2025_TOP_10 = {
  "A01:2025": {
    id: "A01:2025",
    code: "A01:2025-Broken Access Control",
    title: "Broken Access Control",
    description:
      "Failures in enforcing restrictions on authenticated users, path traversal, SSRF, or insecure direct object references.",
  },
  "A02:2025": {
    id: "A02:2025",
    code: "A02:2025-Security Misconfiguration",
    title: "Security Misconfiguration",
    description:
      "Insecure defaults, overly permissive CORS, disabled TLS validation, or unhardened server headers.",
  },
  "A03:2025": {
    id: "A03:2025",
    code: "A03:2025-Software Supply Chain Failures",
    title: "Software Supply Chain Failures",
    description:
      "Vulnerabilities and risks arising from third-party dependencies, malicious packages, or compromised build and distribution pipelines.",
  },
  "A04:2025": {
    id: "A04:2025",
    code: "A04:2025-Cryptographic Failures",
    title: "Cryptographic Failures",
    description:
      "Exposure of sensitive data in transit or rest, weak cryptography, or insufficient entropy.",
  },
  "A05:2025": {
    id: "A05:2025",
    code: "A05:2025-Injection",
    title: "Injection",
    description:
      "Untrusted user data interpreted as commands or queries (SQL, OS command, DOM XSS, code injection).",
  },
  "A06:2025": {
    id: "A06:2025",
    code: "A06:2025-Insecure Design",
    title: "Insecure Design",
    description:
      "Flaws resulting from lack of threat modeling, architectural weaknesses, or unconstrained resource limits.",
  },
  "A07:2025": {
    id: "A07:2025",
    code: "A07:2025-Authentication Failures",
    title: "Authentication Failures",
    description:
      "Hardcoded secrets, exposed credentials, session fixation, or weak credential verification.",
  },
  "A08:2025": {
    id: "A08:2025",
    code: "A08:2025-Software or Data Integrity Failures",
    title: "Software or Data Integrity Failures",
    description:
      "Failure to maintain trust boundaries and verify integrity of software, code, and data artifacts.",
  },
  "A09:2025": {
    id: "A09:2025",
    code: "A09:2025-Security Logging & Alerting Failures",
    title: "Security Logging & Alerting Failures",
    description:
      "Insufficient logging of security events, lack of alerting on critical events, or inadvertent logging of sensitive credentials.",
  },
  "A10:2025": {
    id: "A10:2025",
    code: "A10:2025-Mishandling of Exceptional Conditions",
    title: "Mishandling of Exceptional Conditions",
    description:
      "Improper error handling, failing open, unhandled exceptions, or catastrophic backtracking (ReDoS).",
  },
} as const satisfies Record<string, OwaspCategoryDefinition>;

export interface CweDefinition {
  readonly id: string;
  readonly name: string;
}

export const CWE_TOP_25 = {
  "CWE-79": {
    id: "CWE-79",
    name: "Improper Neutralization of Input During Web Page Generation (XSS)",
  },
  "CWE-787": { id: "CWE-787", name: "Out-of-bounds Write" },
  "CWE-89": {
    id: "CWE-89",
    name: "Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)",
  },
  "CWE-20": { id: "CWE-20", name: "Improper Input Validation" },
  "CWE-125": { id: "CWE-125", name: "Out-of-bounds Read" },
  "CWE-78": {
    id: "CWE-78",
    name: "Improper Neutralization of Special Elements used in an OS Command (OS Command Injection)",
  },
  "CWE-416": { id: "CWE-416", name: "Use After Free" },
  "CWE-22": {
    id: "CWE-22",
    name: "Improper Limitation of a Pathname to a Restricted Directory (Path Traversal)",
  },
  "CWE-352": { id: "CWE-352", name: "Cross-Site Request Forgery (CSRF)" },
  "CWE-434": {
    id: "CWE-434",
    name: "Unrestricted Upload of File with Dangerous Type",
  },
  "CWE-476": { id: "CWE-476", name: "NULL Pointer Dereference" },
  "CWE-502": { id: "CWE-502", name: "Deserialization of Untrusted Data" },
  "CWE-190": { id: "CWE-190", name: "Integer Overflow or Wraparound" },
  "CWE-287": { id: "CWE-287", name: "Improper Authentication" },
  "CWE-798": { id: "CWE-798", name: "Use of Hard-coded Credentials" },
  "CWE-862": { id: "CWE-862", name: "Missing Authorization" },
  "CWE-77": {
    id: "CWE-77",
    name: "Improper Neutralization of Special Elements used in a Command (Command Injection)",
  },
  "CWE-306": {
    id: "CWE-306",
    name: "Missing Authentication for Critical Function",
  },
  "CWE-119": {
    id: "CWE-119",
    name: "Improper Restriction of Operations within the Bounds of a Memory Buffer",
  },
  "CWE-276": { id: "CWE-276", name: "Incorrect Default Permissions" },
  "CWE-918": { id: "CWE-918", name: "Server-Side Request Forgery (SSRF)" },
  "CWE-362": {
    id: "CWE-362",
    name: "Concurrent Execution using Shared Resource with Improper Synchronization (Race Condition)",
  },
  "CWE-400": { id: "CWE-400", name: "Uncontrolled Resource Consumption" },
  "CWE-611": {
    id: "CWE-611",
    name: "Improper Restriction of XML External Entity Reference (XXE)",
  },
  "CWE-94": {
    id: "CWE-94",
    name: "Improper Control of Generation of Code (Code Injection)",
  },
  "CWE-95": {
    id: "CWE-95",
    name: "Improper Neutralization of Directives in Dynamically Evaluated Code (Eval Injection)",
  },
  "CWE-1333": {
    id: "CWE-1333",
    name: "Inefficient Regular Expression Complexity (ReDoS)",
  },
  "CWE-330": { id: "CWE-330", name: "Use of Insufficiently Random Values" },
  "CWE-327": {
    id: "CWE-327",
    name: "Use of a Broken or Risky Cryptographic Algorithm",
  },
  "CWE-532": {
    id: "CWE-532",
    name: "Insertion of Sensitive Information into Log File",
  },
  "CWE-295": { id: "CWE-295", name: "Improper Certificate Validation" },
  "CWE-319": {
    id: "CWE-319",
    name: "Cleartext Transmission of Sensitive Information",
  },
  "CWE-601": {
    id: "CWE-601",
    name: "URL Redirection to Untrusted Site (Open Redirect)",
  },
  "CWE-1104": {
    id: "CWE-1104",
    name: "Use of Unmaintained Third-Party Components",
  },
  "CWE-16": { id: "CWE-16", name: "Configuration" },
} as const satisfies Record<string, CweDefinition>;

export interface IsoControlDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
}

export const ISO_27001_CONTROLS = {
  "A.8.8": {
    id: "A.8.8",
    name: "Management of technical vulnerabilities",
    category: "Technological controls",
    description:
      "Information about technical vulnerabilities of information systems being used shall be obtained, evaluated, and addressed.",
  },
  "A.8.9": {
    id: "A.8.9",
    name: "Configuration management",
    category: "Technological controls",
    description:
      "Configurations of hardware, software, services, and networks shall be established, documented, implemented, monitored, and reviewed.",
  },
  "A.8.12": {
    id: "A.8.12",
    name: "Data leakage prevention",
    category: "Technological controls",
    description:
      "Data leakage prevention measures shall be applied to systems, networks, and any other devices that process, store, or transmit sensitive information.",
  },
  "A.8.20": {
    id: "A.8.20",
    name: "Network security",
    category: "Technological controls",
    description:
      "Networks and network devices shall be secured, managed, and controlled to protect information in systems and applications.",
  },
  "A.8.25": {
    id: "A.8.25",
    name: "Secure development life cycle",
    category: "Technological controls",
    description:
      "Rules for the secure development of software and systems shall be established and applied.",
  },
  "A.8.28": {
    id: "A.8.28",
    name: "Secure coding",
    category: "Technological controls",
    description:
      "Secure coding principles shall be applied to software development.",
  },
  "A.8.32": {
    id: "A.8.32",
    name: "Change management",
    category: "Technological controls",
    description:
      "Changes to information processing facilities and information systems shall be subject to change management procedures.",
  },
} as const satisfies Record<string, IsoControlDefinition>;

export interface ScanSecretsOptions {
  readonly path?: string;
  readonly content?: string;
  readonly filePath?: string;
  readonly staged?: boolean;
  readonly severityThreshold?: SecurityFindingSeverity;
  readonly maxFiles?: number;
}

export interface AnalyzeCodeOptions {
  readonly path?: string;
  readonly content?: string;
  readonly filePath?: string;
  readonly severityThreshold?: SecurityFindingSeverity;
  readonly maxFiles?: number;
}

export interface AuditDependenciesOptions {
  readonly path?: string;
  readonly severityThreshold?: SecurityFindingSeverity;
  readonly runPnpmAudit?: boolean;
}

export interface SupplyChainAuditOptions {
  readonly path?: string;
  readonly severityThreshold?: SecurityFindingSeverity;
}

export interface SupplyChainStats {
  readonly totalManifests: number;
  readonly totalDependencies: number;
  readonly lifecycleScriptsFound: number;
  readonly duplicatePackagesFound: number;
}

export interface SupplyChainScanResult extends SecurityScanResult {
  readonly stats: SupplyChainStats;
}

export type ComplianceControlStatus =
  "compliant" | "non-compliant" | "needs-review";

export interface IsoControlEvidence {
  readonly controlId: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly status: ComplianceControlStatus;
  readonly findings: readonly SecurityFinding[];
  readonly metrics: Record<string, unknown>;
  readonly notes: string;
}

export interface OwaspScorecardEntry {
  readonly code: string;
  readonly title: string;
  readonly findingsCount: number;
  readonly criticalCount: number;
  readonly highCount: number;
  readonly mediumCount: number;
  readonly lowCount: number;
}

export interface CweScorecardEntry {
  readonly cweId: string;
  readonly name: string;
  readonly findingsCount: number;
}

export interface ComplianceScorecard {
  readonly iso27001ComplianceScore: number;
  readonly totalControlsEvaluated: number;
  readonly compliantControlsCount: number;
  readonly nonCompliantControlsCount: number;
  readonly totalFindingsCount: number;
  readonly criticalFindingsCount: number;
  readonly highFindingsCount: number;
  readonly mediumFindingsCount: number;
}

export interface ComplianceEvidenceReport {
  readonly metadata: {
    readonly timestamp: string;
    readonly repoRoot: string;
    readonly commitSha?: string;
    readonly branch?: string;
    readonly cleanTree?: boolean;
    readonly durationMs: number;
  };
  readonly scorecard: ComplianceScorecard;
  readonly isoControls: readonly IsoControlEvidence[];
  readonly owaspScorecard: readonly OwaspScorecardEntry[];
  readonly cweScorecard: readonly CweScorecardEntry[];
  readonly findings: readonly SecurityFinding[];
}

export interface CollectComplianceEvidenceOptions {
  readonly path?: string;
  readonly runPnpmAudit?: boolean;
  readonly severityThreshold?: SecurityFindingSeverity;
  readonly maxFiles?: number;
}

export const SEVERITY_LEVELS: readonly SecurityFindingSeverity[] = [
  "info",
  "low",
  "medium",
  "high",
  "critical",
];

export const SEVERITY_WEIGHTS: Record<SecurityFindingSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
} satisfies Record<SecurityFindingSeverity, number>;

const PNPM_SEVERITY_MAP: Record<string, SecurityFindingSeverity> = {
  moderate: "medium",
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  info: "info",
};

/**
 * Determine if a finding severity meets or exceeds the required threshold.
 */
export function isSeverityAtOrAbove(
  findingSeverity: SecurityFindingSeverity,
  threshold?: SecurityFindingSeverity,
): boolean {
  if (!threshold) {
    return true;
  }
  return SEVERITY_WEIGHTS[findingSeverity] >= SEVERITY_WEIGHTS[threshold];
}

/**
 * Normalize pnpm audit advisory severity string to a standard severity level.
 */
export function normalizePnpmSeverity(
  rawSeverity: string,
): SecurityFindingSeverity {
  const normalized = rawSeverity.toLowerCase().trim();
  return PNPM_SEVERITY_MAP[normalized] ?? "info";
}
