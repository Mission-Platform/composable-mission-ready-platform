import { createManifest } from './manifest.ts';
import {
  STORYBOOK_FRAMEWORKS,
  type RepositoryInventory,
  type RuntimeManifest,
  type RuntimeResult,
  type StorybookFramework,
} from './types.ts';

export interface ValidationSelection {
  framework?: StorybookFramework;
  app?: string;
  packageName?: string;
  storyId?: string;
  includeStories?: boolean;
  includeApps?: boolean;
}

export function selectResults(inventory: RepositoryInventory, selection: ValidationSelection = {}): RuntimeResult[] {
  const includeStories = selection.includeStories ?? true;
  const includeApps = selection.includeApps ?? true;
  const stories = includeStories
    ? inventory.stories.filter(
        (story) =>
          (!selection.packageName || story.packageName === selection.packageName) &&
          (!selection.storyId || story.id === selection.storyId),
      )
    : [];
  const storyResults = stories.flatMap((story) => {
    const frameworks = selection.framework ? [selection.framework] : [...STORYBOOK_FRAMEWORKS];
    return frameworks.map<RuntimeResult>((framework) => ({
      target: 'story',
      packageOrApp: story.packageName,
      framework,
      idOrRoute: story.id,
      status:
        story.excludedFramework === framework ||
        (story.packageName === '@mission-platform/storybook' && Boolean(story.excludedFramework))
          ? 'excluded'
          : 'blocked',
      category:
        story.excludedFramework === framework ||
        (story.packageName === '@mission-platform/storybook' && Boolean(story.excludedFramework))
          ? 'framework-specific-story'
          : 'browser-executor-not-configured',
      message:
        story.excludedFramework === framework ||
        (story.packageName === '@mission-platform/storybook' && Boolean(story.excludedFramework))
          ? `Story filename targets the ${story.excludedFramework} renderer and is outside the neutral matrix.`
          : 'Ego Lite execution is provided by the runtime sweep in Step 2.',
    }));
  });
  if (includeStories && selection.storyId && stories.length === 0) {
    storyResults.push({
      target: 'story',
      packageOrApp: selection.packageName ?? 'unknown',
      framework: selection.framework,
      idOrRoute: selection.storyId,
      status: 'blocked',
      category: 'target-not-found',
      message: 'The requested story ID was not found in the source inventory.',
    });
  }
  const appResults = (includeApps ? inventory.apps : [])
    .filter((app) => !selection.app || app.name === selection.app || app.name === `@mission-platform/${selection.app}`)
    .flatMap((app) =>
      app.routes.map<RuntimeResult>((route) => ({
        target: 'app',
        packageOrApp: app.name,
        idOrRoute: route,
        status: 'blocked',
        category: 'browser-executor-not-configured',
        message: 'Ego Lite execution is provided by the runtime sweep in Step 2.',
      })),
    );
  if (includeApps && selection.app && appResults.length === 0) {
    appResults.push({
      target: 'app',
      packageOrApp: selection.app,
      idOrRoute: '*',
      status: 'blocked',
      category: 'target-not-found',
      message: 'The requested app was not found in the application inventory.',
    });
  }
  return [...storyResults, ...appResults];
}

export function createValidationManifest(
  inventory: RepositoryInventory,
  selection?: ValidationSelection,
): RuntimeManifest {
  return createManifest(inventory, selectResults(inventory, selection));
}
