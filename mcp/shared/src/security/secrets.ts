import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { findRepoRoot, resolveRepoPath } from "../repo/paths.ts";
import {
  isSeverityAtOrAbove,
  type ScanSecretsOptions,
  type SecurityFinding,
  type SecurityScanResult,
} from "./types.ts";

const MAX_SCAN_BYTES = 256 * 1024; // 256 KiB per file
const DEFAULT_MAX_FILES = 100;

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

const IGNORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".wasm",
  ".zip",
  ".tar",
  ".gz",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".webm",
  ".mp3",
  ".pdf",
  ".lock",
  ".sonir",
]);

const IGNORED_FILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
]);

const PLACEHOLDER_PATTERN =
  /(?:example|placeholder|dummy|fake|mock|fixture|todo|test[-_]token|your[-_]token|sample|change[-_]me|00000000|123456789012|xxxxxx)/i;

/**
 * Calculate the Shannon entropy of a string (in bits per character).
 */
export function calculateShannonEntropy(text: string): number {
  if (!text) {
    return 0;
  }
  const frequencies = new Map<string, number>();
  for (const char of text) {
    frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
  }
  let entropy = 0;
  const textLength = text.length;
  for (const count of frequencies.values()) {
    const probability = count / textLength;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

/**
 * Redact sensitive portion of an identified secret token.
 */
export function redactSecret(secret: string): string {
  if (secret.length <= 8) {
    return "***REDACTED***";
  }
  const prefix = secret.slice(0, 3);
  const suffix = secret.slice(-3);
  return `${prefix}...REDACTED...${suffix}`;
}

interface SecretPattern {
  readonly id: string;
  readonly title: string;
  readonly severity: "critical" | "high" | "medium";
  readonly pattern: RegExp;
  readonly remediation: string;
  readonly owasp?: string;
  readonly cwe?: string;
  readonly isoControl?: string;
  readonly isMatchValid?: (match: string, fullLine: string) => boolean;
}

const SECRET_PATTERNS: readonly SecretPattern[] = [
  {
    id: "SECRET_AWS_ACCESS_KEY",
    title: "AWS Access Key ID exposed",
    severity: "critical",
    owasp: "A07:2025-Identification and Authentication Failures",
    cwe: "CWE-798",
    isoControl: "A.8.12",
    pattern:
      /\b((?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16})\b/g,
    remediation:
      "Remove AWS Access Key ID and load credentials dynamically from environment variables or IAM roles.",
    isMatchValid: (match: string) =>
      match !== "AKIAIOSFODNN7EXAMPLE" && !PLACEHOLDER_PATTERN.test(match),
  },
  {
    id: "SECRET_AWS_SECRET_KEY",
    title: "AWS Secret Access Key exposed",
    severity: "critical",
    owasp: "A07:2025-Identification and Authentication Failures",
    cwe: "CWE-798",
    isoControl: "A.8.12",
    pattern:
      /(?:aws_secret_access_key|aws_access_key_id|aws_session_token)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    remediation:
      "Revoke the AWS secret key immediately and store credentials securely using environment variables or a secret vault.",
    isMatchValid: (match: string) => !PLACEHOLDER_PATTERN.test(match),
  },
  {
    id: "SECRET_CLOUDFLARE_KEY",
    title: "Cloudflare API Token or Key exposed",
    severity: "critical",
    owasp: "A07:2025-Identification and Authentication Failures",
    cwe: "CWE-798",
    isoControl: "A.8.12",
    pattern:
      /(?:cloudflare[_-]?(?:api[_-]?)?(?:token|key))\s*[:=]\s*["']?([a-zA-Z0-9_-]{40})["']?/gi,
    remediation:
      "Rotate the Cloudflare API credential and inject it at runtime via secrets manager or environment variables.",
    isMatchValid: (match: string) => !PLACEHOLDER_PATTERN.test(match),
  },
  {
    id: "SECRET_GITHUB_PAT",
    title: "GitHub Personal Access Token exposed",
    severity: "critical",
    owasp: "A07:2025-Identification and Authentication Failures",
    cwe: "CWE-798",
    isoControl: "A.8.12",
    pattern:
      /\b(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b/g,
    remediation:
      "Revoke the GitHub personal access token on GitHub and migrate to short-lived GitHub App tokens or GitHub Actions secrets.",
    isMatchValid: (match: string) => !PLACEHOLDER_PATTERN.test(match),
  },
  {
    id: "SECRET_OPENAI_API_KEY",
    title: "OpenAI API Key exposed",
    severity: "critical",
    owasp: "A07:2025-Identification and Authentication Failures",
    cwe: "CWE-798",
    isoControl: "A.8.12",
    pattern: /\b(sk-(?:proj-)?[a-zA-Z0-9_-]{32,80})\b/g,
    remediation:
      "Rotate the OpenAI API key via OpenAI platform dashboard and supply it using OPENAI_API_KEY environment variable.",
    isMatchValid: (match: string) => !PLACEHOLDER_PATTERN.test(match),
  },
  {
    id: "SECRET_SLACK_TOKEN",
    title: "Slack API Token exposed",
    severity: "critical",
    owasp: "A07:2025-Identification and Authentication Failures",
    cwe: "CWE-798",
    isoControl: "A.8.12",
    pattern: /\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*)\b/g,
    remediation:
      "Revoke the exposed Slack token in the Slack API app dashboard and provide it via runtime secrets.",
    isMatchValid: (match: string) => !PLACEHOLDER_PATTERN.test(match),
  },
  {
    id: "SECRET_PRIVATE_KEY",
    title: "Private Encryption Key exposed",
    severity: "critical",
    owasp: "A02:2025-Cryptographic Failures",
    cwe: "CWE-798",
    isoControl: "A.8.12",
    pattern: /-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----/g,
    remediation:
      "Immediately revoke and reissue the private key certificate. Never check private key material into source repositories.",
    isMatchValid: (_match: string, fullLine: string) =>
      !fullLine.includes("dummy") && !fullLine.includes("fixture"),
  },
  {
    id: "SECRET_JWT_TOKEN",
    title: "Signed JSON Web Token (JWT) exposed",
    severity: "high",
    owasp: "A07:2025-Identification and Authentication Failures",
    cwe: "CWE-798",
    isoControl: "A.8.12",
    pattern:
      /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_.-]{10,})\b/g,
    remediation:
      "Ensure authentication JWTs are generated dynamically per session and not hardcoded in source files.",
    isMatchValid: (match: string) => !PLACEHOLDER_PATTERN.test(match),
  },
  {
    id: "SECRET_HIGH_ENTROPY",
    title: "High-entropy secret assignment detected",
    severity: "high",
    owasp: "A07:2025-Identification and Authentication Failures",
    cwe: "CWE-798",
    isoControl: "A.8.12",
    pattern:
      /(?:api[_-]?key|secret|password|access[_-]?token|auth[_-]?token|client[_-]?secret)\s*[:=]\s*["']([^"'\s]{16,})["']/gi,
    remediation:
      "Store credentials in environment variables or configuration vaults rather than hardcoding string assignments in source.",
    isMatchValid: (match: string, fullLine: string) => {
      if (
        PLACEHOLDER_PATTERN.test(match) ||
        PLACEHOLDER_PATTERN.test(fullLine)
      ) {
        return false;
      }
      return calculateShannonEntropy(match) >= 3.4;
    },
  },
];

/**
 * Match a specific secret rule against a line of text.
 */
function matchSecretRule(
  rule: SecretPattern,
  lineText: string,
  lineIdx: number,
  filePath: string,
  findings: SecurityFinding[],
): void {
  rule.pattern.lastIndex = 0;
  let match: RegExpExecArray | null = rule.pattern.exec(lineText);
  while (match !== null) {
    const rawSecret = match[1] ?? match[0];
    const isValid = rule.isMatchValid
      ? rule.isMatchValid(rawSecret, lineText)
      : true;

    if (isValid) {
      const redacted = redactSecret(rawSecret);
      const snippet = lineText.replace(rawSecret, redacted).trim();
      findings.push({
        id: rule.id,
        category: "secret",
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

/**
 * Scan text lines against known secret patterns and collect findings.
 */
function scanTextLines(
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

    for (const rule of SECRET_PATTERNS) {
      if (isSeverityAtOrAbove(rule.severity, severityThreshold)) {
        matchSecretRule(rule, lineText, lineIdx, filePath, findings);
      }
    }
  }

  return findings;
}

/**
 * Check if a file name has an extension that should be scanned for secrets.
 */
function isScannableFile(name: string): boolean {
  if (IGNORED_FILES.has(name)) return false;
  const ext = name.includes(".")
    ? `.${name.split(".").pop()?.toLowerCase()}`
    : "";
  return !IGNORED_EXTENSIONS.has(ext);
}

/**
 * Collect scannable files below a directory recursively up to maxFiles.
 */
function collectFiles(
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
      if (collected.length >= maxFiles) break;
      if (entry.isSymbolicLink()) continue;

      const fullPath = join(startDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          collectFiles(fullPath, maxFiles, collected);
        }
      } else if (entry.isFile() && isScannableFile(entry.name)) {
        collected.push(fullPath);
      }
    }
  } catch {
    return collected;
  }

  return collected;
}

/**
 * Scan a single file on disk if within size limits.
 */
function scanSingleFile(
  filePath: string,
  repoRoot: string,
  severityThreshold?: SecurityFinding["severity"],
): SecurityFinding[] {
  try {
    const stat = lstatSync(filePath);
    if (stat.size > MAX_SCAN_BYTES) return [];
    const content = readFileSync(filePath, "utf8");
    const relativePath = relative(repoRoot, filePath).replaceAll("\\", "/");
    return scanTextLines(content, relativePath, severityThreshold);
  } catch {
    return [];
  }
}

/**
 * Scan workspace files or git diffs for hardcoded secrets, credentials, API keys, and private keys.
 */
export function scanSecrets(
  options: ScanSecretsOptions = {},
): SecurityScanResult {
  const startTime = Date.now();
  const repoRoot = findRepoRoot();
  const findings: SecurityFinding[] = [];

  if (options.content !== undefined) {
    const logicalPath = options.filePath ?? "inline-content";
    const contentFindings = scanTextLines(
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
    ? resolveRepoPath(options.path, "secret scan path")
    : repoRoot;

  const stat = lstatSync(targetPath);
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  let scannedCount = 0;

  if (stat.isFile()) {
    const fileFindings = scanSingleFile(
      targetPath,
      repoRoot,
      options.severityThreshold,
    );
    findings.push(...fileFindings);
    scannedCount = 1;
  } else if (stat.isDirectory()) {
    const files = collectFiles(targetPath, maxFiles);
    for (const file of files) {
      const fileFindings = scanSingleFile(
        file,
        repoRoot,
        options.severityThreshold,
      );
      findings.push(...fileFindings);
      scannedCount += 1;
    }
  }

  return {
    findings,
    scannedFiles: scannedCount,
    durationMs: Date.now() - startTime,
    clean: findings.length === 0,
  };
}
