import type { IconSymbolDefinition, IconSvgNode } from './types';

function serializeAttributes(attributes: Readonly<Record<string, string | number>> = {}): string {
  return Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${escapeAttribute(String(value))}"`)
    .join('');
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function serializeNode(node: IconSvgNode): string {
  const children = node.children?.map((child) => serializeNode(child)).join('') ?? '';
  return `<${node.element}${serializeAttributes(node.attributes)}>${children}</${node.element}>`;
}

export function serializeSymbol(definition: IconSymbolDefinition): string {
  const content = [
    ...definition.nodes.map((node) => serializeNode(node)),
    ...(definition.uses ?? []).map(
      (use) =>
        `<use href="#${escapeAttribute(use.symbolId)}"${serializeAttributes({
          ...(use.transform ? { transform: use.transform } : {}),
          ...use.properties,
        })} />`,
    ),
  ].join('');
  return `<symbol id="${escapeAttribute(definition.id)}" viewBox="${escapeAttribute(definition.viewBox)}">${content}</symbol>`;
}

export function serializeSprite(definitions: readonly IconSymbolDefinition[]): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '<defs>',
    definitions.map((definition) => serializeSymbol(definition)).join(''),
    '</defs>',
    '</svg>',
  ].join('');
}
