/**
 * Shared test fixtures for CMS target packages.
 *
 * Every target's specification is exercised against the same neutral component
 * sources and the same stub framework plugin, so a difference between two
 * targets' output is always a difference in the target — never in its input.
 * Exposed as the package's `./fixtures` subpath so adapter packages can import
 * them without duplicating the sources.
 */
export {
  BADGE,
  BUTTON,
  COUNTER,
  EMPTY,
  GRID,
  LAYOUT,
  REQUIRED,
  SITE_HEADER,
  badgeNames,
  buttonNames,
  counterNames,
  emptyNames,
  gridNames,
  layoutNames,
  requiredNames,
  siteHeaderNames,
} from "./__fixtures__/components.js";

export { stubFramework } from "./__fixtures__/framework.js";
export {
  BADGE_COMPONENT,
  COUNTER_COMPONENT,
  GRID_COMPONENT,
  LAYOUT_COMPONENT,
  NESTED_BADGE_COMPONENT,
  createCmsWorkspace,
  type CmsWorkspace,
  type WorkspaceComponentDefinition,
} from "./__fixtures__/workspace.js";
