import { lstatSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { join, relative } from "node:path";

import { findRepoRoot, resolveRepoPath } from "../repo/paths.ts";
import {
  isSeverityAtOrAbove,
  type AnalyzeCodeOptions,
  type SecurityFinding,
  type SecurityScanResult,
} from "./types.ts";

const MAX_SCAN_BYTES = 256 * 1024;
const DEFAULT_MAX_FILES = 100;

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".svelte",
  ".html",
  ".mjs",
  ".cjs",
]);

const IGNORED_DIRS = new Set([
  ".git",
  ".turbo",
  ".idea",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".forge-attempt",
]);

interface CodeVulnerabilityRule {
  readonly id: string;
  readonly title: string;
  readonly severity: SecurityFinding["severity"];
  readonly pattern: RegExp;
  readonly remediation: string;
  readonly owasp?: string;
  readonly cwe?: string;
  readonly isoControl?: string;
  readonly isMatchValid?: (
    match: RegExpExecArray,
    lineText: string,
    fullContent: string,
  ) => boolean;
}

const VULNERABILITY_RULES: readonly CodeVulnerabilityRule[] = [
  {
    id: "DOM_XSS_INNER_HTML",
    title: "DOM XSS: Direct HTML assignment without sanitization",
    severity: "high",
    owasp: "A05:2025-Injection",
    cwe: "CWE-79",
    isoControl: "A.8.28",
    pattern:
      /(?:\.innerHTML|\.outerHTML)\s*=\s*(?!.*(?:DOMPurify\.sanitize|sanitize\())([^;\n]+)/g,
    remediation:
      "Sanitize raw HTML with DOMPurify.sanitize(...) before assigning to innerHTML or outerHTML.",
    isMatchValid: (_match, lineText) =>
      !lineText.includes("DOMPurify.sanitize") && !lineText.includes("// safe"),
  },
  {
    id: "DOM_XSS_DANGEROUSLY_SET",
    title: "DOM XSS: dangerouslySetInnerHTML without sanitization",
    severity: "high",
    owasp: "A05:2025-Injection",
    cwe: "CWE-79",
    isoControl: "A.8.28",
    pattern:
      /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*(?!.*(?:DOMPurify\.sanitize|sanitize\())([^}]+)\}\s*\}/g,
    remediation:
      "Wrap raw HTML markup with DOMPurify.sanitize(...) before passing to dangerouslySetInnerHTML.",
    isMatchValid: (_match, lineText) =>
      !lineText.includes("DOMPurify.sanitize") &&
      !lineText.includes("sanitize("),
  },
  {
    id: "DOM_XSS_V_HTML",
    title: "DOM XSS: v-html directive without sanitization",
    severity: "high",
    owasp: "A05:2025-Injection",
    cwe: "CWE-79",
    isoControl: "A.8.28",
    pattern: /v-html=["'](?!.*(?:DOMPurify\.sanitize|sanitize\())([^"']+)["']/g,
    remediation:
      "Sanitize dynamic HTML expressions with DOMPurify.sanitize(...) before binding to v-html.",
    isMatchValid: (_match, lineText) =>
      !lineText.includes("DOMPurify.sanitize") &&
      !lineText.includes("sanitize("),
  },
  {
    id: "UNSAFE_EVAL",
    title: "Unsafe Execution: Use of eval()",
    severity: "critical",
    owasp: "A05:2025-Injection",
    cwe: "CWE-95",
    isoControl: "A.8.28",
    pattern:
      /\b(?:eval|window\.execScript)\s*\((?!.*(?:['"`]use strict['"`]))/g,
    remediation:
      "Avoid eval() or execScript(); parse structured data with JSON.parse() or use safe deterministic interpreters.",
  },
  {
    id: "UNSAFE_FUNCTION_CONSTRUCTOR",
    title: "Unsafe Execution: Dynamic Function constructor",
    severity: "high",
    owasp: "A05:2025-Injection",
    cwe: "CWE-94",
    isoControl: "A.8.28",
    pattern: /\bnew\s+Function\s*\(/g,
    remediation:
      "Avoid creating functions dynamically from string input; use static functions or dispatch maps.",
  },
  {
    id: "UNSAFE_TIMER_STRING",
    title: "Unsafe Timer: String argument passed to setTimeout or setInterval",
    severity: "medium",
    owasp: "A05:2025-Injection",
    cwe: "CWE-94",
    isoControl: "A.8.28",
    pattern: /\b(?:setTimeout|setInterval)\s*\(\s*["'`][^"'`]+["'`]/g,
    remediation:
      "Pass a function callback reference to setTimeout or setInterval rather than evaluating a code string.",
  },
  {
    id: "COMMAND_INJECTION",
    title:
      "Command Injection: Dynamic OS command execution with template literals or concatenation",
    severity: "critical",
    owasp: "A05:2025-Injection",
    cwe: "CWE-78",
    isoControl: "A.8.28",
    pattern:
      /\b(?:exec|execSync)\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|[a-zA-Z0-9_]+\s*\+\s*[^,)]+)/g,
    remediation:
      "Use execFile() or spawn() with argument arrays rather than concatenating user input into shell strings.",
    isMatchValid: (_match, lineText) =>
      !lineText.includes("// safe") && !lineText.includes("// test"),
  },
  {
    id: "SQL_INJECTION",
    title: "SQL Injection: Dynamic query string concatenation",
    severity: "critical",
    owasp: "A05:2025-Injection",
    cwe: "CWE-89",
    isoControl: "A.8.28",
    pattern:
      /\b(?:query|execute|raw|queryRaw)\s*\(\s*(?:["'`]\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b[^"'`]*["'`]\s*\+|`\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b[^`]*\$\{)/gi,
    remediation:
      "Use parameterized queries or prepared statements ($1, ?) instead of string interpolation.",
  },
  {
    id: "PATH_TRAVERSAL",
    title:
      "Path Traversal: Unvalidated user input used in filesystem operations",
    severity: "high",
    owasp: "A01:2025-Broken Access Control",
    cwe: "CWE-22",
    isoControl: "A.8.28",
    pattern:
      /\b(?:readFileSync|writeFileSync|readFile|writeFile|createReadStream|createWriteStream|unlinkSync|unlink)\s*\(\s*(?:req\.(?:query|params|body)|userInput|`[^`]*\$\{req\.)/g,
    remediation:
      "Validate and constrain file paths using resolveRepoPath() or an allowlist to prevent directory traversal.",
  },
  {
    id: "UNSAFE_REDIRECT_SCHEME",
    title:
      "Unsafe Scheme: javascript: or data: pseudo-protocol in navigation or link",
    severity: "high",
    owasp: "A01:2025-Broken Access Control",
    cwe: "CWE-601",
    isoControl: "A.8.28",
    pattern:
      /(?:href|location\.href|window\.location|location\.assign|window\.open)\s*(?:=|:|\()\s*["'`]\s*(?:javascript:|data:text\/html)/gi,
    remediation:
      "Disallow javascript: or data: URL schemes; validate navigation targets against safe protocols (http: and https:).",
  },
  {
    id: "SSRF_UNVALIDATED_FETCH",
    title: "SSRF Risk: Dynamic unvalidated URL concatenation in HTTP request",
    severity: "medium",
    owasp: "A01:2025-Broken Access Control",
    cwe: "CWE-918",
    isoControl: "A.8.28",
    pattern:
      /\b(?:fetch|axios\.(?:get|post|put|delete))\s*\(\s*(?:req\.(?:query|params|body)|userInput|inputUrl|\$\{[^}]*(?:req|param|query|input)[^}]*\})/gi,
    remediation:
      "Validate and sanitize external target URLs against an allowlist of approved domains and protocols before fetching.",
  },
  {
    id: "REDOS_PATTERN",
    title:
      "ReDoS: Nested quantifier in regular expression causing catastrophic backtracking",
    severity: "medium",
    owasp: "A10:2025-Mishandling of Exceptional Conditions",
    cwe: "CWE-1333",
    isoControl: "A.8.28",
    pattern:
      /(?:\/|RegExp\s*\(\s*['"`])(?:[^\n/]*\((?:[^\n()]*[+*]){1,}[^\n()]*\)(?:[+*]|\{\d+,?\d*\}))/g,
    remediation:
      "Refactor regular expressions to eliminate nested repetition operators that cause exponential backtracking.",
    isMatchValid: (match) => {
      const patternText = match[0];
      return /\([^)]*[+*]\)[+*]/.test(patternText);
    },
  },
  {
    id: "INSECURE_RANDOM",
    title:
      "Insecure Randomness: Math.random() used in security or cryptographic context",
    severity: "medium",
    owasp: "A04:2025-Cryptographic Failures",
    cwe: "CWE-330",
    isoControl: "A.8.28",
    pattern:
      /(?:token|secret|password|salt|nonce|crypto|apiKey|session|auth)\s*[:=][^\n;]*?Math\.random\(\)|Math\.random\(\)[^\n;]*?(?:toString\(36\)|token|secret|password)/gi,
    remediation:
      "Use crypto.getRandomValues() or node:crypto randomBytes() for cryptographic tokens and session identifiers.",
  },
  {
    id: "INSECURE_CRYPTO_HASH",
    title: "Insecure Cryptography: Broken hash algorithm (MD5 or SHA1)",
    severity: "high",
    owasp: "A04:2025-Cryptographic Failures",
    cwe: "CWE-327",
    isoControl: "A.8.28",
    pattern: /\bcrypto\.createHash\s*\(\s*["'](?:md5|sha1)["']\s*\)/gi,
    remediation:
      'Use secure modern cryptographic hashes such as SHA-256 (crypto.createHash("sha256")) or Argon2/bcrypt for passwords.',
  },
  {
    id: "SENSITIVE_DATA_LOGGING",
    title: "Sensitive Data Exposure: Logging credentials or secrets",
    severity: "medium",
    owasp: "A09:2025-Security Logging & Alerting Failures",
    cwe: "CWE-532",
    isoControl: "A.8.12",
    pattern:
      /\b(?:console\.(?:log|warn|error|info|debug)|logger\.(?:info|error|warn|debug))\s*\(\s*[^)]*?\b(?:password|passwd|api_key|apiKey|secretKey|privateKey)\b[^)]*?\)/gi,
    remediation:
      "Redact or sanitize sensitive credentials before logging to avoid exposing secrets in log stores.",
    isMatchValid: (_match, lineText) =>
      !lineText.includes("// safe") &&
      !lineText.includes("dummy") &&
      !lineText.includes("placeholder"),
  },
  {
    id: "INSECURE_TLS_CONFIG",
    title: "Security Misconfiguration: Disabled TLS certificate validation",
    severity: "critical",
    owasp: "A02:2025-Security Misconfiguration",
    cwe: "CWE-295",
    isoControl: "A.8.9",
    pattern: /\brejectUnauthorized\s*:\s*false\b/g,
    remediation:
      "Never disable rejectUnauthorized in production; install valid CA certificates or custom trust anchors.",
  },
  {
    id: "OVERLY_PERMISSIVE_CORS",
    title: "Security Misconfiguration: Wildcard CORS origin with credentials",
    severity: "medium",
    owasp: "A02:2025-Security Misconfiguration",
    cwe: "CWE-16",
    isoControl: "A.8.9",
    pattern:
      /(?:origin\s*:\s*['"]\*['"]\s*,\s*credentials\s*:\s*true|credentials\s*:\s*true\s*,\s*origin\s*:\s*['"]\*['"])/g,
    remediation:
      'Do not pair wildcard CORS origin ("*") with credentials: true; specify trusted explicit origins.',
  },
];

/**
 * Match a static code vulnerability rule against a single line of text.
 */
function matchVulnerabilityRule(
  rule: CodeVulnerabilityRule,
  lineText: string,
  lineIdx: number,
  content: string,
  filePath: string,
  findings: SecurityFinding[],
): void {
  rule.pattern.lastIndex = 0;
  let match: RegExpExecArray | null = rule.pattern.exec(lineText);
  while (match !== null) {
    const isValid = rule.isMatchValid
      ? rule.isMatchValid(match, lineText, content)
      : true;
    if (isValid) {
      const snippet = lineText.trim();
      findings.push({
        id: rule.id,
        category: "vulnerability",
        severity: rule.severity,
        title: rule.title,
        message: `${rule.title} in ${filePath}:${lineIdx + 1}`,
        filePath,
        line: lineIdx + 1,
        column: match.index + 1,
        snippet: snippet.length > 140 ? `${snippet.slice(0, 140)}...` : snippet,
        remediation: rule.remediation,
        owasp: rule.owasp,
        cwe: rule.cwe,
        isoControl: rule.isoControl,
      });
    }
    match = rule.pattern.exec(lineText);
  }
}

/**
 * Scan a single non-empty line against applicable vulnerability rules.
 */
function scanLineRules(
  lineText: string,
  lineIdx: number,
  content: string,
  filePath: string,
  severityThreshold: SecurityFinding["severity"] | undefined,
  findings: SecurityFinding[],
): void {
  for (const rule of VULNERABILITY_RULES) {
    if (isSeverityAtOrAbove(rule.severity, severityThreshold)) {
      matchVulnerabilityRule(
        rule,
        lineText,
        lineIdx,
        content,
        filePath,
        findings,
      );
    }
  }
}

/**
 * Scan source code content against static vulnerability rules.
 */
function scanContent(
  content: string,
  filePath: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
    const rawLine = lines[lineIdx];
    if (!rawLine || rawLine.trim().length === 0) continue;
    scanLineRules(
      rawLine,
      lineIdx,
      content,
      filePath,
      severityThreshold,
      findings,
    );
  }

  return findings;
}

/**
 * Check if a file name has an analyzed code extension.
 */
function isCodeFile(name: string): boolean {
  const ext = name.includes(".")
    ? `.${name.split(".").pop()?.toLowerCase()}`
    : "";
  return CODE_EXTENSIONS.has(ext);
}

/**
 * Check whether a directory entry represents an analyzable source file.
 */
function isAnalyzableFile(entry: Dirent): boolean {
  if (!entry.isFile()) return false;
  return isCodeFile(entry.name);
}

interface CodeTraversalState {
  skippedCount: number;
  unreadableCount: number;
  errors: string[];
}

/**
 * Handle a directory entry during code file collection if not ignored.
 */
function handleCodeDirectoryEntry(
  name: string,
  fullPath: string,
  maxFiles: number,
  collected: string[],
  state: CodeTraversalState,
): void {
  if (!IGNORED_DIRS.has(name)) {
    collectCodeFiles(fullPath, maxFiles, collected, state);
  }
}

/**
 * Handle a file entry during code collection, respecting maxFiles limits.
 */
function handleCodeFileEntry(
  entry: Dirent,
  fullPath: string,
  maxFiles: number,
  collected: string[],
  state: CodeTraversalState,
): void {
  if (!isAnalyzableFile(entry)) return;
  if (collected.length < maxFiles) {
    collected.push(fullPath);
  } else {
    state.skippedCount += 1;
  }
}

/**
 * Process a directory entry for scannable source file collection.
 */
function processCodeDirectoryEntry(
  entry: Dirent,
  startDir: string,
  maxFiles: number,
  collected: string[],
  state: CodeTraversalState,
): void {
  if (entry.isSymbolicLink()) return;
  const fullPath = join(startDir, entry.name);
  if (entry.isDirectory()) {
    handleCodeDirectoryEntry(entry.name, fullPath, maxFiles, collected, state);
    return;
  }
  handleCodeFileEntry(entry, fullPath, maxFiles, collected, state);
}

/**
 * Collect scannable source code files recursively up to maxFiles.
 */
function collectCodeFiles(
  startDir: string,
  maxFiles: number,
  collected: string[] = [],
  state: CodeTraversalState = {
    skippedCount: 0,
    unreadableCount: 0,
    errors: [],
  },
): {
  files: string[];
  skippedCount: number;
  unreadableCount: number;
  errors: string[];
} {
  try {
    const entries = readdirSync(startDir, { withFileTypes: true });
    for (const entry of entries) {
      processCodeDirectoryEntry(entry, startDir, maxFiles, collected, state);
    }
  } catch (error) {
    state.unreadableCount += 1;
    const errorMsg = error instanceof Error ? error.message : String(error);
    state.errors.push(`Directory unreadable: ${startDir}: ${errorMsg}`);
  }

  return {
    files: collected,
    skippedCount: state.skippedCount,
    unreadableCount: state.unreadableCount,
    errors: state.errors,
  };
}

interface SingleFileAnalysisResult {
  readonly findings: SecurityFinding[];
  readonly status: "scanned" | "oversized" | "unreadable";
  readonly error?: string;
}

/**
 * Analyze a single source file for static vulnerability patterns.
 */
function analyzeSingleFile(
  filePath: string,
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): SingleFileAnalysisResult {
  try {
    const stat = lstatSync(filePath);
    if (stat.size > MAX_SCAN_BYTES) {
      return { findings: [], status: "oversized" };
    }
    const content = readFileSync(filePath, "utf8");
    const relativePath = relative(repoRoot, filePath).replaceAll("\\", "/");
    return {
      findings: scanContent(content, relativePath, severityThreshold),
      status: "scanned",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      findings: [],
      status: "unreadable",
      error: `${relative(repoRoot, filePath)}: ${errorMsg}`,
    };
  }
}

/**
 * Analyze inline source code passed via options.
 */
function analyzeInlineCode(
  options: AnalyzeCodeOptions,
  startTime: number,
): SecurityScanResult {
  const logicalPath = options.filePath ?? "inline-code.ts";
  const findings = scanContent(
    options.content ?? "",
    logicalPath,
    options.severityThreshold,
  );
  return {
    findings,
    scannedFiles: 1,
    durationMs: Date.now() - startTime,
    clean: findings.length === 0,
  };
}

/**
 * Accumulate individual file analysis outcome into scanning statistics.
 */
function accumulateAnalysisOutcome(
  result: SingleFileAnalysisResult,
  stats: {
    findings: SecurityFinding[];
    scannedCount: number;
    oversizedCount: number;
    unreadableCount: number;
    errors: string[];
  },
): void {
  stats.findings.push(...result.findings);
  if (result.status === "scanned") {
    stats.scannedCount += 1;
    return;
  }
  if (result.status === "oversized") {
    stats.oversizedCount += 1;
    return;
  }
  stats.unreadableCount += 1;
  if (result.error) stats.errors.push(result.error);
}

/**
 * Scan directory target path for static code vulnerabilities.
 */
function scanDirectoryTargetPath(
  targetPath: string,
  repoRoot: string,
  maxFiles: number,
  severityThreshold?: SecurityFinding["severity"],
) {
  const { files, skippedCount, unreadableCount, errors } = collectCodeFiles(
    targetPath,
    maxFiles,
  );
  const stats = {
    findings: [] as SecurityFinding[],
    scannedCount: 0,
    oversizedCount: 0,
    unreadableCount,
    errors: [...errors],
  };
  for (const file of files) {
    const outcome = analyzeSingleFile(file, repoRoot, severityThreshold);
    accumulateAnalysisOutcome(outcome, stats);
  }
  return { ...stats, skippedCount };
}

/**
 * Scan target filesystem path (file or directory) for static code vulnerabilities.
 */
function scanTargetPath(
  targetPath: string,
  repoRoot: string,
  maxFiles: number,
  severityThreshold?: SecurityFinding["severity"],
) {
  const stat = lstatSync(targetPath);
  if (stat.isFile()) {
    const result = analyzeSingleFile(targetPath, repoRoot, severityThreshold);
    const stats = {
      findings: [] as SecurityFinding[],
      scannedCount: 0,
      oversizedCount: 0,
      unreadableCount: 0,
      errors: [] as string[],
    };
    accumulateAnalysisOutcome(result, stats);
    return { ...stats, skippedCount: 0 };
  }
  if (!stat.isDirectory()) {
    return {
      findings: [],
      scannedCount: 0,
      oversizedCount: 0,
      unreadableCount: 0,
      skippedCount: 0,
      errors: [],
    };
  }
  return scanDirectoryTargetPath(
    targetPath,
    repoRoot,
    maxFiles,
    severityThreshold,
  );
}

/**
 * Determine whether a target code scan is incomplete due to skips, errors, or limits.
 */
function isTargetScanIncomplete(stats: {
  oversizedCount: number;
  unreadableCount: number;
  skippedCount: number;
  errors: readonly string[];
}): boolean {
  if (stats.oversizedCount > 0) return true;
  if (stats.unreadableCount > 0) return true;
  if (stats.skippedCount > 0) return true;
  return stats.errors.length > 0;
}

/**
 * Return positive count or undefined for cleaner JSON output.
 */
function positiveCountOrUndefined(count: number): number | undefined {
  return count > 0 ? count : undefined;
}

/**
 * Return non-empty errors array or undefined for cleaner JSON output.
 */
function nonEmptyErrorsOrUndefined(
  errors: readonly string[],
): readonly string[] | undefined {
  return errors.length > 0 ? errors : undefined;
}

/**
 * Resolve target path for code scanning against repository root.
 */
function resolveScanTargetPath(
  optionsPath: string | undefined,
  repoRoot: string,
): string {
  if (optionsPath) {
    return resolveRepoPath(optionsPath, "code analysis path");
  }
  return repoRoot;
}

/**
 * Build structured security scan result from target scan statistics.
 */
function buildTargetScanResult(
  targetResult: ReturnType<typeof scanTargetPath>,
  startTime: number,
): SecurityScanResult {
  const incomplete = isTargetScanIncomplete(targetResult);
  return {
    findings: targetResult.findings,
    scannedFiles: targetResult.scannedCount,
    durationMs: Date.now() - startTime,
    clean: targetResult.findings.length === 0 && !incomplete,
    incomplete: incomplete ? true : undefined,
    skippedFiles: positiveCountOrUndefined(targetResult.skippedCount),
    oversizedFiles: positiveCountOrUndefined(targetResult.oversizedCount),
    unreadableFiles: positiveCountOrUndefined(targetResult.unreadableCount),
    errors: nonEmptyErrorsOrUndefined(targetResult.errors),
  };
}

/**
 * Run static code vulnerability analysis across files, directories, or inline content.
 */
export function analyzeCode(
  options: AnalyzeCodeOptions = {},
): SecurityScanResult {
  const startTime = Date.now();
  if (options.content !== undefined) {
    return analyzeInlineCode(options, startTime);
  }

  const repoRoot = findRepoRoot();
  const targetPath = resolveScanTargetPath(options.path, repoRoot);
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const targetResult = scanTargetPath(
    targetPath,
    repoRoot,
    maxFiles,
    options.severityThreshold,
  );

  return buildTargetScanResult(targetResult, startTime);
}
