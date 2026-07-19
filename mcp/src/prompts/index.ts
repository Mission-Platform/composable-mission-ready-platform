/**
 * Prompt definitions. Each prompt returns a ready-to-run instruction message
 * that embeds the relevant curated guide, so an AI assistant can be dropped
 * straight into one of the seven Mission Platform workflows.
 */
import { getComponentUsage, listComponents } from '../repo/components.ts';
import { getGuide, type GuideId } from '../knowledge/guides.ts';
import { listGroup } from '../repo/scanner.ts';
import type { McpServer } from '../protocol/server.ts';
import type { PromptDefinition, PromptResult } from '../protocol/types.ts';

function userMessage(textBody: string): PromptResult {
  return { messages: [{ role: 'user', content: { type: 'text', text: textBody } }] };
}

function guideBody(id: GuideId): string {
  return getGuide(id)?.body ?? '';
}

const PROMPTS: PromptDefinition[] = [
  {
    name: 'use-component',
    description: 'Guide the assistant to correctly use a Mission Platform component in an app.',
    arguments: [
      { name: 'component', description: 'Component name or slug, e.g. "BaseButton".', required: false },
      { name: 'framework', description: 'Target framework: "vue" or "react". Defaults to vue.', required: false },
    ],
    build(args) {
      const framework = (args['framework'] ?? 'vue').toLowerCase() === 'react' ? 'react' : 'vue';
      const component = args['component'];
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
  },
  {
    name: 'create-package',
    description: 'Guide the assistant to create a new package in packages/.',
    arguments: [
      { name: 'name', description: 'Kebab-case package name.', required: false },
      { name: 'purpose', description: 'What the package should do.', required: false },
    ],
    build(args) {
      const name = args['name'] ?? '<name>';
      const purpose = args['purpose'] ?? '(describe the package purpose)';
      return userMessage(
        `${guideBody('package-creation')}\n\n---\nTask: Create the package \`@mission-platform/${name}\`.\nPurpose: ${purpose}\n\nUse the \`scaffold_package\` tool (dry-run first, then apply=true), then wire up the real implementation and update \`llms.txt\`.`,
      );
    },
  },
  {
    name: 'develop-package',
    description: 'Guide the assistant to develop or extend an existing package.',
    arguments: [{ name: 'name', description: 'Package folder or scoped name.', required: false }],
    build(args) {
      const name = args['name'];
      const known = listGroup('packages')
        .map((member) => member.name)
        .join(', ');
      return userMessage(
        `${guideBody('package-development')}\n\n---\n${name ? `Target package: ${name}.` : `Existing packages: ${known}.`}\nTask: Implement the requested change, keep the public API in \`src/index.ts\`, add/adjust tests and stories, update \`llms.txt\`, and add a changeset.`,
      );
    },
  },
  {
    name: 'create-app',
    description: 'Guide the assistant to create a new application in apps/.',
    arguments: [
      { name: 'name', description: 'Kebab-case app name.', required: false },
      { name: 'purpose', description: 'What the app should do.', required: false },
    ],
    build(args) {
      const name = args['name'] ?? '<name>';
      const purpose = args['purpose'] ?? '(describe the app purpose)';
      return userMessage(
        `${guideBody('app-creation')}\n\n---\nTask: Create the app \`@mission-platform/${name}\`.\nPurpose: ${purpose}\n\nUse the \`scaffold_app\` tool (dry-run first, then apply=true), then compose the needed packages.`,
      );
    },
  },
  {
    name: 'develop-app',
    description: 'Guide the assistant to develop an existing application.',
    arguments: [{ name: 'name', description: 'App folder or scoped name.', required: false }],
    build(args) {
      const name = args['name'];
      const known = listGroup('apps')
        .map((member) => member.name)
        .join(', ');
      return userMessage(
        `${guideBody('app-development')}\n\n---\n${name ? `Target app: ${name}.` : `Existing apps: ${known}.`}\nTask: Implement the requested feature by composing packages; put reusable logic in a package, not the app.`,
      );
    },
  },
  {
    name: 'create-worker',
    description: 'Guide the assistant to create a new Cloudflare Worker in workers/.',
    arguments: [
      { name: 'name', description: 'Kebab-case worker name.', required: false },
      { name: 'purpose', description: 'What the worker should do.', required: false },
    ],
    build(args) {
      const name = args['name'] ?? '<name>';
      const purpose = args['purpose'] ?? '(describe the worker purpose)';
      return userMessage(
        `${guideBody('worker-creation')}\n\n---\nTask: Create the worker \`@mission-platform/${name}\`.\nPurpose: ${purpose}\n\nUse the \`scaffold_worker\` tool (dry-run first, then apply=true), then implement the \`fetch\` handler.`,
      );
    },
  },
  {
    name: 'develop-worker',
    description: 'Guide the assistant to develop an existing Cloudflare Worker.',
    arguments: [{ name: 'name', description: 'Worker folder or scoped name.', required: false }],
    build(args) {
      const name = args['name'];
      const known = listGroup('workers')
        .map((member) => member.name)
        .join(', ');
      return userMessage(
        `${guideBody('worker-development')}\n\n---\n${name ? `Target worker: ${name}.` : `Existing workers: ${known}.`}\nTask: Implement the requested change in the typed \`fetch\` handler; keep the worker thin and share logic via packages.`,
      );
    },
  },
];

export function registerPrompts(server: McpServer): void {
  for (const prompt of PROMPTS) {
    server.registerPrompt(prompt);
  }
}

export { PROMPTS };
