/**
 * Tool definitions exposed to MCP clients using `@modelcontextprotocol/sdk`.
 * Tools are grouped by the Mission Platform workflows this server assists with:
 * component usage, workspace creation/development, FWS security, and discovery.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import {
  analyzeForgeWebScript,
  deserializeForgeWebScriptSoN,
  prepareForgeWebScriptFrontend,
  type ForgeWebScriptAnalysisOptions,
} from '@mission-platform/forge-web-script';
import {
  runForgeWebScriptSelfHostedLexStage,
  type ForgeWebScriptSelfHostedRunOptions,
} from '@mission-platform/forge-web-script-runtime';
import {
  verifyForgeWebScriptWasmArtifact,
  type ForgeWebScriptWasmArtifactManifest,
  type ForgeWebScriptWasmArtifactMetadata,
} from '@mission-platform/forge-web-script-wasm';
import { getGuide, GUIDE_IDS } from '@mission-platform/mcp-shared/knowledge/guides';
import {
  appFiles,
  componentFiles,
  composableFiles,
  crateFiles,
  normalizeComposableName,
  packageFiles,
  storeFiles,
  utilFiles,
  workerFiles,
  type ScaffoldAtomicLevel,
} from '@mission-platform/mcp-shared/knowledge/templates';
import { getComponentUsage, listComponents } from '@mission-platform/mcp-shared/repo/components';
import {
  addLocale,
  localeCoverage,
  removeLocale,
  resolveMemberLocales,
  surveyLocales,
  updateTranslation,
} from '@mission-platform/mcp-shared/repo/locales';
import { findRepoRoot, resolveRepoPath, type WorkspaceGroup } from '@mission-platform/mcp-shared/repo/paths';
import {
  findMember,
  listDocs,
  listGroup,
  readDoc as readDocument,
  readMemberDetails,
} from '@mission-platform/mcp-shared/repo/scanner';
import { readTokens } from '@mission-platform/mcp-shared/repo/tokens';
import {
  analyzeCode,
  auditDependencies,
  auditSupplyChain,
  collectComplianceEvidence,
  formatComplianceMarkdown,
  scanSecrets,
  type ComplianceEvidenceReport,
  type SecurityFinding,
  type SecurityFindingSeverity,
} from '@mission-platform/mcp-shared/security';
import { z } from 'zod';

import { accessibilityAuditInputSchema, runAccessibilityAudit } from '../accessibility/audit.ts';
import { COMMIT_TYPES, applyCommitPlan, createCommitPlan, type CommitPlan } from '../git/commit.ts';
import {
  readGitBlame,
  readGitBranches,
  readGitChangedFiles,
  readGitDiff,
  readGitGrep,
  readGitLog,
  readGitLsFiles,
  readGitRemotes,
  readGitShow,
  readGitStatus,
  readGitTags,
} from '../git/index.ts';
import { getLspCapabilityReport } from '../lsp/capabilities.ts';
import { addLspConfigurationServer, editLspConfigurationServer, readLspConfiguration } from '../lsp/configuration.ts';
import {
  applyLspEdit,
  executeLspCommand,
  formatLspDocument,
  formatLspRange,
  previewLspEdit,
  renameLspSymbol,
  replaceLspSymbolBody,
  safeDeleteLspSymbol,
  simulateLspChain,
  suggestLspFixes,
} from '../lsp/edits.ts';
import {
  findLspSymbol,
  getLspDocumentHighlights,
  getLspSymbolDocumentation,
  getLspSymbolSource,
  goToLspDefinition,
  inspectLspSymbol,
  listLspSymbols,
} from '../lsp/navigation.ts';
import {
  addLspWorkspaceFolder,
  detectLspServers,
  getLspDiagnostics,
  getLspEditingContext,
  getLspServerCapabilities,
  getLspStatus,
  listLspWorkspaceFolders,
  openLspDocument,
  restartLspSession,
  shutdownLspSessions,
  startLspSession,
} from '../lsp/registry.ts';
import {
  findLspCallers,
  findLspImplementations,
  findLspReferences,
  getLspCrossRepoReferences,
  getLspTypeHierarchy,
} from '../lsp/relationships.ts';
import { getLspDebugContext, reviewChanges, reviewLspStructure } from '../lsp/reviews.ts';
import { getLspTestsForFile, runLspBuild, runLspTests } from '../lsp/workflows.ts';
import { validateName, writeIntoPackage, writeScaffold } from '../scaffold/writer.ts';
import {
  getAffectedPackages,
  listStories,
  primeUpstreamDependencies,
  runTestFile,
  runTurboTask,
} from '../workspace/tasks.ts';

import {
  dispatchGitMetadata,
  dispatchI18n,
  dispatchScaffold,
  gitMetadataInputSchema,
  i18nInputSchema,
  scaffoldInputSchema,
} from './polymorphic.ts';
import { resolveToolFilter, type McpProfileOptions } from './profiles.ts';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

function text(value: string) {
  return { content: [{ type: 'text' as const, text: value }] };
}

function json(value: unknown) {
  return text(JSON.stringify(value, null, 2));
}

function toolError(error: unknown) {
  return {
    content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
    isError: true,
  };
}

/** Resolve a package below `packages/` (accepts a folder or `@mission-platform/<name>`). */
function resolvePackageTarget(packageName: string): { packageDir: string; relativePackageDir: string; folder: string } {
  const folder = packageName.replace(/^@mission-platform\//, '').trim();
  if (!folder) {
    throw new Error('Provide a package folder name (e.g. "components").');
  }
  const nameError = validateName(folder);
  if (nameError) {
    throw new Error(nameError);
  }
  const member = findMember('packages', packageName);
  if (!member) {
    const relativePackageDir = `packages/${folder}`;
    throw new Error(`Package "${relativePackageDir}" does not exist.`);
  }
  return {
    packageDir: resolveRepoPath(member.dir, member.relativeDir),
    relativePackageDir: member.relativeDir,
    folder,
  };
}

function normalizeUnitName(raw: string): string {
  return raw
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/[\s_]+/g, '-')
    .toLowerCase();
}

const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_MANIFEST_BYTES = 1 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 16 * 1024 * 1024;
const MAX_WORKSPACE_FILES = 100;

const analysisLimitsSchema = z
  .object({
    maxFindings: z.number().int().min(1).max(10_000).optional(),
    maxCallDepth: z.number().int().min(1).max(10_000).optional(),
    maxLoopIterations: z.number().int().min(1).max(10_000_000).optional(),
    maxAllocationBytes: z.number().int().min(1).max(1_073_741_824).optional(),
    maxAsyncTasks: z.number().int().min(1).max(100_000).optional(),
    maxRegexInputLength: z.number().int().min(1).max(10_000_000).optional(),
  })
  .optional();

const analysisPolicySchema = z
  .object({
    profile: z.enum(['development', 'strict']).optional(),
    allowedCapabilities: z.array(z.string().trim().min(1).max(128)).max(128).optional(),
    boundsChecks: z.enum(['runtime', 'proven-safe', 'excluded-by-profile']).optional(),
    limits: analysisLimitsSchema,
  })
  .optional();

const targetFeaturesSchema = z
  .object({
    simd: z.boolean().optional(),
    tailCall: z.boolean().optional(),
    memory64: z.boolean().optional(),
    threads: z.boolean().optional(),
    atomics: z.boolean().optional(),
  })
  .optional();

const lspSessionSchema = {
  sessionId: z.string().max(128).optional(),
  languageId: z.string().max(128).optional(),
};
const lspPositionSchema = {
  filePath: z.string().min(1).max(4096),
  line: z.number().int().min(0).max(1_000_000),
  character: z.number().int().min(0).max(1_000_000),
  ...lspSessionSchema,
};
const lspLimitSchema = z.number().int().min(1).max(500).optional();
const lspPositionValueSchema = z.object({
  line: z.number().int().min(0).max(1_000_000),
  character: z.number().int().min(0).max(1_000_000),
});
const lspRangeValueSchema = z.object({ start: lspPositionValueSchema, end: lspPositionValueSchema });
const lspTextEditSchema = z.object({ range: lspRangeValueSchema, newText: z.string().max(4 * 1024 * 1024) });
const lspDiagnosticSchema = z.object({
  range: lspRangeValueSchema,
  message: z.string(),
  severity: z.number().optional(),
  code: z.union([z.number(), z.string()]).optional(),
  source: z.string().optional(),
});
const lspWorkspaceEditSchema = z
  .object({
    changes: z.record(z.string().max(4096), z.array(lspTextEditSchema).max(10_000)).optional(),
    documentChanges: z.array(z.unknown()).max(10_000).optional(),
  })
  .passthrough();
const lspEditInputSchema = {
  ...lspSessionSchema,
  filePath: z.string().min(1).max(4096).optional(),
  edits: z.array(lspTextEditSchema).max(10_000).optional(),
  workspaceEdit: lspWorkspaceEditSchema.optional(),
  expectedVersions: z.record(z.string().max(4096), z.number().int().min(0)).optional(),
  apply: z.boolean().optional(),
};
const lspWorkflowSchema = {
  ...lspSessionSchema,
  packageName: z.string().trim().min(1).max(256).optional(),
  command: z
    .never()
    .optional()
    .describe('Arbitrary command strings are rejected; scripts come from repository conventions.'),
  timeoutMs: z.number().int().min(10).max(120_000).optional(),
  maxOutputBytes: z.number().int().min(1).max(1_048_576).optional(),
};
const lspConfigServerSchema = {
  languageId: z.string().trim().min(1).max(128),
  extensions: z.array(z.string().trim().min(1).max(32)).min(1).max(128),
  command: z.array(z.string().min(1).max(4096)).min(1).max(128),
};
const gitReadSchema = {
  timeoutMs: z.number().int().min(10).max(120_000).optional(),
  maxOutputBytes: z.number().int().min(1).max(1_048_576).optional(),
};
const reviewLimitSchema = z.number().int().min(1).max(500).optional();
const commitPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(4096)
  .refine((path) => !path.includes('\0'), 'Commit paths must not contain NUL characters.');
const commitModeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('staged-only') }),
  z.object({ kind: z.literal('paths'), paths: z.array(commitPathSchema).min(1).max(256) }),
]);
const commitPlanSchema = {
  type: z.enum(COMMIT_TYPES),
  scope: z.string().max(128).optional(),
  description: z.string().min(1).max(1024),
  body: z
    .string()
    .max(256 * 1024)
    .optional(),
  footers: z.array(z.string().min(1).max(1024)).max(32).optional(),
  mode: commitModeSchema,
  ...gitReadSchema,
};

function repoPath(path: string, label: string): string {
  return resolveRepoPath(path, label);
}

function readBoundedBytes(path: string, limit: number, label: string): Uint8Array {
  const size = statSync(path).size;
  if (size > limit) throw new Error(`${label} exceeds the ${limit} byte safety limit.`);
  return new Uint8Array(readFileSync(path));
}

function readBoundedText(path: string, limit: number, label: string): string {
  return new TextDecoder().decode(readBoundedBytes(path, limit, label));
}

function collectFwsFiles(target: string, maxFiles: number): string[] {
  const files: string[] = [];
  const visit = (directory: string, depth: number): void => {
    if (depth > 32 || files.length >= maxFiles) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.fws')) {
        files.push(path);
        if (files.length >= maxFiles) return;
      }
    }
  };
  if (statSync(target).isFile()) {
    if (!target.endsWith('.fws')) throw new Error('sourcePath must point to a .fws file or directory.');
    return [target];
  }
  visit(target, 0);
  return files.toSorted();
}

function fwsAnalysisOptions(
  policy: z.infer<typeof analysisPolicySchema>,
  targetFeatures: z.infer<typeof targetFeaturesSchema>,
): ForgeWebScriptAnalysisOptions {
  const normalizedPolicy: ForgeWebScriptAnalysisOptions['policy'] =
    policy === undefined
      ? undefined
      : {
          ...(policy.profile === undefined ? {} : { profile: policy.profile }),
          ...(policy.allowedCapabilities === undefined ? {} : { allowedCapabilities: policy.allowedCapabilities }),
          ...(policy.boundsChecks === undefined ? {} : { boundsChecks: policy.boundsChecks }),
          ...(policy.limits === undefined
            ? {}
            : {
                limits: {
                  ...(policy.limits.maxFindings === undefined ? {} : { maxFindings: policy.limits.maxFindings }),
                  ...(policy.limits.maxCallDepth === undefined ? {} : { maxCallDepth: policy.limits.maxCallDepth }),
                  ...(policy.limits.maxLoopIterations === undefined
                    ? {}
                    : { maxLoopIterations: policy.limits.maxLoopIterations }),
                  ...(policy.limits.maxAllocationBytes === undefined
                    ? {}
                    : { maxAllocationBytes: policy.limits.maxAllocationBytes }),
                  ...(policy.limits.maxAsyncTasks === undefined ? {} : { maxAsyncTasks: policy.limits.maxAsyncTasks }),
                  ...(policy.limits.maxRegexInputLength === undefined
                    ? {}
                    : { maxRegexInputLength: policy.limits.maxRegexInputLength }),
                },
              }),
        };
  const normalizedTargetFeatures: ForgeWebScriptAnalysisOptions['targetFeatures'] =
    targetFeatures === undefined
      ? undefined
      : {
          ...(targetFeatures.simd === undefined ? {} : { simd: targetFeatures.simd }),
          ...(targetFeatures.tailCall === undefined ? {} : { tailCall: targetFeatures.tailCall }),
          ...(targetFeatures.memory64 === undefined ? {} : { memory64: targetFeatures.memory64 }),
          ...(targetFeatures.threads === undefined ? {} : { threads: targetFeatures.threads }),
          ...(targetFeatures.atomics === undefined ? {} : { atomics: targetFeatures.atomics }),
        };
  return {
    ...(normalizedPolicy === undefined ? {} : { policy: normalizedPolicy }),
    ...(normalizedTargetFeatures === undefined ? {} : { targetFeatures: normalizedTargetFeatures }),
  };
}

function analyzeSource(source: string, fileName: string, options: ForgeWebScriptAnalysisOptions) {
  const frontend = prepareForgeWebScriptFrontend({
    source,
    fileName,
    compilerVersion: 'mcp-analysis',
    requestedCapabilities: options.policy?.allowedCapabilities,
    boundsChecks: options.policy?.boundsChecks,
    analysis: options,
  });
  const analysis = analyzeForgeWebScript(frontend, options);
  return { fileName, diagnostics: frontend.diagnostics, analysis };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readManifest(path: string): ForgeWebScriptWasmArtifactManifest {
  let value: unknown;
  try {
    value = JSON.parse(readBoundedText(path, MAX_MANIFEST_BYTES, 'Manifest'));
  } catch (error) {
    throw new Error(`Manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (
    !record(value) ||
    !Array.isArray(value.exports) ||
    !Array.isArray(value.imports) ||
    !Array.isArray(value.requiredCapabilities) ||
    !record(value.memory)
  )
    throw new Error('Manifest must contain exports, imports, requiredCapabilities, and memory arrays/objects.');
  return value as unknown as ForgeWebScriptWasmArtifactManifest;
}

function artifactMetadata(
  metadata: z.infer<typeof artifactMetadataSchema> | undefined,
  manifest: ForgeWebScriptWasmArtifactManifest,
): ForgeWebScriptWasmArtifactMetadata {
  return {
    compilerVersion: metadata?.compilerVersion ?? 'mcp-verification',
    optimization: metadata?.optimization ?? 'debug',
    sourceFiles: metadata?.sourceFiles ?? [],
    ...(metadata?.sourceHash === undefined ? {} : { sourceHash: metadata.sourceHash }),
    ...(metadata?.graphHash === undefined ? { graphHash: manifest.graphHash } : { graphHash: metadata.graphHash }),
    ...(metadata?.targetFeatures === undefined ? {} : { targetFeatures: metadata.targetFeatures }),
  };
}

const artifactMetadataSchema = z
  .object({
    compilerVersion: z.string().max(256).optional(),
    optimization: z.enum(['debug', 'release']).optional(),
    sourceFiles: z.array(z.string().max(1024)).max(MAX_WORKSPACE_FILES).optional(),
    sourceHash: z.string().max(128).optional(),
    graphHash: z.string().max(128).optional(),
    targetFeatures: targetFeaturesSchema,
  })
  .optional();

export type { McpProfileOptions } from './profiles.ts';

/**
 * Format standard-specific slice of a compliance evidence report.
 */
function formatComplianceStandardReport(report: ComplianceEvidenceReport, standard: string) {
  switch (standard) {
    case 'iso-27001': {
      return {
        metadata: report.metadata,
        scorecard: {
          complianceScore: report.scorecard.iso27001ComplianceScore,
          totalControls: report.scorecard.totalControlsEvaluated,
          compliantControls: report.scorecard.compliantControlsCount,
          nonCompliantControls: report.scorecard.nonCompliantControlsCount,
        },
        controls: report.isoControls,
      };
    }
    case 'owasp-2025': {
      return {
        metadata: report.metadata,
        scorecard: report.owaspScorecard,
        findings: report.findings.filter((f: SecurityFinding) => Boolean(f.owasp)),
      };
    }
    case 'cwe-top25': {
      return {
        metadata: report.metadata,
        scorecard: report.cweScorecard,
        findings: report.findings.filter((f: SecurityFinding) => Boolean(f.cwe)),
      };
    }
    default: {
      return report;
    }
  }
}

/**
 * Register all developer tools on the MCP server, applying optional profile-based filtering.
 */
export function registerTools(server: McpServer, options: McpProfileOptions = {}): void {
  const toolFilter = resolveToolFilter(options);
  const originalRegisterTool = server.registerTool.bind(server);

  // Filter tool registration based on active profile or explicit tool allowlist
  server.registerTool = ((name: string, ...rest: unknown[]) => {
    if (toolFilter && !toolFilter.has(name)) {
      return;
    }
    Reflect.apply(originalRegisterTool, server, [name, ...rest]);
  }) as typeof server.registerTool;

  const commitPlans = new Map<string, { readonly plan: CommitPlan; readonly createdAt: number }>();
  const commitPlanTtlMs = 30 * 60 * 1000;
  const maxCommitPlans = 128;

  const pruneCommitPlans = (now: number): void => {
    for (const [planId, record] of commitPlans) {
      if (now - record.createdAt >= commitPlanTtlMs) commitPlans.delete(planId);
    }
    while (commitPlans.size >= maxCommitPlans) {
      const oldest = commitPlans.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      commitPlans.delete(oldest);
    }
  };

  // ---- LSP migration contract ----------------------------------------------
  server.registerTool(
    'lsp_capabilities',
    {
      description:
        'Return the versioned developer-MCP LSP capability contract, including canonical names and workspace mutation behavior.',
      inputSchema: {},
    },
    async () => json(getLspCapabilityReport()),
  );
  server.registerTool(
    'lsp_config_view',
    {
      description: 'View the validated root-bounded agent-lsp.json configuration without starting language servers.',
      inputSchema: {},
    },
    async () => {
      try {
        return json(readLspConfiguration());
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_config_add',
    {
      description: 'Preview or apply adding one language-server definition to agent-lsp.json; preview is the default.',
      inputSchema: {
        ...lspConfigServerSchema,
        apply: z.boolean().optional().describe('Write the configuration only when true.'),
      },
    },
    async (args) => {
      try {
        return json(
          addLspConfigurationServer(
            { languageId: args.languageId, extensions: args.extensions, command: args.command },
            args.apply,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_config_edit',
    {
      description: 'Preview or apply editing one language-server definition in agent-lsp.json; preview is the default.',
      inputSchema: {
        languageId: z.string().trim().min(1).max(128),
        newLanguageId: z.string().trim().min(1).max(128).optional(),
        extensions: z.array(z.string().trim().min(1).max(32)).min(1).max(128).optional(),
        command: z.array(z.string().min(1).max(4096)).min(1).max(128).optional(),
        apply: z.boolean().optional().describe('Write the configuration only when true.'),
      },
    },
    async (args) => {
      try {
        return json(
          editLspConfigurationServer(
            args.languageId,
            { languageId: args.newLanguageId, extensions: args.extensions, command: args.command },
            args.apply,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_detect_servers',
    {
      description:
        'Inspect the root-bounded LSP configuration and report server availability without starting a language server.',
      inputSchema: {},
    },
    async () => {
      try {
        return json(detectLspServers());
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_status',
    {
      description: 'Report the developer-MCP LSP lifecycle state and active configured language-server sessions.',
      inputSchema: {},
    },
    async () => json(getLspStatus()),
  );
  server.registerTool(
    'lsp_start',
    {
      description:
        'Start one configured language server in a root-bounded process without invoking a shell. The languageId is required when multiple servers are configured.',
      inputSchema: {
        languageId: z
          .string()
          .max(128)
          .optional()
          .describe('Configured language identifier, such as "typescript" or "yaml".'),
      },
    },
    async (args) => {
      try {
        return json(startLspSession(args.languageId));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_shutdown',
    {
      description: 'Stop active developer-MCP LSP sessions by sessionId, languageId, or explicit all=true.',
      inputSchema: {
        sessionId: z.string().max(128).optional(),
        languageId: z.string().max(128).optional(),
        all: z.boolean().optional().describe('Stop every active session when true.'),
      },
    },
    async (args) => {
      try {
        return json(shutdownLspSessions(args.sessionId, args.languageId, args.all));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_restart',
    {
      description:
        'Restart a configured language server by sessionId or languageId, stopping the selected session before starting its replacement.',
      inputSchema: {
        sessionId: z.string().max(128).optional(),
        languageId: z.string().max(128).optional(),
      },
    },
    async (args) => {
      try {
        return json(restartLspSession(args.sessionId, args.languageId));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_open_document',
    {
      description:
        'Open or update a root-bounded document in an active language-server session. This sends only standard text-document notifications.',
      inputSchema: {
        filePath: z.string().min(1).max(4096),
        sessionId: z.string().max(128).optional(),
        languageId: z.string().max(128).optional(),
        documentLanguageId: z.string().max(128).optional(),
      },
    },
    async (args) => {
      try {
        return json(await openLspDocument(args.filePath, args.sessionId, args.languageId, args.documentLanguageId));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_get_diagnostics',
    {
      description:
        'Open or update a root-bounded document and return diagnostics published by its active language-server session.',
      inputSchema: {
        filePath: z.string().min(1).max(4096),
        sessionId: z.string().max(128).optional(),
        languageId: z.string().max(128).optional(),
        documentLanguageId: z.string().max(128).optional(),
      },
    },
    async (args) => {
      try {
        return json(await getLspDiagnostics(args.filePath, args.sessionId, args.languageId, args.documentLanguageId));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_list_workspace_folders',
    {
      description: 'List the root-bounded workspace folders known by an initialized language-server session.',
      inputSchema: {
        sessionId: z.string().max(128).optional(),
        languageId: z.string().max(128).optional(),
      },
    },
    async (args) => {
      try {
        return json(await listLspWorkspaceFolders(args.sessionId, args.languageId));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_add_workspace_folder',
    {
      description:
        'Add a root-bounded directory to an initialized language-server session when supported by the server.',
      inputSchema: {
        folderPath: z.string().min(1).max(4096),
        sessionId: z.string().max(128).optional(),
        languageId: z.string().max(128).optional(),
      },
    },
    async (args) => {
      try {
        return json(await addLspWorkspaceFolder(args.folderPath, args.sessionId, args.languageId));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_get_server_capabilities',
    {
      description: 'Return initialized server capabilities for the selected language-server session.',
      inputSchema: {
        sessionId: z.string().max(128).optional(),
        languageId: z.string().max(128).optional(),
      },
    },
    async (args) => {
      try {
        return json(await getLspServerCapabilities(args.sessionId, args.languageId));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_get_editing_context',
    {
      description: 'Return the selected session, workspace folders, server capabilities, and open-document context.',
      inputSchema: {
        sessionId: z.string().max(128).optional(),
        languageId: z.string().max(128).optional(),
      },
    },
    async (args) => {
      try {
        return json(await getLspEditingContext(args.sessionId, args.languageId));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_list_symbols',
    {
      description: 'List normalized document symbols for a root-bounded file, capped by limit.',
      inputSchema: { filePath: z.string().min(1).max(4096), ...lspSessionSchema, limit: lspLimitSchema },
    },
    async (args) => {
      try {
        return json(await listLspSymbols(args.filePath, args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_find_symbol',
    {
      description: 'Find normalized symbols by workspace query, capped by limit.',
      inputSchema: { query: z.string().max(1024), ...lspSessionSchema, limit: lspLimitSchema },
    },
    async (args) => {
      try {
        return json(await findLspSymbol(args.query, args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_inspect_symbol',
    {
      description: 'Inspect the symbol at a root-bounded document position using normalized hover information.',
      inputSchema: lspPositionSchema,
    },
    async (args) => {
      try {
        return json(await inspectLspSymbol(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_go_to_definition',
    {
      description: 'Resolve definitions at a document position into normalized, root-bounded locations.',
      inputSchema: { ...lspPositionSchema, limit: lspLimitSchema },
    },
    async (args) => {
      try {
        return json(await goToLspDefinition(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_get_symbol_documentation',
    {
      description: 'Return hover-derived documentation for the symbol at a document position.',
      inputSchema: lspPositionSchema,
    },
    async (args) => {
      try {
        return json(await getLspSymbolDocumentation(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_get_symbol_source',
    {
      description: 'Return source/code blocks supplied by hover for the symbol at a document position.',
      inputSchema: lspPositionSchema,
    },
    async (args) => {
      try {
        return json(await getLspSymbolSource(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_get_document_highlights',
    {
      description: 'Return normalized document highlights at a root-bounded document position.',
      inputSchema: { ...lspPositionSchema, limit: lspLimitSchema },
    },
    async (args) => {
      try {
        return json(await getLspDocumentHighlights(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_find_references',
    {
      description: 'Find normalized references at a document position with an explicit result cap.',
      inputSchema: {
        ...lspPositionSchema,
        includeDeclaration: z.boolean().optional(),
        limit: lspLimitSchema,
      },
    },
    async (args) => {
      try {
        return json(await findLspReferences(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_find_callers',
    {
      description: 'Return bounded incoming, outgoing, or combined call hierarchy relationships.',
      inputSchema: {
        ...lspPositionSchema,
        direction: z.enum(['incoming', 'outgoing', 'both']).optional(),
        limit: lspLimitSchema,
      },
    },
    async (args) => {
      try {
        return json(await findLspCallers(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_find_implementations',
    {
      description: 'Find bounded normalized implementations at a document position.',
      inputSchema: { ...lspPositionSchema, limit: lspLimitSchema },
    },
    async (args) => {
      try {
        return json(await findLspImplementations(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_type_hierarchy',
    {
      description: 'Return bounded normalized supertypes and/or subtypes for a document position.',
      inputSchema: {
        ...lspPositionSchema,
        direction: z.enum(['supertypes', 'subtypes', 'both']).optional(),
        limit: lspLimitSchema,
      },
    },
    async (args) => {
      try {
        return json(await getLspTypeHierarchy(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_get_cross_repo_references',
    {
      description: 'Aggregate bounded references across the selected session workspace folders.',
      inputSchema: {
        ...lspPositionSchema,
        includeDeclaration: z.boolean().optional(),
        limit: lspLimitSchema,
      },
    },
    async (args) => {
      try {
        return json(await getLspCrossRepoReferences(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'lsp_preview_edit',
    {
      description: 'Validate a root-bounded text or WorkspaceEdit and return a no-write preview.',
      inputSchema: lspEditInputSchema,
    },
    async (args) => {
      try {
        return json(await previewLspEdit(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_simulate_chain',
    {
      description: 'Validate a bounded chain of edits in memory without writing files.',
      inputSchema: {
        ...lspSessionSchema,
        steps: z
          .array(
            z.object({
              filePath: z.string().min(1).max(4096).optional(),
              edits: z.array(lspTextEditSchema).max(10_000).optional(),
              workspaceEdit: lspWorkspaceEditSchema.optional(),
              expectedVersions: z.record(z.string().max(4096), z.number().int().min(0)).optional(),
            }),
          )
          .min(1)
          .max(500),
      },
    },
    async (args) => {
      try {
        return json(await simulateLspChain(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_apply_edit',
    {
      description: 'Validate an edit and write it only when apply=true; otherwise return a preview.',
      inputSchema: lspEditInputSchema,
    },
    async (args) => {
      try {
        return json(await applyLspEdit(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_replace_symbol_body',
    {
      description: 'Preview or explicitly apply replacement text for a validated symbol range.',
      inputSchema: {
        ...lspSessionSchema,
        filePath: z.string().min(1).max(4096),
        symbolRange: lspRangeValueSchema,
        newText: z.string().max(4 * 1024 * 1024),
        expectedVersions: z.record(z.string().max(4096), z.number().int().min(0)).optional(),
        apply: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(await replaceLspSymbolBody(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_safe_delete_symbol',
    {
      description: 'Preview or explicitly apply deletion of a validated symbol range.',
      inputSchema: {
        ...lspSessionSchema,
        filePath: z.string().min(1).max(4096),
        symbolRange: lspRangeValueSchema,
        expectedVersions: z.record(z.string().max(4096), z.number().int().min(0)).optional(),
        apply: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(await safeDeleteLspSymbol(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_rename',
    {
      description: 'Request a server rename and preview its WorkspaceEdit unless apply=true.',
      inputSchema: {
        ...lspPositionSchema,
        newName: z.string().min(1).max(256),
        expectedVersions: z.record(z.string().max(4096), z.number().int().min(0)).optional(),
        apply: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(await renameLspSymbol(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_suggest_fixes',
    {
      description: 'List code actions and preview or explicitly apply one selected action.',
      inputSchema: {
        ...lspPositionSchema,
        start: lspPositionValueSchema,
        end: lspPositionValueSchema,
        diagnostics: z.array(lspDiagnosticSchema).max(500).optional(),
        actionIndex: z.number().int().min(0).max(499).optional(),
        apply: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(await suggestLspFixes(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_format_document',
    {
      description: 'Request document formatting and preview edits unless apply=true.',
      inputSchema: {
        ...lspSessionSchema,
        filePath: z.string().min(1).max(4096),
        expectedVersions: z.record(z.string().max(4096), z.number().int().min(0)).optional(),
        apply: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(await formatLspDocument(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_format_range',
    {
      description: 'Request range formatting and preview edits unless apply=true.',
      inputSchema: {
        ...lspSessionSchema,
        filePath: z.string().min(1).max(4096),
        start: lspPositionValueSchema,
        end: lspPositionValueSchema,
        expectedVersions: z.record(z.string().max(4096), z.number().int().min(0)).optional(),
        apply: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(await formatLspRange(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_execute_command',
    {
      description: 'Preview a server command or execute it only with apply=true.',
      inputSchema: {
        ...lspSessionSchema,
        command: z.string().min(1).max(1024),
        arguments: z.array(z.unknown()).max(1000).optional(),
        apply: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(await executeLspCommand(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_get_tests_for_file',
    {
      description: 'Find bounded repository test files related to a source file.',
      inputSchema: {
        ...lspWorkflowSchema,
        filePath: z.string().min(1).max(4096),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        return json(await getLspTestsForFile(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_run_build',
    {
      description: 'Run the repository or selected package build script with bounded output and time.',
      inputSchema: lspWorkflowSchema,
    },
    async (args) => {
      try {
        return json(await runLspBuild(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_run_tests',
    {
      description: 'Run the repository or selected package test script with bounded output and time.',
      inputSchema: lspWorkflowSchema,
    },
    async (args) => {
      try {
        return json(await runLspTests(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_debug_context',
    {
      description:
        'Collect bounded debugging evidence for a symbol: current diagnostics, hover information, definition, incoming callers, and related tests. This is read-only.',
      inputSchema: {
        ...lspPositionSchema,
        limit: reviewLimitSchema,
      },
    },
    async (args) => {
      try {
        return json(await getLspDebugContext(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'lsp_review_structure',
    {
      description:
        'Review one source file structure with bounded diagnostics, document symbols, and related tests. This is read-only.',
      inputSchema: {
        filePath: z.string().min(1).max(4096),
        ...lspSessionSchema,
        limit: reviewLimitSchema,
      },
    },
    async (args) => {
      try {
        return json(await reviewLspStructure(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'review_changes',
    {
      description:
        'Build a read-only code-review evidence report from changed Git files, diff statistics, optional LSP diagnostics, and optional related tests.',
      inputSchema: {
        ...gitReadSchema,
        ref: z.string().max(512).optional(),
        path: z.string().min(1).max(4096).optional(),
        staged: z.boolean().optional(),
        ...lspSessionSchema,
        maxFiles: z.number().int().min(1).max(100).optional(),
        includeTests: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(await reviewChanges(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Two-phase local Git commit -------------------------------------------
  server.registerTool(
    'git_commit_plan',
    {
      description:
        'Validate and preview a Conventional Commit against the repository commitlint rules. This operation is read-only and does not stage files or create a commit.',
      inputSchema: commitPlanSchema,
    },
    async (args) => {
      try {
        const plan = await createCommitPlan(args);
        pruneCommitPlans(Date.now());
        commitPlans.set(plan.planId, { plan, createdAt: Date.now() });
        return json({ operation: 'commit-plan', success: true, ...plan });
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_commit_apply',
    {
      description:
        'Apply a still-current git_commit_plan using normal Git hooks. This mutates the local index and commit history but never contacts a remote.',
      inputSchema: {
        planId: z.string().uuid(),
        ...gitReadSchema,
      },
    },
    async (args) => {
      const record = commitPlans.get(args.planId);
      if (!record || Date.now() - record.createdAt >= commitPlanTtlMs) {
        if (record) commitPlans.delete(args.planId);
        return toolError(new Error('Commit plan is unknown or expired; create a new plan before applying.'));
      }
      try {
        const result = applyCommitPlan(record.plan, args);
        if (result.success) commitPlans.delete(args.planId);
        return json(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Read-only Git --------------------------------------------------------
  server.registerTool(
    'git_status',
    {
      description: 'Read the repository Git status without changing the worktree or index.',
      inputSchema: gitReadSchema,
    },
    async (args) => {
      try {
        return json(readGitStatus(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_changed_files',
    {
      description:
        'Return structured changed-file status for the current worktree, including staged, unstaged, and untracked flags without changing Git state.',
      inputSchema: {
        ...gitReadSchema,
        ref: z.string().max(512).optional(),
        path: z.string().min(1).max(4096).optional(),
        staged: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(readGitChangedFiles(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_diff',
    {
      description: 'Read a bounded Git diff for the worktree, index, revision, or repository path.',
      inputSchema: {
        ...gitReadSchema,
        ref: z.string().max(512).optional(),
        path: z.string().min(1).max(4096).optional(),
        staged: z.boolean().optional(),
        stat: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(readGitDiff(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_log',
    {
      description: 'Read bounded Git commit history, optionally limited to a revision or repository path.',
      inputSchema: {
        ...gitReadSchema,
        ref: z.string().max(512).optional(),
        path: z.string().min(1).max(4096).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        return json(readGitLog(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_show',
    {
      description: 'Read one Git revision with metadata and a bounded patch, optionally for one repository path.',
      inputSchema: {
        ...gitReadSchema,
        revision: z.string().min(1).max(512),
        path: z.string().min(1).max(4096).optional(),
      },
    },
    async (args) => {
      try {
        return json(readGitShow(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_branches',
    {
      description: 'List local and remote Git branches without changing repository state.',
      inputSchema: gitReadSchema,
    },
    async (args) => {
      try {
        return json(readGitBranches(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_grep',
    {
      description:
        'Search bounded tracked repository content with literal matching by default or explicitly requested regular expressions.',
      inputSchema: {
        ...gitReadSchema,
        pattern: z.string().min(1).max(512),
        ref: z.string().max(512).optional(),
        path: z.string().min(1).max(4096).optional(),
        regex: z.boolean().optional(),
        ignoreCase: z.boolean().optional(),
        maxMatches: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        return json(readGitGrep(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_blame',
    {
      description: 'Read bounded line-level provenance for a repository-rooted file without changing Git state.',
      inputSchema: {
        ...gitReadSchema,
        path: z.string().min(1).max(4096),
        revision: z.string().min(1).max(512).optional(),
        startLine: z.number().int().min(1).max(1_000_000).optional(),
        endLine: z.number().int().min(1).max(1_000_000).optional(),
      },
    },
    async (args) => {
      try {
        return json(readGitBlame(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_ls_files',
    {
      description:
        'List bounded repository paths, tracked by default; optionally include standard-excluded untracked paths without changing the worktree or index.',
      inputSchema: {
        ...gitReadSchema,
        path: z.string().min(1).max(4096).optional(),
        includeUntracked: z.boolean().optional(),
        includeStages: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return json(readGitLsFiles(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_tags',
    {
      description: 'Read bounded local Git tag metadata without contacting remotes or changing repository state.',
      inputSchema: {
        ...gitReadSchema,
        pattern: z.string().min(1).max(512).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        return json(readGitTags(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
  server.registerTool(
    'git_remotes',
    {
      description: 'Read configured local Git remote metadata with credentials removed and without contacting remotes.',
      inputSchema: gitReadSchema,
    },
    async (args) => {
      try {
        return json(readGitRemotes(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Discovery & guidance -------------------------------------------------
  server.registerTool(
    'get_guide',
    {
      description:
        'Return a curated, repository-specific guide for a Mission Platform workflow, including FWS authoring, security, Wasm verification, and forensics.',
      inputSchema: {
        area: z.string().describe('The workflow to explain.'),
      },
    },
    async (args) => {
      const area = args.area?.trim();
      if (!area) {
        return text('Provide an "area". One of: ' + GUIDE_IDS.join(', '));
      }
      const guide = getGuide(area);
      if (!guide) {
        return text(`Unknown area "${area}". One of: ${GUIDE_IDS.join(', ')}`);
      }
      return text(guide.body);
    },
  );

  // ---- Forge Web Script security workflows ---------------------------------
  server.registerTool(
    'fws_analyze_source',
    {
      description:
        'Run canonical FWS source analysis and return frontend diagnostics, stable findings, facts, and policy. Accepts bounded inline source or a repository-rooted .fws path; it never executes guest code.',
      inputSchema: {
        source: z.string().max(MAX_SOURCE_BYTES).optional().describe('Inline FWS source, capped at 256 KiB.'),
        sourcePath: z.string().max(1024).optional().describe('Repository-rooted .fws file to read.'),
        fileName: z.string().max(1024).optional().describe('Logical source name for inline source.'),
        policy: analysisPolicySchema,
        targetFeatures: targetFeaturesSchema,
      },
    },
    async (args) => {
      if (args.source === undefined && args.sourcePath === undefined)
        return toolError(new Error('Provide either bounded inline "source" or a repository-rooted "sourcePath".'));
      if (args.source !== undefined && args.sourcePath !== undefined)
        return toolError(new Error('Provide only one of "source" and "sourcePath".'));
      try {
        const fileName = args.fileName?.trim() || '<mcp-input>.fws';
        const source =
          args.source ?? readBoundedText(repoPath(args.sourcePath as string, 'sourcePath'), MAX_SOURCE_BYTES, 'Source');
        if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES)
          throw new Error(`Source exceeds the ${MAX_SOURCE_BYTES} byte safety limit.`);
        return json(analyzeSource(source, fileName, fwsAnalysisOptions(args.policy, args.targetFeatures)));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'fws_analyze_workspace',
    {
      description:
        'Analyze bounded .fws files below a repository-rooted path using the canonical FWS analyzer. Symlinks are skipped, file count and source size are capped, and no code is executed.',
      inputSchema: {
        sourcePath: z.string().max(1024).describe('Repository-rooted .fws file or directory.'),
        maxFiles: z
          .number()
          .int()
          .min(1)
          .max(MAX_WORKSPACE_FILES)
          .optional()
          .describe('Maximum files to inspect (default 100).'),
        policy: analysisPolicySchema,
        targetFeatures: targetFeaturesSchema,
      },
    },
    async (args) => {
      try {
        const target = repoPath(args.sourcePath, 'sourcePath');
        const files = collectFwsFiles(target, args.maxFiles ?? MAX_WORKSPACE_FILES);
        const options = fwsAnalysisOptions(args.policy, args.targetFeatures);
        const results = files.map((file) =>
          analyzeSource(readBoundedText(file, MAX_SOURCE_BYTES, 'Source'), file, options),
        );
        return json({
          root: relative(resolve(findRepoRoot()), target) || '.',
          fileCount: results.length,
          truncated: files.length >= (args.maxFiles ?? MAX_WORKSPACE_FILES),
          results,
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'fws_inspect_manifest',
    {
      description:
        'Read a bounded, repository-rooted FWS ABI manifest and return its safe structural summary. This is inspection only and does not instantiate Wasm.',
      inputSchema: {
        manifestPath: z.string().max(1024).describe('Repository-rooted JSON manifest path.'),
      },
    },
    async (args) => {
      try {
        const manifest = readManifest(repoPath(args.manifestPath, 'manifestPath'));
        return json({
          format: manifest.format,
          moduleName: manifest.moduleName,
          graphHash: manifest.graphHash,
          boundsChecks: manifest.boundsChecks ?? 'runtime',
          targetFeatures: manifest.targetFeatures,
          requiredCapabilities: manifest.requiredCapabilities,
          imports: manifest.imports.map(({ capability, alias, function: declaration }) => ({
            capability,
            alias,
            function: declaration.name,
            parameters: declaration.parameters.map(({ type, reference }) => ({
              type,
              ...(reference === undefined ? {} : { reference }),
            })),
            result: declaration.result,
          })),
          exports: manifest.exports.map(({ name, parameters, result, resultReference }) => ({
            name,
            parameters: parameters.map(({ type, reference }) => ({
              type,
              ...(reference === undefined ? {} : { reference }),
            })),
            result,
            ...(resultReference === undefined ? {} : { resultReference }),
          })),
          memory: manifest.memory,
          iteratorCount: manifest.iteratorDescriptors?.length ?? 0,
          hasAsyncContract: manifest.async !== undefined,
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'fws_inspect_sonir',
    {
      description:
        'Read a bounded, repository-rooted .sonir.json artifact and return deterministic graph, optimization, and bounds-policy metadata. This is read-only inspection and never executes guest code.',
      inputSchema: {
        sonIrPath: z.string().max(1024).describe('Repository-rooted .sonir.json path.'),
        maxNodes: z
          .number()
          .int()
          .min(0)
          .max(1000)
          .optional()
          .describe('Maximum node summaries to return (default 0).'),
        maxFunctions: z
          .number()
          .int()
          .min(0)
          .max(1000)
          .optional()
          .describe('Maximum function summaries to return (default 100).'),
      },
    },
    async (args) => {
      try {
        const fileName = repoPath(args.sonIrPath, 'sonIrPath');
        const module = deserializeForgeWebScriptSoN(readBoundedText(fileName, MAX_ARTIFACT_BYTES, 'SoN artifact'));
        if (module === undefined) throw new Error('SoN artifact is malformed, stale, or exceeds the safety limits.');
        const maxNodes = args.maxNodes ?? 0;
        const maxFunctions = args.maxFunctions ?? 100;
        return json({
          schemaVersion: module.schemaVersion,
          compilerVersion: module.compilerVersion,
          languageVersion: module.languageVersion,
          abiVersion: module.abiVersion,
          sourceHash: module.sourceHash,
          graphHash: module.graphHash,
          optimization: module.optimization,
          boundsChecks: module.boundsChecks,
          memoryModel: module.memoryModel,
          nodeCount: module.nodes.length,
          regionCount: module.regions.length,
          functionCount: module.functions.length,
          functions: module.functions
            .slice(0, maxFunctions)
            .map(({ name, entry, exported }) => ({ name, entry, exported })),
          optimizerPasses:
            module.optimizationReport?.passes.map(({ name, applied, skipped }) => ({ name, applied, skipped })) ?? [],
          nodes: module.nodes.slice(0, maxNodes).map(({ id, kind, functionName, effects, alias, ownership }) => ({
            id,
            kind,
            functionName,
            effects,
            alias,
            ownership,
          })),
          truncated: maxNodes < module.nodes.length || maxFunctions < module.functions.length,
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'fws_verify_artifact',
    {
      description:
        'Verify a bounded Wasm artifact against a repository-rooted FWS manifest, deterministic metadata, target features, and capability policy. This never executes the artifact or host imports.',
      inputSchema: {
        artifactPath: z.string().max(1024).describe('Repository-rooted Wasm binary path.'),
        manifestPath: z.string().max(1024).describe('Repository-rooted ABI manifest JSON path.'),
        metadata: artifactMetadataSchema,
        expectedContentHash: z.string().max(128).optional(),
        expectedSourceHash: z.string().max(128).optional(),
        policy: z
          .object({
            profile: z.enum(['development', 'strict']).optional(),
            allowedCapabilities: z.array(z.string().trim().min(1).max(128)).max(128).optional(),
            maxBytes: z.number().int().min(1).max(MAX_ARTIFACT_BYTES).optional(),
            maxCustomSectionBytes: z
              .number()
              .int()
              .min(1)
              .max(4 * 1024 * 1024)
              .optional(),
            allowedCustomSections: z.array(z.string().max(128)).max(32).optional(),
          })
          .optional(),
      },
    },
    async (args) => {
      try {
        const manifest = readManifest(repoPath(args.manifestPath, 'manifestPath'));
        const wasm = readBoundedBytes(repoPath(args.artifactPath, 'artifactPath'), MAX_ARTIFACT_BYTES, 'Artifact');
        const result = verifyForgeWebScriptWasmArtifact({
          wasm,
          fileName: args.artifactPath,
          manifest,
          metadata: artifactMetadata(args.metadata, manifest),
          ...(args.expectedContentHash === undefined ? {} : { expectedContentHash: args.expectedContentHash }),
          ...(args.expectedSourceHash === undefined ? {} : { expectedSourceHash: args.expectedSourceHash }),
          policy: args.policy,
        });
        return json(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'fws_run_trace',
    {
      description:
        'Capture a bounded deterministic trace from the built-in capability-denied FWS self-hosted lex/parser probe. It accepts only bounded source, never arbitrary Wasm, commands, filesystem reads, or host capability bindings.',
      inputSchema: {
        source: z.string().max(MAX_SOURCE_BYTES).optional().describe('Inline FWS source, capped at 256 KiB.'),
        sourcePath: z.string().max(1024).optional().describe('Repository-rooted .fws file to read.'),
        mode: z
          .enum(['interpret', 'jit', 'aot'])
          .optional()
          .describe('Bounded probe execution mode (default interpret).'),
        maxSteps: z.number().int().min(1).max(1_000_000).optional().describe('Hard per-stage step cap.'),
        capture: z.enum(['summary', 'events', 'snapshot']).optional(),
        maxEvents: z.number().int().min(0).max(4096).optional(),
        maxTraceBytes: z.number().int().min(0).max(1_048_576).optional(),
        maxSnapshotBytes: z.number().int().min(0).max(65_536).optional(),
        replayId: z.string().max(128).optional(),
      },
    },
    async (args) => {
      if (args.source === undefined && args.sourcePath === undefined)
        return toolError(new Error('Provide either bounded inline "source" or a repository-rooted "sourcePath".'));
      if (args.source !== undefined && args.sourcePath !== undefined)
        return toolError(new Error('Provide only one of "source" and "sourcePath".'));
      try {
        const source =
          args.source ?? readBoundedText(repoPath(args.sourcePath as string, 'sourcePath'), MAX_SOURCE_BYTES, 'Source');
        if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES)
          throw new Error(`Source exceeds the ${MAX_SOURCE_BYTES} byte safety limit.`);
        const traceOptions = {
          capture: args.capture ?? 'events',
          ...(args.maxEvents === undefined ? {} : { maxEvents: args.maxEvents }),
          ...(args.maxTraceBytes === undefined ? {} : { maxTraceBytes: args.maxTraceBytes }),
          ...(args.maxSnapshotBytes === undefined ? {} : { maxSnapshotBytes: args.maxSnapshotBytes }),
          ...(args.replayId === undefined ? {} : { replayId: args.replayId }),
        } as const;
        const options: ForgeWebScriptSelfHostedRunOptions = {
          ...(args.maxSteps === undefined ? {} : { maxSteps: args.maxSteps }),
          trace: traceOptions,
        };
        const report = runForgeWebScriptSelfHostedLexStage(
          { source, fileName: args.sourcePath ?? '<mcp-input>.fws', compilerVersion: 'mcp-trace' },
          args.mode ?? 'interpret',
          options,
        );
        return json({
          safe: true,
          execution: 'capability-denied-self-hosted-probe',
          mode: args.mode ?? 'interpret',
          steps: report.steps,
          parity: report.parity,
          trace: (report as { readonly trace?: unknown }).trace,
          stages: report.stageReports?.map((stage) => ({
            stage: stage.stage,
            steps: stage.steps,
            parity: stage.parity,
            trace: (stage as { readonly trace?: unknown }).trace,
          })),
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'list_docs',
    {
      description: 'List the Markdown documents available under the repository `docs/` directory.',
      inputSchema: {},
    },
    async () => {
      return json(listDocs().map((document) => document.slug));
    },
  );

  server.registerTool(
    'read_doc',
    {
      description:
        'Read a single repository document by its slug (see `list_docs`), e.g. "best-practices" or "packages/tooling/configs/eslint-config".',
      inputSchema: {
        slug: z.string().describe('Document slug from `list_docs`.'),
      },
    },
    async (args) => {
      const slug = args.slug?.trim();
      if (!slug) {
        return text('Provide a document "slug" (see the list_docs tool).');
      }
      const document = readDocument(slug);
      return document ? text(document) : text(`No document with slug "${slug}". Use list_docs to see available slugs.`);
    },
  );

  server.registerTool(
    'search_docs',
    {
      description:
        'Case-insensitive search across all repository docs. Returns matching documents with the lines that matched.',
      inputSchema: {
        query: z.string().describe('Text to search for.'),
      },
    },
    async (args) => {
      const query = args.query?.trim();
      if (!query) {
        return text('Provide a "query" to search for.');
      }
      const needle = query.toLowerCase();
      const hits: { slug: string; matches: string[] }[] = [];
      for (const document of listDocs()) {
        const body = readDocument(document.slug) ?? '';
        const matches = body
          .split('\n')
          .filter((line) => line.toLowerCase().includes(needle))
          .slice(0, 8)
          .map((line) => line.trim());
        if (matches.length > 0) {
          hits.push({ slug: document.slug, matches });
        }
      }
      return hits.length > 0 ? json(hits) : text(`No matches for "${query}".`);
    },
  );

  server.registerTool(
    'get_tokens',
    {
      description:
        'Reads Mission Platform DTCG design tokens from @mission-platform/tokens. Select a top-level category, a split component source such as component/atoms/button, or omit the filter for the complete merged document.',
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            'Optional category or normalized source ID (e.g. palette, spacing, typography, component, component/atoms/button).',
          ),
      },
    },
    async (args) => {
      try {
        return json(readTokens(args.category));
      } catch (error) {
        return text(error instanceof Error ? error.message : String(error));
      }
    },
  );

  // ---- Component usage ------------------------------------------------------
  server.registerTool(
    'list_components',
    {
      description:
        'List every component in @mission-platform/components with its exported symbols and atomic-design level (atoms/molecules/organisms/templates/pages).',
      inputSchema: {
        filter: z.string().optional().describe('Optional substring to filter component slugs.'),
      },
    },
    async (args) => {
      const filter = args.filter?.trim().toLowerCase();
      const components = listComponents().filter(
        (component) =>
          !filter ||
          component.slug.includes(filter) ||
          component.level.includes(filter) ||
          component.relativePath.includes(filter),
      );
      if (components.length === 0) {
        return text(filter ? `No components match "${filter}".` : 'No components found.');
      }
      return json(components);
    },
  );

  server.registerTool(
    'get_component_usage',
    {
      description:
        'Describe how to use a component: its exported symbols, props interface, doc comment, available Storybook stories, and Vue/React import snippets.',
      inputSchema: {
        component: z.string().describe('Component name or slug, e.g. "ForgeButton" or "forge-button".'),
      },
    },
    async (args) => {
      const component = args.component?.trim();
      if (!component) {
        return text('Provide a "component" name or slug (see list_components).');
      }
      const usage = getComponentUsage(component);
      if (!usage) {
        return text(`No component "${component}". Use list_components to see available components.`);
      }
      const sections = [
        `# ${usage.componentName}  (\`${usage.slug}\`)`,
        `Level: ${usage.level}`,
        `Path: src/components/${usage.relativePath}`,
        `Exports: ${usage.exports.join(', ')}`,
        `Stories: ${usage.stories.length > 0 ? usage.stories.join(', ') : 'none found'}`,
        '',
        '## Import',
        'The specifier is framework-agnostic: the framework build is selected by the',
        'consuming workspace via the `mp:<framework>` export condition (Vite',
        '`resolve.conditions` / TypeScript `customConditions`), never by the specifier.',
        '```ts',
        usage.importStatement,
        '```',
        '',
        "Per-component deep import (only this component's chunk, same conditions):",
        '```ts',
        usage.deepImport,
        '```',
      ];
      if (usage.docComment) {
        sections.push('', '## Description', usage.docComment);
      }
      if (usage.propsInterface) {
        sections.push('', '## Props', '```ts', usage.propsInterface, '```');
      }
      return text(sections.join('\n'));
    },
  );

  // ---- Inventory ------------------------------------------------------------
  server.registerTool(
    'list_packages',
    {
      description: 'List all packages in packages/ with name, version and description.',
      inputSchema: {},
    },
    async () => {
      return json(
        listGroup('packages').map((member) => ({
          name: member.name,
          version: member.version,
          description: member.description,
        })),
      );
    },
  );

  server.registerTool(
    'list_apps',
    {
      description: 'List all applications in apps/.',
      inputSchema: {},
    },
    async () => {
      return json(
        listGroup('apps').map((member) => ({
          name: member.name,
          version: member.version,
          description: member.description,
        })),
      );
    },
  );

  server.registerTool(
    'list_workers',
    {
      description: 'List all Cloudflare Workers in packages/edge/workers/.',
      inputSchema: {},
    },
    async () => {
      return json(
        listGroup('edge-workers').map((member) => ({
          name: member.name,
          version: member.version,
          description: member.description,
        })),
      );
    },
  );

  server.registerTool(
    'get_member_info',
    {
      description:
        'Get detailed info for a workspace member: its manifest scripts and dependencies, plus its llms.txt/README when present.',
      inputSchema: {
        group: z.enum(['packages', 'apps', 'edge-workers', 'crates']).describe('Workspace group.'),
        name: z.string().describe('Folder name or scoped package name.'),
      },
    },
    async (args) => {
      const group = args.group as WorkspaceGroup;
      const name = args.name?.trim();
      if (!group || !name) {
        return text('Provide both "group" and "name".');
      }
      const member = findMember(group, name);
      if (!member) {
        return text(`No "${name}" in ${group}/.`);
      }
      const details = readMemberDetails(member);
      return json({
        name: member.name,
        version: member.version,
        private: member.private,
        relativeDir: member.relativeDir,
        scripts: details.manifest.scripts ?? {},
        dependencies: member.dependencies,
        devDependencies: member.devDependencies,
        peerDependencies: member.peerDependencies,
        llms: details.llms,
        readme: details.readme,
      });
    },
  );

  // ---- Scaffolding ----------------------------------------------------------
  server.registerTool(
    'scaffold_package',
    {
      description:
        'Generate a convention-compliant packages/<name> skeleton (manifest, tsconfig set, shared configs, vite/vitest/turbo config, src barrel, spec, llms.txt, docs). Dry-run unless apply=true.',
      inputSchema: {
        name: z.string().describe('Kebab-case package name, e.g. "date-utils".'),
        description: z.string().optional().describe('Short package description.'),
        vue: z
          .boolean()
          .optional()
          .describe('Set true if the package ships Vue components (adds stylelint + vue deps). Defaults to false.'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const name = args.name?.trim();
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      try {
        const files = packageFiles({
          name,
          description: args.description?.trim() ?? '',
          vue: args.vue === true,
        });
        const result = writeScaffold({ group: 'packages', name, files, apply: args.apply === true });
        return json(result);
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'scaffold_app',
    {
      description:
        'Generate a convention-compliant apps/<name> Vite + Vue 3 skeleton (private manifest, tsconfig set, shared configs, vite/turbo config, index.html, src entry). Dry-run unless apply=true.',
      inputSchema: {
        name: z.string().describe('Kebab-case app name, e.g. "admin-portal".'),
        description: z.string().optional().describe('Short app description.'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const name = args.name?.trim();
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      try {
        const files = appFiles({ name, description: args.description?.trim() ?? '' });
        const result = writeScaffold({ group: 'apps', name, files, apply: args.apply === true });
        return json(result);
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'scaffold_worker',
    {
      description:
        'Generate a convention-compliant packages/edge/workers/<name> Cloudflare Worker skeleton (private manifest, tsconfig set, shared configs, typed fetch handler). Dry-run unless apply=true.',
      inputSchema: {
        name: z.string().describe('Kebab-case worker name, e.g. "asset-proxy".'),
        description: z.string().optional().describe('Short worker description.'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const name = args.name?.trim();
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      try {
        const files = workerFiles({ name, description: args.description?.trim() ?? '' });
        const result = writeScaffold({ group: 'edge-workers', name, files, apply: args.apply === true });
        return json(result);
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'scaffold_crate',
    {
      description:
        'Generate a convention-compliant crates/<name> Rust/WASM crate skeleton (Cargo.toml, src/lib.rs, build.rs, WASM tests, README). Dry-run unless apply=true.',
      inputSchema: {
        name: z.string().describe('Kebab-case crate name, e.g. "image-processor".'),
        description: z.string().optional().describe('Short crate description.'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const name = args.name?.trim();
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      try {
        const files = crateFiles({ name, description: args.description?.trim() ?? '' });
        const result = writeScaffold({ group: 'crates', name, files, apply: args.apply === true });
        return json(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'scaffold_component',
    {
      description:
        'Generate a convention-compliant atomic-design component under packages/<package>/src/components/<level>/<name>/ (tsx + stories + spec + folder index, barrel update). Levels: atom|molecule|organism|template|page. Story title <Level>/<Area>/<Comp>. Dry-run unless apply=true.',
      inputSchema: {
        name: z.string().describe('Kebab-case component name, e.g. "forge-input".'),
        level: z.enum(['atom', 'molecule', 'organism', 'template', 'page']).describe('Atomic design level (singular).'),
        area: z
          .string()
          .optional()
          .describe('Functional area for the Storybook title (e.g. "Forms", "Data"). Defaults to "General".'),
        package: z.string().optional().describe('Target package folder under packages/ (default: "components").'),
        description: z.string().optional().describe('Short component description.'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const name = normalizeUnitName(args.name?.trim() ?? '');
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      const nameError = validateName(name);
      if (nameError) {
        return toolError(new Error(nameError));
      }
      try {
        const target = resolvePackageTarget(args.package?.trim() || 'components');
        const scaffold = componentFiles({
          name,
          level: args.level as ScaffoldAtomicLevel,
          area: args.area?.trim() || 'General',
          description: args.description?.trim(),
        });
        const result = writeIntoPackage({
          packageDir: target.packageDir,
          relativePackageDir: target.relativePackageDir,
          files: scaffold.files,
          barrelUpdates: [{ relativePath: 'src/components/index.ts', exportLine: scaffold.barrelExport }],
          apply: args.apply === true,
        });
        return json({
          ...result,
          componentName: scaffold.componentName,
          storyTitle: scaffold.storyTitle,
          levelFolder: scaffold.levelFolder,
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'scaffold_composable',
    {
      description:
        'Generate a convention-compliant composable under packages/<package>/src/composables/<name>/ (<name>.ts + .spec.ts + barrel). Write-once forge hooks. Dry-run unless apply=true.',
      inputSchema: {
        name: z.string().describe('Kebab-case composable name, e.g. "use-focus-trap" (use- prefix added if missing).'),
        package: z.string().describe('Target package folder under packages/, e.g. "observers".'),
        description: z.string().optional().describe('Short composable description.'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const rawName = args.name?.trim() ?? '';
      if (!rawName) {
        return text('Provide a kebab-case "name".');
      }
      const packageName = args.package?.trim();
      if (!packageName) {
        return text('Provide a target "package" folder under packages/.');
      }
      try {
        const name = normalizeComposableName(normalizeUnitName(rawName));
        const nameError = validateName(name);
        if (nameError) {
          throw new Error(nameError);
        }
        const target = resolvePackageTarget(packageName);
        const scaffold = composableFiles({ name, description: args.description?.trim() });
        const result = writeIntoPackage({
          packageDir: target.packageDir,
          relativePackageDir: target.relativePackageDir,
          files: scaffold.files,
          barrelUpdates: [{ relativePath: 'src/composables/index.ts', exportLine: scaffold.barrelExport }],
          apply: args.apply === true,
        });
        return json({ ...result, functionName: scaffold.functionName, name: scaffold.name });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'scaffold_store',
    {
      description:
        'Generate a convention-compliant framework-neutral store under packages/<package>/src/stores/<name>/ (<name>.ts + .spec.ts + barrel). Dry-run unless apply=true.',
      inputSchema: {
        name: z.string().describe('Kebab-case store name, e.g. "theme".'),
        package: z.string().describe('Target package folder under packages/, e.g. "components".'),
        description: z.string().optional().describe('Short store description.'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const name = normalizeUnitName(args.name?.trim() ?? '');
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      const packageName = args.package?.trim();
      if (!packageName) {
        return text('Provide a target "package" folder under packages/.');
      }
      const nameError = validateName(name);
      if (nameError) {
        return toolError(new Error(nameError));
      }
      try {
        const target = resolvePackageTarget(packageName);
        const scaffold = storeFiles({ name, description: args.description?.trim() });
        const result = writeIntoPackage({
          packageDir: target.packageDir,
          relativePackageDir: target.relativePackageDir,
          files: scaffold.files,
          barrelUpdates: [{ relativePath: 'src/stores/index.ts', exportLine: scaffold.barrelExport }],
          apply: args.apply === true,
        });
        return json({ ...result, name: scaffold.name, pascal: scaffold.pascal });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'scaffold_util',
    {
      description:
        'Generate a convention-compliant util under packages/<package>/src/utils/<name>/ (<name>.ts + .spec.ts + barrel). Dry-run unless apply=true.',
      inputSchema: {
        name: z.string().describe('Kebab-case util name, e.g. "format-date".'),
        package: z.string().describe('Target package folder under packages/, e.g. "d3".'),
        description: z.string().optional().describe('Short util description.'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const name = normalizeUnitName(args.name?.trim() ?? '');
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      const packageName = args.package?.trim();
      if (!packageName) {
        return text('Provide a target "package" folder under packages/.');
      }
      const nameError = validateName(name);
      if (nameError) {
        return toolError(new Error(nameError));
      }
      try {
        const target = resolvePackageTarget(packageName);
        const scaffold = utilFiles({ name, description: args.description?.trim() });
        const result = writeIntoPackage({
          packageDir: target.packageDir,
          relativePackageDir: target.relativePackageDir,
          files: scaffold.files,
          barrelUpdates: [{ relativePath: 'src/utils/index.ts', exportLine: scaffold.barrelExport }],
          apply: args.apply === true,
        });
        return json({ ...result, name: scaffold.name, functionName: scaffold.functionName });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- accessibility --------------------------------------------------------
  server.registerTool(
    'test_accessibility',
    {
      description:
        'Audit a reachable HTTP(S) page with axe-core in a headless browser. Returns normalized accessibility violations and page, console, or browser errors without writing to the repository.',
      inputSchema: accessibilityAuditInputSchema.shape,
    },
    async (args) => json(await runAccessibilityAudit(args)),
  );

  // ---- i18n / localisation --------------------------------------------------
  server.registerTool(
    'list_locales',
    {
      description:
        'Inspect i18n translation coverage. With no "name", surveys every app that ships YAML translations. With a "name", reports the resolved locales directory, layout (nested/flat), namespaces, and — per non-default locale — the key count plus any keys missing or extra relative to the default locale, so you can see what still needs translating.',
      inputSchema: {
        name: z
          .string()
          .optional()
          .describe('Workspace member folder (e.g. "website"). Omit to survey all members of the group.'),
        group: z
          .enum(['apps', 'packages', 'edge-workers', 'tooling-vite', 'tooling-configs', 'crates'])
          .optional()
          .describe('Workspace group. Defaults to "apps".'),
      },
    },
    async (args) => {
      const group = (args.group as WorkspaceGroup | undefined) ?? 'apps';
      const name = args.name?.trim();
      try {
        if (!name) {
          const survey = surveyLocales(group);
          return survey.length > 0 ? json(survey) : text(`No members under ${group}/ ship YAML translations.`);
        }
        const resolved = resolveMemberLocales(group, name);
        if (!resolved) {
          return text(`"${name}" in ${group}/ has no YAML locale files (it may use an inline message catalogue).`);
        }
        return json({
          member: name,
          localesDir: resolved.relativeLocalesDir,
          layout: resolved.layout,
          defaultLocale: resolved.defaultLocale,
          namespaces: resolved.namespaces,
          locales: resolved.locales,
          coverage: localeCoverage(resolved),
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'locale_coverage',
    {
      description:
        'Report translated key counts and missing or extra keys for each non-default locale of a workspace member. This is read-only and never writes locale files.',
      inputSchema: {
        name: z.string().describe('Workspace member folder (e.g. "website").'),
        group: z
          .enum(['apps', 'packages', 'edge-workers', 'tooling-vite', 'tooling-configs', 'crates'])
          .optional()
          .describe('Workspace group. Defaults to "apps".'),
      },
    },
    async (args) => {
      const group = (args.group as WorkspaceGroup | undefined) ?? 'apps';
      const name = args.name?.trim();
      if (!name) {
        return text('Provide "name" (member folder) to inspect locale coverage.');
      }
      try {
        const resolved = resolveMemberLocales(group, name);
        if (!resolved) {
          return text(`"${name}" in ${group}/ has no YAML locale files.`);
        }
        return json(localeCoverage(resolved));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'add_locale',
    {
      description:
        'Add a new language to an app by cloning the default locale\'s file structure. By default the English source values are copied as a translation starting point (fill="source"); set fill="empty" for blank values. Dry-run unless apply=true. After applying, translate the values (e.g. with update_translation) and run the app\'s "format:write".',
      inputSchema: {
        name: z.string().describe('Workspace member folder (e.g. "website").'),
        locale: z.string().describe('New locale code — a BCP-47 tag such as "pt", "pt-br" or "zh-hans".'),
        group: z
          .enum(['apps', 'packages', 'edge-workers', 'tooling-vite', 'tooling-configs', 'crates'])
          .optional()
          .describe('Workspace group. Defaults to "apps".'),
        fill: z
          .enum(['source', 'empty'])
          .optional()
          .describe('"source" (default) copies the default-locale values; "empty" writes empty strings.'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const group = (args.group as WorkspaceGroup | undefined) ?? 'apps';
      const name = args.name?.trim();
      const locale = args.locale?.trim();
      if (!name || !locale) {
        return text('Provide both "name" (member folder) and "locale" (new locale code).');
      }
      try {
        const resolved = resolveMemberLocales(group, name);
        if (!resolved) {
          return text(`"${name}" in ${group}/ has no YAML locale files to clone from.`);
        }
        const result = addLocale(resolved, locale, {
          fill: (args.fill as 'source' | 'empty' | undefined) ?? 'source',
          apply: args.apply === true,
        });
        return json(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'remove_locale',
    {
      description:
        'Remove a language from an app (deletes its nested locale directory or flat file). Refuses to remove the default locale. Dry-run unless apply=true.',
      inputSchema: {
        name: z.string().describe('Workspace member folder (e.g. "website").'),
        locale: z.string().describe('Locale code to remove (e.g. "ko").'),
        group: z
          .enum(['apps', 'packages', 'edge-workers', 'tooling-vite', 'tooling-configs', 'crates'])
          .optional()
          .describe('Workspace group. Defaults to "apps".'),
        apply: z.boolean().optional().describe('Delete files. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const group = (args.group as WorkspaceGroup | undefined) ?? 'apps';
      const name = args.name?.trim();
      const locale = args.locale?.trim();
      if (!name || !locale) {
        return text('Provide both "name" (member folder) and "locale" (locale code to remove).');
      }
      try {
        const resolved = resolveMemberLocales(group, name);
        if (!resolved) {
          return text(`"${name}" in ${group}/ has no YAML locale files.`);
        }
        const result = removeLocale(resolved, locale, args.apply === true);
        return json(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'update_translation',
    {
      description:
        'Update one or more translation values in a single locale. "entries" maps dot-path keys (e.g. "hero.title") to their new values. For nested apps the namespace is inferred when there is only one; otherwise pass "namespace". Dry-run unless apply=true; run the app\'s "format:write" afterwards.',
      inputSchema: {
        name: z.string().describe('Workspace member folder (e.g. "website").'),
        locale: z.string().describe('Locale code to edit (e.g. "es").'),
        entries: z
          .record(z.string(), z.string())
          .describe('Map of dot-path key -> new value, e.g. { "hero.title": "Hola", "nav.about": "Acerca de" }.'),
        namespace: z.string().optional().describe('i18n namespace (e.g. "mp.website"). Inferred when unambiguous.'),
        group: z
          .enum(['apps', 'packages', 'edge-workers', 'tooling-vite', 'tooling-configs', 'crates'])
          .optional()
          .describe('Workspace group. Defaults to "apps".'),
        apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
      },
    },
    async (args) => {
      const group = (args.group as WorkspaceGroup | undefined) ?? 'apps';
      const name = args.name?.trim();
      const locale = args.locale?.trim();
      const entries = args.entries as Record<string, string> | undefined;
      if (!name || !locale) {
        return text('Provide both "name" (member folder) and "locale" (locale code to edit).');
      }
      if (!entries || Object.keys(entries).length === 0) {
        return text('Provide "entries": a map of dot-path key -> new value.');
      }
      try {
        const resolved = resolveMemberLocales(group, name);
        if (!resolved) {
          return text(`"${name}" in ${group}/ has no YAML locale files.`);
        }
        const result = updateTranslation({
          resolved,
          code: locale,
          namespace: args.namespace?.trim() || undefined,
          entries,
          apply: args.apply === true,
        });
        return json(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Security Analysis Suite ----------------------------------------------
  server.registerTool(
    'security_scan_secrets',
    {
      description:
        'Scan repository files, directories, or diffs for exposed credentials, API tokens, and private keys with automatic redaction.',
      inputSchema: {
        path: z
          .string()
          .min(1)
          .max(4096)
          .optional()
          .describe('Repository-rooted path to scan. Scans entire repository if omitted.'),
        staged: z.boolean().optional().describe('When true, scans staged git diff instead of filesystem files.'),
        severityThreshold: z
          .enum(['critical', 'high', 'medium', 'low', 'info'])
          .optional()
          .describe('Minimum severity threshold to report.'),
        maxFiles: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe('Maximum number of files to inspect (default 100).'),
      },
    },
    (args) => {
      try {
        if (args.staged) {
          const diffResult = readGitDiff({ staged: true, path: args.path });
          if (!diffResult.success) {
            throw new Error(diffResult.message ?? 'Git diff command failed.');
          }
          if (diffResult.outputTruncated) {
            throw new Error(
              'Staged git diff was truncated due to output buffer limits; unable to guarantee complete secret scanning.',
            );
          }
          return json(
            scanSecrets({
              content: diffResult.stdout,
              filePath: args.path ? `${args.path} (staged diff)` : 'staged diff',
              severityThreshold: args.severityThreshold as SecurityFindingSeverity | undefined,
              maxFiles: args.maxFiles,
            }),
          );
        }
        return json(
          scanSecrets({
            path: args.path,
            severityThreshold: args.severityThreshold as SecurityFindingSeverity | undefined,
            maxFiles: args.maxFiles,
          }),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'security_analyze_code',
    {
      description:
        'Analyze source code files or directories for static vulnerabilities: DOM XSS, unsafe execution, SSRF, and ReDoS.',
      inputSchema: {
        path: z.string().min(1).max(4096).optional().describe('Repository-rooted file or folder to analyze.'),
        severityThreshold: z
          .enum(['critical', 'high', 'medium', 'low', 'info'])
          .optional()
          .describe('Minimum severity threshold to report.'),
        maxFiles: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe('Maximum number of files to inspect (default 100).'),
      },
    },
    (args) => {
      try {
        return json(
          analyzeCode({
            path: args.path,
            severityThreshold: args.severityThreshold as SecurityFindingSeverity | undefined,
            maxFiles: args.maxFiles,
          }),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'security_audit_dependencies',
    {
      description:
        'Audit workspace dependencies and manifests for known CVEs, unpinned versions, and insecure transmission protocols.',
      inputSchema: {
        path: z
          .string()
          .min(1)
          .max(4096)
          .optional()
          .describe('Repository-rooted path, or entire workspace if omitted.'),
        severityThreshold: z
          .enum(['critical', 'high', 'medium', 'low', 'info'])
          .optional()
          .describe('Minimum severity threshold to report.'),
        runPnpmAudit: z.boolean().optional().describe('Whether to run pnpm audit check (defaults to true).'),
      },
    },
    (args) => {
      try {
        return json(
          auditDependencies({
            path: args.path,
            severityThreshold: args.severityThreshold as SecurityFindingSeverity | undefined,
            runPnpmAudit: args.runPnpmAudit,
          }),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'security_audit_supply_chain',
    {
      description:
        'Audit workspace package manifests for supply chain security risks: dangerous lifecycle scripts (preinstall/postinstall), divergent package versions across packages, and unverified tarballs.',
      inputSchema: {
        path: z
          .string()
          .min(1)
          .max(4096)
          .optional()
          .describe('Repository-rooted path, or entire workspace if omitted.'),
        severityThreshold: z
          .enum(['critical', 'high', 'medium', 'low', 'info'])
          .optional()
          .describe('Minimum severity threshold to report.'),
      },
    },
    (args) => {
      try {
        return json(
          auditSupplyChain({
            path: args.path,
            severityThreshold: args.severityThreshold as SecurityFindingSeverity | undefined,
          }),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'security_collect_compliance_evidence',
    {
      description:
        'Collect auditable security evidence and generate a compliance report mapped to ISO/IEC 27001:2022 Annex A controls, OWASP Top 10 (2025), and CWE Top 25.',
      inputSchema: {
        path: z
          .string()
          .min(1)
          .max(4096)
          .optional()
          .describe('Repository-rooted path, or entire workspace if omitted.'),
        format: z.enum(['json', 'markdown']).optional().describe('Output format: "json" (default) or "markdown".'),
        severityThreshold: z
          .enum(['critical', 'high', 'medium', 'low', 'info'])
          .optional()
          .describe('Minimum severity threshold to report.'),
        runPnpmAudit: z.boolean().optional().describe('Whether to run pnpm audit check (defaults to true).'),
        maxFiles: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe('Maximum number of files to inspect (default 100).'),
      },
    },
    (args) => {
      try {
        const report = collectComplianceEvidence({
          path: args.path,
          severityThreshold: args.severityThreshold as SecurityFindingSeverity | undefined,
          runPnpmAudit: args.runPnpmAudit,
          maxFiles: args.maxFiles,
        });
        if (args.format === 'markdown') {
          return text(formatComplianceMarkdown(report));
        }
        return json(report);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'security_audit_compliance',
    {
      description:
        'Audit repository compliance against ISO 27001, OWASP 2025, or CWE Top 25 standards, producing compliance scorecards and gap analyses.',
      inputSchema: {
        standard: z
          .enum(['all', 'iso-27001', 'owasp-2025', 'cwe-top25'])
          .optional()
          .describe('Compliance standard to audit: "all" (default), "iso-27001", "owasp-2025", or "cwe-top25".'),
        severityThreshold: z
          .enum(['critical', 'high', 'medium', 'low', 'info'])
          .optional()
          .describe('Minimum severity threshold to report.'),
        runPnpmAudit: z.boolean().optional().describe('Whether to run pnpm audit check (defaults to true).'),
        maxFiles: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe('Maximum number of files to inspect (default 100).'),
      },
    },
    (args) => {
      try {
        const report = collectComplianceEvidence({
          severityThreshold: args.severityThreshold as SecurityFindingSeverity | undefined,
          runPnpmAudit: args.runPnpmAudit,
          maxFiles: args.maxFiles,
        });

        return json(formatComplianceStandardReport(report, args.standard ?? 'all'));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Polymorphic Dispatchers ---------------------------------------------
  server.registerTool(
    'scaffold',
    {
      description:
        'Polymorphic scaffolding dispatcher for workspace members and package units. Supports entity types: component | composable | package | app | worker | crate | store | util. Dry-run unless apply=true.',
      inputSchema: scaffoldInputSchema,
    },
    (args) => {
      try {
        const result = dispatchScaffold(args);
        return json(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'i18n',
    {
      description:
        'Polymorphic localization dispatcher. Inspect, add, remove, or update YAML translation catalogues. Actions: list | coverage | add | remove | update.',
      inputSchema: i18nInputSchema,
    },
    (args) => {
      try {
        const result = dispatchI18n(args);
        return typeof result === 'string' ? text(result) : json(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'git_metadata',
    {
      description:
        'Polymorphic Git metadata inspection dispatcher. Query repository branches, tags, remotes, or ls-files.',
      inputSchema: gitMetadataInputSchema,
    },
    (args) => {
      try {
        return json(dispatchGitMetadata(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ---- Workspace Task Runners & Build Graph Intelligence --------------------
  server.registerTool(
    'repo_affected_packages',
    {
      description:
        'Analyze git changes or a diff ref to find affected workspace packages and detect root configuration modifications that impact the entire monorepo.',
      inputSchema: {
        ref: z
          .string()
          .max(512)
          .optional()
          .describe('Git revision or range to compare against (e.g. "main", "HEAD~1").'),
        path: z.string().min(1).max(4096).optional().describe('Filter changes to a specific subdirectory.'),
      },
    },
    (args) => {
      try {
        return json(getAffectedPackages(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'repo_prime_dependencies',
    {
      description:
        'Build upstream workspace dependencies for a target package using Turborepo (turbo run build --filter <pkg>^...). Essential for APFS-linked worktrees before running package tests.',
      inputSchema: {
        packageName: z.string().describe('Target package name, e.g. "@mission-platform/components" or "components".'),
        timeoutMs: z.number().int().min(10).max(180_000).optional(),
        maxOutputBytes: z.number().int().min(1).max(1_048_576).optional(),
      },
    },
    (args) => {
      try {
        return json(primeUpstreamDependencies(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'turbo_run',
    {
      description:
        'Execute a Turborepo task (e.g. build:check, lint, test, build) across packages with bounded timeouts and structured output parsing.',
      inputSchema: {
        task: z.string().describe('Turborepo task name (e.g. "build:check", "lint", "test", "build").'),
        filter: z
          .string()
          .optional()
          .describe('Turborepo package filter (e.g. "@mission-platform/components", "...[HEAD^1]").'),
        dry: z.boolean().optional().describe('Dry run task execution (adds --dry=json). Defaults to false.'),
        timeoutMs: z.number().int().min(10).max(180_000).optional(),
        maxOutputBytes: z.number().int().min(1).max(1_048_576).optional(),
      },
    },
    (args) => {
      try {
        return json(runTurboTask(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'run_test_file',
    {
      description:
        'Run an individual test file (*.spec.ts, *.test.ts) using vitest or node:test with bounded execution and optional test name filtering.',
      inputSchema: {
        filePath: z.string().min(1).max(4096).describe('Repository-relative path to the test file.'),
        testNamePattern: z.string().optional().describe('Optional test name filter (-t pattern in vitest).'),
        timeoutMs: z.number().int().min(10).max(120_000).optional(),
        maxOutputBytes: z.number().int().min(1).max(1_048_576).optional(),
      },
    },
    (args) => {
      try {
        return json(runTestFile(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'list_stories',
    {
      description:
        'Discover and inspect Storybook stories (*.stories.tsx) across workspace packages or for a specific component.',
      inputSchema: {
        component: z.string().optional().describe('Filter by component name (e.g. "button", "modal").'),
        package: z.string().optional().describe('Filter by package folder (e.g. "components", "email-components").'),
        limit: z.number().int().min(1).max(500).optional().describe('Maximum story files to return (default 100).'),
      },
    },
    (args) => {
      try {
        return json(listStories(args));
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
