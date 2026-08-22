import { createForgeDiagnostic, type ForgeDiagnostic } from '../model/diagnostics';

import { validateRepositoryRelativePath } from './paths';

import type { ForgeDesignDocument, ForgeDesignNode } from '../model/design';

function diagnostic(message: string, feature: string, code: string, node?: ForgeDesignNode): ForgeDiagnostic {
  return createForgeDiagnostic({
    code,
    severity: 'error',
    message,
    feature,
    nodeId: node?.id,
    nodeName: node?.name,
  });
}

function walk(node: ForgeDesignNode, ids: Set<string>, diagnostics: ForgeDiagnostic[]): void {
  if (ids.has(node.id))
    diagnostics.push(diagnostic(`Duplicate design node id "${node.id}".`, 'node identity', 'DUPLICATE_NODE_ID', node));
  ids.add(node.id);
  for (const child of node.children ?? []) walk(child, ids, diagnostics);
}

export function validateForgeDesignDocument(document: ForgeDesignDocument): readonly ForgeDiagnostic[] {
  const diagnostics: ForgeDiagnostic[] = [];
  if (document.schemaVersion !== 1)
    diagnostics.push(diagnostic('Unsupported Forge design document schema version.', 'schema', 'UNSUPPORTED_SCHEMA'));
  if (!document.source.nodeId)
    diagnostics.push(diagnostic('The document source node id is required.', 'source', 'MISSING_SOURCE_NODE'));
  if (!document.root.id || !document.root.name)
    diagnostics.push(diagnostic('The document root must have an id and name.', 'root', 'INVALID_ROOT', document.root));

  walk(document.root, new Set<string>(), diagnostics);
  const assetIds = new Set<string>();
  const assetPaths = new Set<string>();
  for (const asset of document.assets) {
    if (assetIds.has(asset.id))
      diagnostics.push(diagnostic(`Duplicate asset id "${asset.id}".`, 'asset', 'DUPLICATE_ASSET_ID'));
    assetIds.add(asset.id);
    if (assetPaths.has(asset.fileName))
      diagnostics.push(diagnostic(`Duplicate asset file name "${asset.fileName}".`, 'asset', 'DUPLICATE_ASSET_NAME'));
    assetPaths.add(asset.fileName);
    if (!validateRepositoryRelativePath(asset.fileName).valid)
      diagnostics.push(diagnostic(`Unsafe asset file name "${asset.fileName}".`, 'asset path', 'INVALID_ASSET_PATH'));
  }
  return diagnostics;
}

export function validateForgeExportBundle(bundle: {
  readonly files: readonly { readonly path: string }[];
}): readonly ForgeDiagnostic[] {
  const diagnostics: ForgeDiagnostic[] = [];
  const paths = new Set<string>();
  for (const file of bundle.files) {
    if (paths.has(file.path))
      diagnostics.push(
        diagnostic(`Duplicate export file path "${file.path}".`, 'export path', 'DUPLICATE_EXPORT_PATH'),
      );
    paths.add(file.path);
    if (!validateRepositoryRelativePath(file.path).valid)
      diagnostics.push(diagnostic(`Unsafe export file path "${file.path}".`, 'export path', 'INVALID_EXPORT_PATH'));
  }
  return diagnostics;
}
