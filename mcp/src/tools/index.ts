/**
 * Tool definitions exposed to MCP clients. Tools are grouped by the seven
 * workflows this server assists with: component usage, and the creation and
 * development of packages, apps and workers, plus cross-cutting discovery.
 */
import { getGuide, GUIDE_IDS } from '../knowledge/guides.ts';
import { appFiles, packageFiles, workerFiles } from '../knowledge/templates.ts';
import { getComponentUsage, listComponents } from '../repo/components.ts';
import { findMember, listDocs, listGroup, readDoc, readMemberDetails } from '../repo/scanner.ts';
import type { WorkspaceGroup } from '../repo/paths.ts';
import { writeScaffold } from '../scaffold/writer.ts';
import type { McpServer } from '../protocol/server.ts';
import type { ToolDefinition, ToolResult } from '../protocol/types.ts';

function text(value: string): ToolResult {
  return { content: [{ type: 'text', text: value }] };
}

function json(value: unknown): ToolResult {
  return text(JSON.stringify(value, null, 2));
}

function getString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getBoolean(args: Record<string, unknown>, key: string): boolean {
  return args[key] === true;
}

const TOOLS: ToolDefinition[] = [
  // ---- Discovery & guidance -------------------------------------------------
  {
    name: 'get_guide',
    description:
      'Return a curated, repository-specific guide for a Mission Platform workflow (component usage, package/app/worker creation & development, conventions, overview).',
    inputSchema: {
      type: 'object',
      properties: {
        area: { type: 'string', enum: GUIDE_IDS, description: 'The workflow to explain.' },
      },
      required: ['area'],
    },
    handler(args) {
      const area = getString(args, 'area');
      if (!area) {
        return text('Provide an "area". One of: ' + GUIDE_IDS.join(', '));
      }
      const guide = getGuide(area);
      if (!guide) {
        return text(`Unknown area "${area}". One of: ${GUIDE_IDS.join(', ')}`);
      }
      return text(guide.body);
    },
  },
  {
    name: 'list_docs',
    description: 'List the Markdown documents available under the repository `docs/` directory.',
    inputSchema: { type: 'object', properties: {} },
    handler() {
      return json(listDocs().map((doc) => doc.slug));
    },
  },
  {
    name: 'read_doc',
    description:
      'Read a single repository document by its slug (see `list_docs`), e.g. "best-practices" or "configs/eslint-config".',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Document slug from `list_docs`.' } },
      required: ['slug'],
    },
    handler(args) {
      const slug = getString(args, 'slug');
      if (!slug) {
        return text('Provide a document "slug" (see the list_docs tool).');
      }
      const doc = readDoc(slug);
      return doc ? text(doc) : text(`No document with slug "${slug}". Use list_docs to see available slugs.`);
    },
  },
  {
    name: 'search_docs',
    description:
      'Case-insensitive search across all repository docs. Returns matching documents with the lines that matched.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Text to search for.' } },
      required: ['query'],
    },
    handler(args) {
      const query = getString(args, 'query');
      if (!query) {
        return text('Provide a "query" to search for.');
      }
      const needle = query.toLowerCase();
      const hits: { slug: string; matches: string[] }[] = [];
      for (const doc of listDocs()) {
        const body = readDoc(doc.slug) ?? '';
        const matches = body
          .split('\n')
          .filter((line) => line.toLowerCase().includes(needle))
          .slice(0, 8)
          .map((line) => line.trim());
        if (matches.length > 0) {
          hits.push({ slug: doc.slug, matches });
        }
      }
      return hits.length > 0 ? json(hits) : text(`No matches for "${query}".`);
    },
  },

  // ---- Component usage ------------------------------------------------------
  {
    name: 'list_components',
    description: 'List every component in @mission-platform/components with its exported symbols.',
    inputSchema: {
      type: 'object',
      properties: { filter: { type: 'string', description: 'Optional substring to filter component slugs.' } },
    },
    handler(args) {
      const filter = getString(args, 'filter')?.toLowerCase();
      const components = listComponents().filter((component) => !filter || component.slug.includes(filter));
      if (components.length === 0) {
        return text(filter ? `No components match "${filter}".` : 'No components found.');
      }
      return json(components);
    },
  },
  {
    name: 'get_component_usage',
    description:
      'Describe how to use a component: its exported symbols, props interface, doc comment, available Storybook stories, and Vue/React import snippets.',
    inputSchema: {
      type: 'object',
      properties: {
        component: { type: 'string', description: 'Component name or slug, e.g. "BaseButton" or "base-button".' },
      },
      required: ['component'],
    },
    handler(args) {
      const component = getString(args, 'component');
      if (!component) {
        return text('Provide a "component" name or slug (see list_components).');
      }
      const usage = getComponentUsage(component);
      if (!usage) {
        return text(`No component "${component}". Use list_components to see available components.`);
      }
      const sections = [
        `# ${usage.componentName}  (\`${usage.slug}\`)`,
        `Exports: ${usage.exports.join(', ')}`,
        `Stories: ${usage.stories.length > 0 ? usage.stories.join(', ') : 'none found'}`,
        '',
        '## Import',
        '```ts',
        `// Vue\n${usage.vueImport}`,
        `// React\n${usage.reactImport}`,
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
  },

  // ---- Inventory ------------------------------------------------------------
  {
    name: 'list_packages',
    description: 'List all packages in packages/ with name, version and description.',
    inputSchema: { type: 'object', properties: {} },
    handler() {
      return json(
        listGroup('packages').map((member) => ({
          name: member.name,
          version: member.version,
          description: member.description,
        })),
      );
    },
  },
  {
    name: 'list_apps',
    description: 'List all applications in apps/.',
    inputSchema: { type: 'object', properties: {} },
    handler() {
      return json(
        listGroup('apps').map((member) => ({
          name: member.name,
          version: member.version,
          description: member.description,
        })),
      );
    },
  },
  {
    name: 'list_workers',
    description: 'List all Cloudflare Workers in workers/.',
    inputSchema: { type: 'object', properties: {} },
    handler() {
      return json(
        listGroup('workers').map((member) => ({
          name: member.name,
          version: member.version,
          description: member.description,
        })),
      );
    },
  },
  {
    name: 'get_member_info',
    description:
      'Get detailed info for a workspace member: its manifest scripts and dependencies, plus its llms.txt/README when present.',
    inputSchema: {
      type: 'object',
      properties: {
        group: {
          type: 'string',
          enum: ['packages', 'apps', 'workers', 'vite-plugins', 'configs'],
          description: 'Workspace group.',
        },
        name: { type: 'string', description: 'Folder name or scoped package name.' },
      },
      required: ['group', 'name'],
    },
    handler(args) {
      const group = getString(args, 'group') as WorkspaceGroup | undefined;
      const name = getString(args, 'name');
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
  },

  // ---- Scaffolding ----------------------------------------------------------
  {
    name: 'scaffold_package',
    description:
      'Generate a convention-compliant packages/<name> skeleton (manifest, tsconfig set, shared configs, vite/vitest/turbo config, src barrel, spec, llms.txt, docs). Dry-run unless apply=true.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Kebab-case package name, e.g. "date-utils".' },
        description: { type: 'string', description: 'Short package description.' },
        vue: {
          type: 'boolean',
          description: 'Set true if the package ships Vue components (adds stylelint + vue deps). Defaults to false.',
        },
        apply: { type: 'boolean', description: 'Write files to disk. Defaults to false (dry run).' },
      },
      required: ['name'],
    },
    handler(args) {
      const name = getString(args, 'name');
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      const files = packageFiles({
        name,
        description: getString(args, 'description') ?? '',
        vue: getBoolean(args, 'vue'),
      });
      const result = writeScaffold({ group: 'packages', name, files, apply: getBoolean(args, 'apply') });
      return json(result);
    },
  },
  {
    name: 'scaffold_app',
    description:
      'Generate a convention-compliant apps/<name> Vite + Vue 3 skeleton (private manifest, tsconfig set, shared configs, vite/turbo config, index.html, src entry). Dry-run unless apply=true.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Kebab-case app name, e.g. "admin-portal".' },
        description: { type: 'string', description: 'Short app description.' },
        apply: { type: 'boolean', description: 'Write files to disk. Defaults to false (dry run).' },
      },
      required: ['name'],
    },
    handler(args) {
      const name = getString(args, 'name');
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      const files = appFiles({ name, description: getString(args, 'description') ?? '' });
      const result = writeScaffold({ group: 'apps', name, files, apply: getBoolean(args, 'apply') });
      return json(result);
    },
  },
  {
    name: 'scaffold_worker',
    description:
      'Generate a convention-compliant workers/<name> Cloudflare Worker skeleton (private manifest, tsconfig set, shared configs, typed fetch handler). Dry-run unless apply=true.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Kebab-case worker name, e.g. "asset-proxy".' },
        description: { type: 'string', description: 'Short worker description.' },
        apply: { type: 'boolean', description: 'Write files to disk. Defaults to false (dry run).' },
      },
      required: ['name'],
    },
    handler(args) {
      const name = getString(args, 'name');
      if (!name) {
        return text('Provide a kebab-case "name".');
      }
      const files = workerFiles({ name, description: getString(args, 'description') ?? '' });
      const result = writeScaffold({ group: 'workers', name, files, apply: getBoolean(args, 'apply') });
      return json(result);
    },
  },
];

export function registerTools(server: McpServer): void {
  for (const tool of TOOLS) {
    server.registerTool(tool);
  }
}

export { TOOLS };
