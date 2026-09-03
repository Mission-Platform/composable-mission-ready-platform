export const STORYBOOK_FRAMEWORKS = ['vue', 'react', 'solid', 'svelte', 'web-component'] as const;

export type StorybookFramework = (typeof STORYBOOK_FRAMEWORKS)[number];
export type RuntimeTarget = 'story' | 'app';
export type RuntimeStatus =
  'pass' | 'compile-failure' | 'runtime-failure' | 'interaction-failure' | 'blocked' | 'excluded';

export interface RuntimeEvidence {
  screenshot?: string;
  log?: string;
}

export interface RuntimeResult {
  target: RuntimeTarget;
  packageOrApp: string;
  framework?: StorybookFramework;
  idOrRoute: string;
  status: RuntimeStatus;
  category: string;
  message?: string;
  evidence?: RuntimeEvidence;
  attempts?: number;
  workstream?: string;
}

export interface WorkspacePackage {
  name: string;
  directory: string;
  relativeDirectory: string;
  scope: 'app' | 'package' | 'example' | 'script' | 'mcp' | 'crate' | 'other';
}

export interface StoryFile {
  id: string;
  packageName: string;
  filePath: string;
  absolutePath: string;
  exportedStories?: string[];
  excludedFramework?: StorybookFramework;
}

export interface AppInventory {
  name: string;
  directory: string;
  relativeDirectory: string;
  packageJson: string;
  routerFiles: string[];
  routes: string[];
}

export interface RepositoryInventory {
  repositoryRoot: string;
  workspacePackages: WorkspacePackage[];
  packages: WorkspacePackage[];
  apps: AppInventory[];
  stories: StoryFile[];
  storybookPackages: string[];
}

export interface RuntimeManifest {
  schemaVersion: 1;
  generatedAt: string;
  inventory: RepositoryInventory;
  results: RuntimeResult[];
}

export interface StorybookIndexEntry {
  id: string;
  title?: string;
  name?: string;
  importPath?: string;
  type?: string;
  [key: string]: unknown;
}

export interface StorybookIndex {
  v?: number;
  entries: Record<string, StorybookIndexEntry>;
}
