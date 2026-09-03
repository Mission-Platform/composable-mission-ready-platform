/**
 * Resource definitions using `@modelcontextprotocol/sdk`.
 * Resources are read-only reference material addressable by URI: the curated
 * guides, the live workspace inventory, and the raw repository documentation
 * under `docs/`.
 */

import {allGuides} from '../knowledge/guides.ts';
import {listComponents} from '../repo/components.ts';
import {listDocs, listGroup, readDoc as readDocument} from '../repo/scanner.ts';

import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

function inventory(): string {
  const groups = (['packages', 'apps', 'crates'] as const).map((group) => ({
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

export function registerResources(server: McpServer): void {
  // Curated guides.
  for (const guide of allGuides()) {
    server.registerResource(
      `guide-${guide.id}`,
      `mission://guide/${guide.id}`,
      {
        title: `Guide: ${guide.title}`,
        description: `Curated Mission Platform guidance — ${guide.title}.`,
        mimeType: 'text/markdown',
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            name: `Guide: ${guide.title}`,
            description: `Curated Mission Platform guidance — ${guide.title}.`,
            mimeType: 'text/markdown',
            text: guide.body,
          },
        ],
      }),
    );
  }

  // Live workspace inventory.
  server.registerResource(
    'inventory',
    'mission://inventory',
    {
      title: 'Workspace inventory',
      description: 'Live inventory of every workspace member and component in the monorepo.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          name: 'Workspace inventory',
          description: 'Live inventory of every workspace member and component in the monorepo.',
          mimeType: 'application/json',
          text: inventory(),
        },
      ],
    }),
  );

  // Raw repository docs.
  for (const document of listDocs()) {
    server.registerResource(
      `docs-${document.slug}`,
      `mission://docs/${document.slug}`,
      {
        title: `Docs: ${document.slug}`,
        description: `Repository documentation: docs/${document.slug}.md`,
        mimeType: 'text/markdown',
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            name: `Docs: ${document.slug}`,
            description: `Repository documentation: docs/${document.slug}.md`,
            mimeType: 'text/markdown',
            text: readDocument(document.slug) ?? '',
          },
        ],
      }),
    );
  }
}
