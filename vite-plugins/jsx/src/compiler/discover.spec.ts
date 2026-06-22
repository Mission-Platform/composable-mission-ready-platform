import { describe, expect, it } from 'vitest';

import { discoverComponents, discoverHelperExports } from './discover';

const BARREL = `
export { BaseBadge, type BadgeProperties } from './base-badge';
export { BaseToast, type ToastProperties, type ToastVariant } from './base-toast';
export { BaseToastContainer, type ToastContainerProperties } from './base-toast-container';
export {
  clearToasts,
  showToast,
  useToast,
  type ToastOptions,
  type ToastPosition,
} from './toast-store';
`;

describe('discoverHelperExports', () => {
  it('forwards non-component helper re-exports (value + type names)', () => {
    const components = discoverComponents(BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(BARREL, folders);

    expect(helpers).toHaveLength(1);
    expect(helpers[0]).toEqual({
      base: 'toast-store',
      values: ['clearToasts', 'showToast', 'useToast'],
      types: ['ToastOptions', 'ToastPosition'],
    });
  });

  it('never treats a component re-export as a helper', () => {
    const components = discoverComponents(BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(BARREL, folders);

    // The PascalCase component lines (base-badge / base-toast / base-toast-container)
    // are excluded by the component-folder set.
    expect(helpers.map((helper) => helper.base)).not.toContain('base-toast');
    expect(helpers.map((helper) => helper.base)).not.toContain('base-toast-container');
    // …and the helper line never produces a phantom component.
    expect(components.map((component) => component.folder)).not.toContain('toast-store');
  });
});
