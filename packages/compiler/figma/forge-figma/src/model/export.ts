import type { ForgeDiagnostic } from './diagnostics';

export type ForgeExportFileKind = 'tsx' | 'scss' | 'asset';

export interface ForgeExportFile {
  readonly path: string;
  readonly kind: ForgeExportFileKind;
  readonly content: string | Uint8Array;
}

export interface ForgeExportBundle {
  readonly componentName: string;
  readonly files: readonly ForgeExportFile[];
  readonly diagnostics: readonly ForgeDiagnostic[];
}

export interface ForgeRepositoryExportRequest {
  readonly protocolVersion: 1;
  readonly repositoryRootId: string;
  readonly targetDirectory: string;
  readonly overwrite: boolean;
  readonly bundle: ForgeExportBundle;
}
