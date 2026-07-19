/**
 * Resource definitions. Resources are read-only reference material addressable
 * by URI: the curated guides, the live workspace inventory, and the raw
 * repository documentation under `docs/`.
 */
import { allGuides } from '../knowledge/guides.ts';
import { listComponents } from '../repo/components.ts';
import { listDocs, listGroup, readDoc } from '../repo/scanner.ts';
import type { McpServer } from '../protocol/server.ts';
import type { ResourceDefinition } from '../protocol/types.ts';

function inventory(): string {
  const groups = (['packages', 'apps', 'workers', 'vite-plugins', 'configs'] as const).map((group) => ({
    group,
    members: listGroup(group).map((member) => ({
      name: member.name,
      version: member.version,
      description: member.description,
    })),
  }));
  return JSON.stringify(
    {
      groups,
      components: listComponents().map((component) => component.slug),
    },
    null,
    2,
  );
}

function buildResources(): ResourceDefinition[] {
  const resources: ResourceDefinition[] = [];

  // Curated guides.
  for (const guide of allGuides()) {
    resources.push({
      uri: `mission://guide/${guide.id}`,
      name: `Guide: ${guide.title}`,
      description: `Curated Mission Platform guidance — ${guide.title}.`,
      mimeType: 'text/markdown',
      read: () => guide.body,
    });
  }

  // Live workspace inventory.
  resources.push({
    uri: 'mission://inventory',
    name: 'Workspace inventory',
    description: 'Live inventory of every workspace member and component in the monorepo.',
    mimeType: 'application/json',
    read: () => inventory(),
  });

  // Raw repository docs.
  for (const doc of listDocs()) {
    resources.push({
      uri: `mission://docs/${doc.slug}`,
      name: `Docs: ${doc.slug}`,
      description: `Repository documentation: docs/${doc.slug}.md`,
      mimeType: 'text/markdown',
      read: () => readDoc(doc.slug) ?? '',
    });
  }

  return resources;
}

export function registerResources(server: McpServer): void {
  // The provider is evaluated lazily on each `resources/list`, so the inventory
  // and docs always reflect the current state of the repository.
  server.registerResourceProvider({ list: () => buildResources() });
}

export { buildResources };
