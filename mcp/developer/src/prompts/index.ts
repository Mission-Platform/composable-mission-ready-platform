/**
 * Prompt definitions using `@modelcontextprotocol/sdk`.
 * Each prompt returns a ready-to-run instruction message that embeds the
 * relevant curated guide, so an AI assistant can be dropped straight into one
 * of the seven Mission Platform workflows.
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
            ? `Target component: ${usage.componentName} (${usage.slug}).\nImport: ${framework === 'react' ? usage.reactImport : usage.vueImport}\nProps:\n${usage.propsInterface ?? '(props interface not found — inspect the source)'}`
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
      description: 'Guide the assistant to create a new Cloudflare Worker in workers/.',
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
      const known = listGroup('workers')
        .map((member) => member.name)
        .join(', ');
      return userMessage(
        `${guideBody('worker-development')}\n\n---\n${name ? `Target worker: ${name}.` : `Existing workers: ${known}.`}\nTask: Implement the requested change in the typed \`fetch\` handler; keep the worker thin and share logic via packages.`,
      );
    },
  );
}
