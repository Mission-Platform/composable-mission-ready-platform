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

const NESTED_BARREL = `
export { BaseBadge, type BadgeProperties } from './atoms/base-badge';
export { BaseQuote, type QuoteProperties } from './molecules/base-quote';
export {
  clearToasts,
  showToast,
  useToast,
  type ToastOptions,
  type ToastPosition,
} from './toast-store';
`;

describe('discoverComponents', () => {
  it('keeps folder as the basename and sourceDir flat for a flat re-export', () => {
    const components = discoverComponents(BARREL);
    const badge = components.find((component) => component.neutralName === 'BaseBadge');

    expect(badge).toMatchObject({
      neutralName: 'BaseBadge',
      publicName: 'Badge',
      folder: 'base-badge',
      sourceDir: 'base-badge',
      propertiesType: 'BadgeProperties',
    });
  });

  it('keeps folder as the basename and sourceDir nested for an atomic-design re-export', () => {
    const components = discoverComponents(NESTED_BARREL);

    expect(components.map((component) => [component.folder, component.sourceDir])).toEqual([
      ['base-badge', 'atoms/base-badge'],
      ['base-quote', 'molecules/base-quote'],
    ]);
    expect(components.find((component) => component.neutralName === 'BaseBadge')).toMatchObject({
      publicName: 'Badge',
      folder: 'base-badge',
      sourceDir: 'atoms/base-badge',
      propertiesType: 'BadgeProperties',
    });
  });
});

describe('discoverHelperExports', () => {
  it('forwards non-component helper re-exports (value + type names)', () => {
    const components = discoverComponents(BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(BARREL, folders);

    expect(helpers).toHaveLength(1);
    expect(helpers[0]).toEqual({
      base: 'toast-store',
      relativePath: 'toast-store',
      values: ['clearToasts', 'showToast', 'useToast'],
      types: ['ToastOptions', 'ToastPosition'],
    });
  });

  it('preserves nested folder paths in relativePath while keeping base as the file name', () => {
    const nestedBarrel = `
export { useObservable } from './composables/use-observable';
export { useSubscribe, useSubscription, type Unsubscribable } from './composables/use-subscription';
export { innerDimensions, type Margin } from './utils/margins';
`;
    const helpers = discoverHelperExports(nestedBarrel, new Set());

    expect(helpers.map((helper) => [helper.base, helper.relativePath])).toEqual([
      ['use-observable', 'composables/use-observable'],
      ['use-subscription', 'composables/use-subscription'],
      ['margins', 'utils/margins'],
    ]);
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

  it('never treats a nested component re-export as a helper (folder is still the basename)', () => {
    const components = discoverComponents(NESTED_BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(NESTED_BARREL, folders);

    expect(folders.has('base-badge')).toBe(true);
    expect(folders.has('base-quote')).toBe(true);
    expect(helpers.map((helper) => helper.base)).toEqual(['toast-store']);
  });
});
