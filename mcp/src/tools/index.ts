/**
 * Tool definitions exposed to MCP clients using `@modelcontextprotocol/sdk`.
 * Tools are grouped by the seven workflows this server assists with: component
 * usage, and the creation and development of packages, apps and workers, plus
 * cross-cutting discovery.
 */
import { z } from 'zod';

import { getGuide, GUIDE_IDS } from '../knowledge/guides.ts';
import { appFiles, crateFiles, packageFiles, workerFiles } from '../knowledge/templates.ts';
import { getComponentUsage, listComponents } from '../repo/components.ts';
import { findMember, listDocs, listGroup, readDoc as readDocument, readMemberDetails } from '../repo/scanner.ts';
import { writeScaffold } from '../scaffold/writer.ts';

import type { WorkspaceGroup } from '../repo/paths.ts';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

function text(value: string) {
  return { content: [{ type: 'text' as const, text: value }] };
}

function json(value: unknown) {
  return text(JSON.stringify(value, null, 2));
}

export function registerTools(server: McpServer): void {
  // ---- Discovery & guidance -------------------------------------------------
  server.registerTool(
    'get_guide',
    {
      description:
        'Return a curated, repository-specific guide for a Mission Platform workflow (component usage, package/app/worker creation & development, conventions, overview).',
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
        'Read a single repository document by its slug (see `list_docs`), e.g. "best-practices" or "configs/eslint-config".',
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

  // ---- Component usage ------------------------------------------------------
  server.registerTool(
    'list_components',
    {
      description: 'List every component in @mission-platform/components with its exported symbols.',
      inputSchema: {
        filter: z.string().optional().describe('Optional substring to filter component slugs.'),
      },
    },
    async (args) => {
      const filter = args.filter?.trim().toLowerCase();
      const components = listComponents().filter((component) => !filter || component.slug.includes(filter));
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
        component: z.string().describe('Component name or slug, e.g. "BaseButton" or "base-button".'),
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
      description: 'List all Cloudflare Workers in workers/.',
      inputSchema: {},
    },
    async () => {
      return json(
        listGroup('workers').map((member) => ({
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
        group: z
          .enum(['packages', 'apps', 'workers', 'vite-plugins', 'configs', 'crates'])
          .describe('Workspace group.'),
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
        'Generate a convention-compliant workers/<name> Cloudflare Worker skeleton (private manifest, tsconfig set, shared configs, typed fetch handler). Dry-run unless apply=true.',
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
        const result = writeScaffold({ group: 'workers', name, files, apply: args.apply === true });
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
        return {
          content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
          isError: true,
        };
      }
    },
  );
}
