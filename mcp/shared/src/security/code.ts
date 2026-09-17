import { lstatSync, readdirSync, readFileSync } from "node:fs";
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
    owasp: "A03:2025-Injection",
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
    owasp: "A03:2025-Injection",
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
    owasp: "A03:2025-Injection",
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
    owasp: "A03:2025-Injection",
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
    owasp: "A03:2025-Injection",
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
    owasp: "A03:2025-Injection",
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
    owasp: "A03:2025-Injection",
    cwe: "CWE-78",
    isoControl: "A.8.28",
    pattern:
      /\b(?:exec|execSync)\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|[a-zA-Z0-9_]+\s*\+\s*[^,\)]+)/g,
    remediation:
      "Use execFile() or spawn() with argument arrays rather than concatenating user input into shell strings.",
    isMatchValid: (_match, lineText) =>
      !lineText.includes("// safe") && !lineText.includes("// test"),
  },
  {
    id: "SQL_INJECTION",
    title: "SQL Injection: Dynamic query string concatenation",
    severity: "critical",
    owasp: "A03:2025-Injection",
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
    owasp: "A10:2025-Server-Side Request Forgery",
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
    owasp: "A04:2025-Insecure Design",
    cwe: "CWE-1333",
    isoControl: "A.8.28",
    pattern:
      /(?:\/|RegExp\s*\(\s*['"`])(?:[^\n/]*\((?:[^\n()]*[\+\*]){1,}[^\n()]*\)(?:[\+\*]|\{\d+,?\d*\}))/g,
    remediation:
      "Refactor regular expressions to eliminate nested repetition operators that cause exponential backtracking.",
    isMatchValid: (match) => {
      const patternText = match[0];
      return /\([^\)]*[\+\*]\)[\+\*]/.test(patternText);
    },
  },
  {
    id: "INSECURE_RANDOM",
    title:
      "Insecure Randomness: Math.random() used in security or cryptographic context",
    severity: "medium",
    owasp: "A02:2025-Cryptographic Failures",
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
    owasp: "A02:2025-Cryptographic Failures",
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
    owasp: "A09:2025-Security Logging and Monitoring Failures",
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
    owasp: "A05:2025-Security Misconfiguration",
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
    owasp: "A05:2025-Security Misconfiguration",
    cwe: "CWE-16",
    isoControl: "A.8.9",
    pattern:
      /(?:origin\s*:\s*['"]\*['"]\s*,\s*credentials\s*:\s*true|credentials\s*:\s*true\s*,\s*origin\s*:\s*['"]\*['"])/g,
    remediation:
      'Do not pair wildcard CORS origin ("*") with credentials: true; specify trusted explicit origins.',
  },
];

function scanContent(
  content: string,
  filePath: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
    const lineText = lines[lineIdx];
    if (!lineText || lineText.trim().length === 0) {
      continue;
    }

    for (const rule of VULNERABILITY_RULES) {
      if (!isSeverityAtOrAbove(rule.severity, severityThreshold)) {
        continue;
      }

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
            snippet:
              snippet.length > 140 ? `${snippet.slice(0, 140)}...` : snippet,
            remediation: rule.remediation,
            owasp: rule.owasp,
            cwe: rule.cwe,
            isoControl: rule.isoControl,
          });
        }
        match = rule.pattern.exec(lineText);
      }
    }
  }

  return findings;
}

function collectCodeFiles(
  startDir: string,
  maxFiles: number,
  collected: string[] = [],
): string[] {
  if (collected.length >= maxFiles) {
    return collected;
  }

  try {
    const entries = readdirSync(startDir, { withFileTypes: true });
    for (const entry of entries) {
      if (collected.length >= maxFiles) {
        break;
      }
      if (entry.isSymbolicLink()) {
        continue;
      }

      const fullPath = join(startDir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) {
          continue;
        }
        collectCodeFiles(fullPath, maxFiles, collected);
      } else if (entry.isFile()) {
        const ext = entry.name.includes(".")
          ? `.${entry.name.split(".").pop()?.toLowerCase()}`
          : "";
        if (CODE_EXTENSIONS.has(ext)) {
          collected.push(fullPath);
        }
      }
    }
  } catch {
    return collected;
  }

  return collected;
}

export function analyzeCode(
  options: AnalyzeCodeOptions = {},
): SecurityScanResult {
  const startTime = Date.now();
  const repoRoot = findRepoRoot();
  const findings: SecurityFinding[] = [];
  let scannedCount = 0;

  if (options.content !== undefined) {
    const logicalPath = options.filePath ?? "inline-code.ts";
    const contentFindings = scanContent(
      options.content,
      logicalPath,
      options.severityThreshold,
    );
    findings.push(...contentFindings);
    return {
      findings,
      scannedFiles: 1,
      durationMs: Date.now() - startTime,
      clean: findings.length === 0,
    };
  }

  const targetPath = options.path
    ? resolveRepoPath(options.path, "code analysis path")
    : repoRoot;

  const stat = lstatSync(targetPath);
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;

  if (stat.isFile()) {
    if (stat.size <= MAX_SCAN_BYTES) {
      try {
        const content = readFileSync(targetPath, "utf8");
        const relativePath = relative(repoRoot, targetPath).replaceAll(
          "\\",
          "/",
        );
        findings.push(
          ...scanContent(content, relativePath, options.severityThreshold),
        );
        scannedCount = 1;
      } catch {
        // Ignored unreadable files
      }
    }
  } else if (stat.isDirectory()) {
    const files = collectCodeFiles(targetPath, maxFiles);
    for (const file of files) {
      try {
        const fileStat = lstatSync(file);
        if (fileStat.size > MAX_SCAN_BYTES) {
          continue;
        }
        const content = readFileSync(file, "utf8");
        const relativePath = relative(repoRoot, file).replaceAll("\\", "/");
        findings.push(
          ...scanContent(content, relativePath, options.severityThreshold),
        );
        scannedCount += 1;
      } catch {
        continue;
      }
    }
  }

  return {
    findings,
    scannedFiles: scannedCount,
    durationMs: Date.now() - startTime,
    clean: findings.length === 0,
  };
}
