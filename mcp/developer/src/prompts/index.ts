/**
 * Prompt definitions using `@modelcontextprotocol/sdk`.
 * Each prompt returns a ready-to-run instruction message that embeds the
 * relevant curated guide, so an AI assistant can be dropped straight into one
 * of the Mission Platform workflows.
 */

import { getGuide, type GuideId } from '@mission-platform/mcp-shared/knowledge/guides';
import { getComponentUsage, listComponents } from '@mission-platform/mcp-shared/repo/components';
import { listGroup } from '@mission-platform/mcp-shared/repo/scanner';
import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

function userMessage(textBody: string) {
  return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text: textBody } }] };
}

function guideBody(id: GuideId): string {
  return getGuide(id)?.body ?? '';
}

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'fws-authoring',
    {
      description: 'Guide an assistant to author statically typed, ownership-safe Forge Web Script (FWS).',
      argsSchema: {
        task: z.string().optional().describe('The FWS feature or function to author.'),
      },
    },
    (args) =>
      userMessage(
        `${guideBody('fws-authoring')}\n\n---\nTask: Author FWS for ${args.task ?? '(the requested behavior)'}. Keep types, ownership, pointer-length contracts, and explicit capabilities visible. Run fws_analyze_source before proposing release code.`,
      ),
  );

  server.registerPrompt(
    'fws-secure-review',
    {
      description: 'Review FWS source and capability boundaries using canonical security findings.',
      argsSchema: {
        sourcePath: z.string().optional().describe('Repository-rooted .fws path, if known.'),
      },
    },
    (args) =>
      userMessage(
        `${guideBody('fws-security')}\n\n---\nTask: Perform a conservative FWS security review${args.sourcePath ? ` of \`${args.sourcePath}\`` : ''}. Use fws_analyze_source or fws_analyze_workspace, report stable findings with evidence and remediation, and distinguish compiler guarantees from host responsibilities. Do not execute source or call ambient capabilities.`,
      ),
  );

  server.registerPrompt(
    'fws-compile-verify',
    {
      description: 'Guide the analyze, compile, and Wasm artifact verification workflow for FWS release output.',
      argsSchema: {
        sourcePath: z.string().optional().describe('Repository-rooted .fws path, if known.'),
        profile: z.enum(['development', 'strict']).optional().describe('Analysis policy profile (strict for release).'),
      },
    },
    (args) =>
      userMessage(
        `${guideBody('fws-artifact-verification')}\n\n---\nTask: Compile and verify FWS${args.sourcePath ? ` from \`${args.sourcePath}\`` : ''} under the ${args.profile ?? 'strict'} policy. First run canonical analysis, then compile, inspect the manifest, and run fws_verify_artifact on every returned Wasm variant. Do not treat WebAssembly.validate alone as sufficient and never bypass a blocking finding.`,
      ),
  );

  server.registerPrompt(
    'fws-forensic-debug',
    {
      description: 'Interpret bounded, redacted FWS forensic traces without enabling arbitrary execution.',
      argsSchema: {
        sourcePath: z.string().optional().describe('Repository-rooted .fws path, if known.'),
        replayId: z.string().optional().describe('Stable replay identifier.'),
      },
    },
    (args) =>
      userMessage(
        `${guideBody('fws-forensics')}\n\n---\nTask: Investigate the FWS behavior${args.sourcePath ? ` from \`${args.sourcePath}\`` : ''}${args.replayId ? ` for replay \`${args.replayId}\`` : ''}. Use fws_run_trace only with its bounded capability-denied self-hosted probe, interpret source locations, caps, traps, and hashes, and propose remediation after analysis. Do not request arbitrary commands, Wasm instantiation, host imports, secrets, or unrestricted snapshots.`,
      ),
  );

  server.registerPrompt(
    'debug-code',
    {
      description: 'Guide evidence-first debugging of a TypeScript, Vue, FWS, or configuration file.',
      argsSchema: {
        filePath: z.string().optional().describe('Repository-rooted file path, if known.'),
        languageId: z.string().optional().describe('Configured language-server identifier, if known.'),
        issue: z.string().optional().describe('Observed failure or symptom.'),
      },
    },
    (args) =>
      userMessage(
        [
          `Task: Debug ${args.filePath ? `the file ${args.filePath}` : 'the reported code'}.`,
          ...(args.issue ? [`Observed issue: ${args.issue}`] : []),
          '',
          'Start read-only. Use git_changed_files, lsp_debug_context, and lsp_get_diagnostics to establish evidence before editing.',
          'Inspect definitions, callers, related tests, and the smallest relevant diff; state the likely root cause and a falsifiable hypothesis.',
          'After an approved fix, use lsp_review_structure, lsp_run_build, and lsp_run_tests as appropriate, then report remaining uncertainty.',
          ...(args.languageId ? [`Prefer the ${args.languageId} language server.`] : []),
        ].join('\n'),
      ),
  );

  server.registerPrompt(
    'review-changes',
    {
      description: 'Guide a bounded, evidence-based review of current Git changes.',
      argsSchema: {
        ref: z.string().optional().describe('Optional base revision for the diff.'),
        path: z.string().optional().describe('Optional repository-rooted path to review.'),
        languageId: z.string().optional().describe('Configured language-server identifier, if available.'),
      },
    },
    (args) =>
      userMessage(
        [
          `Task: Review the current changes${args.path ? ` under ${args.path}` : ''}${args.ref ? ` against ${args.ref}` : ''}.`,
          '',
          'Begin with review_changes and treat git_changed_files as the authoritative changed-file list.',
          'Review behavior, regressions, error handling, security, API compatibility, dependency direction, tests, and documentation/changeset requirements.',
          `Use lsp_get_diagnostics or aggregated LSP evidence when ${args.languageId ?? 'a languageId'} is available.`,
          'Report findings by severity with file/line evidence, then list validation gaps separately; do not make edits or commits during the review.',
        ].join('\n'),
      ),
  );

  server.registerPrompt(
    'security-audit',
    {
      description: 'Audit repository changes or specific paths for secrets, code vulnerabilities, and dependency CVEs.',
      argsSchema: {
        path: z.string().optional().describe('Repository-rooted path to scan, or entire workspace if omitted.'),
        staged: z.boolean().optional().describe('Whether to check only staged git changes.'),
        severityThreshold: z
          .enum(['critical', 'high', 'medium', 'low', 'info'])
          .optional()
          .describe('Minimum severity threshold for findings.'),
      },
    },
    (args) =>
      userMessage(
        `${guideBody('security-analysis' as GuideId)}\n\n---\nTask: Perform a comprehensive security audit${args.path ? ` under \`${args.path}\`` : ''}. Run security_scan_secrets, security_analyze_code, security_audit_dependencies, security_audit_supply_chain, and security_collect_compliance_evidence. Report all identified findings categorized by severity, with OWASP 2025 Top 10, CWE Top 25, and ISO 27001 mappings, code snippets, and remediation instructions. Do not bypass or downplay any critical or high findings.`,
      ),
  );

  server.registerPrompt(
    'review-structure',
    {
      description: 'Guide structural review of a source file and its test coverage.',
      argsSchema: {
        filePath: z.string().optional().describe('Repository-rooted source file, if known.'),
        languageId: z.string().optional().describe('Configured language-server identifier, if known.'),
      },
    },
    (args) =>
      userMessage(
        [
          `Task: Review the structure of ${args.filePath || 'the target source file'}.`,
          '',
          'Use lsp_review_structure before proposing refactors.',
          'Describe public symbols, responsibilities, dependencies, error boundaries, ownership/lifecycle concerns, and related tests; distinguish observed facts from recommendations.',
          'Check whether shared logic belongs in packages/ rather than an app, and preserve TypeScript, package-boundary, Storybook, and changeset conventions.',
          ...(args.languageId ? [`Prefer the ${args.languageId} language server.`] : []),
        ].join('\n'),
      ),
  );

  server.registerPrompt(
    'use-component',
    {
      description: 'Guide the assistant to correctly use a Mission Platform component in an app.',
      argsSchema: {
        component: z.string().optional().describe('Component name or slug, e.g. "ForgeButton".'),
        framework: z.string().optional().describe('Target framework: "vue" or "react". Defaults to vue.'),
      },
    },
    (args) => {
      const framework = (args.framework ?? 'vue').toLowerCase() === 'react' ? 'react' : 'vue';
      const component = args.component;
      const parts = [guideBody('component-usage')];
      if (component) {
        const usage = getComponentUsage(component);
        parts.push(
          '\n---\n',
          usage
            ? `Target component: ${usage.componentName} (${usage.slug}).\nImport: ${usage.importStatement}\nThe specifier carries no framework segment: the ${framework} build is selected by the app's \`mp:${framework}\` export condition.\nProps:\n${usage.propsInterface ?? '(props interface not found — inspect the source)'}`
            : `No component matched "${component}". Available components:\n${listComponents()
                .map((entry) => entry.slug)
                .join(', ')}`,
        );
      }
      parts.push(
        `\n---\nTask: Show idiomatic ${framework} code that uses the component above, following Mission Platform conventions.`,
      );
      return userMessage(parts.join('\n'));
    },
  );

  server.registerPrompt(
    'create-package',
    {
      description: 'Guide the assistant to create a new package in packages/.',
      argsSchema: {
        name: z.string().optional().describe('Kebab-case package name.'),
        purpose: z.string().optional().describe('What the package should do.'),
      },
    },
    (args) => {
      const name = args.name ?? '<name>';
      const purpose = args.purpose ?? '(describe the package purpose)';
      return userMessage(
        `${guideBody('package-creation')}\n\n---\nTask: Create the package \`@mission-platform/${name}\`.\nPurpose: ${purpose}\n\nUse the \`scaffold_package\` tool (dry-run first, then apply=true), then wire up the real implementation and update \`llms.txt\`.`,
      );
    },
  );

  server.registerPrompt(
    'develop-package',
    {
      description: 'Guide the assistant to develop or extend an existing package.',
      argsSchema: {
        name: z.string().optional().describe('Package folder or scoped name.'),
      },
    },
    (args) => {
      const name = args.name;
      const known = listGroup('packages')
        .map((member) => member.name)
        .join(', ');
      return userMessage(
        `${guideBody('package-development')}\n\n---\n${name ? `Target package: ${name}.` : `Existing packages: ${known}.`}\nTask: Implement the requested change, keep the public API in \`src/index.ts\`, add/adjust tests and stories, update \`llms.txt\`, and add a changeset.`,
      );
    },
  );

  server.registerPrompt(
    'create-app',
    {
      description: 'Guide the assistant to create a new application in apps/.',
      argsSchema: {
        name: z.string().optional().describe('Kebab-case app name.'),
        purpose: z.string().optional().describe('What the app should do.'),
      },
    },
    (args) => {
      const name = args.name ?? '<name>';
      const purpose = args.purpose ?? '(describe the app purpose)';
      return userMessage(
        `${guideBody('app-creation')}\n\n---\nTask: Create the app \`@mission-platform/${name}\`.\nPurpose: ${purpose}\n\nUse the \`scaffold_app\` tool (dry-run first, then apply=true), then compose the needed packages.`,
      );
    },
  );

  server.registerPrompt(
    'develop-app',
    {
      description: 'Guide the assistant to develop an existing application.',
      argsSchema: {
        name: z.string().optional().describe('App folder or scoped name.'),
      },
    },
    (args) => {
      const name = args.name;
      const known = listGroup('apps')
        .map((member) => member.name)
        .join(', ');
      return userMessage(
        `${guideBody('app-development')}\n\n---\n${name ? `Target app: ${name}.` : `Existing apps: ${known}.`}\nTask: Implement the requested feature by composing packages; put reusable logic in a package, not the app.`,
      );
    },
  );

  server.registerPrompt(
    'create-worker',
    {
      description: 'Guide the assistant to create a new Cloudflare Worker in packages/edge/workers/.',
      argsSchema: {
        name: z.string().optional().describe('Kebab-case worker name.'),
        purpose: z.string().optional().describe('What the worker should do.'),
      },
    },
    (args) => {
      const name = args.name ?? '<name>';
      const purpose = args.purpose ?? '(describe the worker purpose)';
      return userMessage(
        `${guideBody('worker-creation')}\n\n---\nTask: Create the worker \`@mission-platform/${name}\`.\nPurpose: ${purpose}\n\nUse the \`scaffold_worker\` tool (dry-run first, then apply=true), then implement the \`fetch\` handler.`,
      );
    },
  );

  server.registerPrompt(
    'develop-worker',
    {
      description: 'Guide the assistant to develop an existing Cloudflare Worker.',
      argsSchema: {
        name: z.string().optional().describe('Worker folder or scoped name.'),
      },
    },
    (args) => {
      const name = args.name;
      const known = listGroup('edge-workers')
        .map((member) => member.name)
        .join(', ');
      return userMessage(
        `${guideBody('worker-development')}\n\n---\n${name ? `Target worker: ${name}.` : `Existing workers: ${known}.`}\nTask: Implement the requested change in the typed \`fetch\` handler; keep the worker thin and share logic via packages.`,
      );
    },
  );
}
