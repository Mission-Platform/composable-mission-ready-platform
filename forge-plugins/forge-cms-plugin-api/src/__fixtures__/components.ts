/**
 * Neutral component fixtures shared by every CMS target's specification.
 *
 * Each target is exercised against identical inputs, so a difference between
 * two targets' output is always a difference in the target and never in the
 * fixture. `BADGE`/`BUTTON`/`GRID`/`LAYOUT` are lifted verbatim from the
 * original Storyblok specification; `COUNTER` adds an interactive component so
 * the island path can be asserted.
 */
import type { ContentComponentNamesInput } from "../content-model.js";

/** Literal-union options, JSDoc descriptions, and `?? literal` defaults. */
export const BADGE = [
  "import { classNames, h, type MpChild, type MpElement } from '@mission-platform/forge';",
  "",
  "export type BadgeVariant = 'default' | 'primary' | 'secondary';",
  "export type BadgeSize = 'sm' | 'md' | 'lg';",
  "",
  "export interface BadgeProperties {",
  "  children?: MpChild | readonly MpChild[];",
  "  /** Visual tone of the badge. */",
  "  variant?: BadgeVariant;",
  "  /** Size step driving padding and font size. */",
  "  size?: BadgeSize;",
  '  /** Use a fully rounded ("pill") shape. */',
  "  pill?: boolean;",
  "}",
  "",
  "export function ForgeBadge(properties: BadgeProperties): MpElement {",
  "  const variant = properties.variant ?? 'default';",
  "  const size = properties.size ?? 'md';",
  '  return <span class="badge">{properties.children}</span>;',
  "}",
].join("\n");

/** A union degrading to text plus a dropped callback prop. */
export const BUTTON = [
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  "",
  "export type ButtonVariant = 'primary' | 'secondary' | 'ghost';",
  "",
  "export interface ButtonProperties {",
  "  children?: MpChild | readonly MpChild[];",
  "  /** Visual tone of the button. */",
  "  variant?: ButtonVariant;",
  "  /** Disable interaction. */",
  "  disabled?: boolean;",
  "  /** Optional count rendered as a trailing pill badge. */",
  "  badge?: string | number;",
  "  /** Click handler forwarded to the underlying button. */",
  "  onClick?: (event: unknown) => void;",
  "}",
  "",
  "export function ForgeButton(properties: ButtonProperties): MpElement {",
  "  const variant = properties.variant ?? 'primary';",
  '  return <button class="button">{properties.children}</button>;',
  "}",
].join("\n");

/** A numeric prop with a numeric default. */
export const GRID = [
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  "",
  "export interface GridProperties {",
  "  children?: MpChild | readonly MpChild[];",
  "  /** Number of rows. */",
  "  rows?: number;",
  "}",
  "",
  "export function ForgeGrid(properties: GridProperties): MpElement {",
  "  const rows = properties.rows ?? 3;",
  '  return <div class="grid">{properties.children}</div>;',
  "}",
].join("\n");

/** A named slot alongside the default slot. */
export const LAYOUT = [
  "import { h, type MpChild, type MpElement, Slot } from '@mission-platform/forge';",
  "",
  "export interface LayoutProperties {",
  "  /** Stick the header to the top. */",
  "  sticky?: boolean;",
  "  /** Header content. */",
  "  header?: MpChild;",
  "}",
  "",
  "export function ForgeLayout(properties: LayoutProperties): MpElement {",
  "  return (",
  '    <div class="layout">',
  '      <div class="layout__header"><Slot name="header" /></div>',
  '      <main class="layout__content"><Slot /></main>',
  "    </div>",
  "  );",
  "}",
].join("\n");

/** An interactive component: state and an event handler force a hydrated island. */
export const COUNTER = [
  "import { h, useState, type MpElement } from '@mission-platform/forge';",
  "",
  "export interface CounterProperties {",
  "  /** Initial value of the counter. */",
  "  start?: number;",
  "  /** Label rendered beside the value. */",
  "  label?: string;",
  "}",
  "",
  "export function ForgeCounter(properties: CounterProperties): MpElement {",
  "  const [count, setCount] = useState(properties.start ?? 0);",
  "  return (",
  '    <button class="counter" onClick={() => setCount(count + 1)}>',
  "      {properties.label}",
  "      {count}",
  "    </button>",
  "  );",
  "}",
].join("\n");

/** A component with a site-wide setting prop. */
export const SITE_HEADER = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  "",
  "export interface SiteHeaderProperties {",
  "  /**",
  "   * Brand name rendered in the header.",
  "   * @cmsSetting",
  "   */",
  "  brandName?: string;",
  "  /** Sticky positioning. */",
  "  sticky?: boolean;",
  "}",
  "",
  "export function ForgeSiteHeader(properties: SiteHeaderProperties): MpElement {",
  "  const brandName = properties.brandName ?? 'Mission';",
  '  return <header class="site-header">{brandName}</header>;',
  "}",
].join("\n");

/** A required (non-optional) prop alongside an optional one. */
export const REQUIRED = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  "",
  "export interface RequiredProperties {",
  "  /** Mandatory heading. */",
  "  heading: string;",
  "  /** Optional subheading. */",
  "  subheading?: string;",
  "}",
  "",
  "export function ForgeRequired(properties: RequiredProperties): MpElement {",
  "  return <h1>{properties.heading}</h1>;",
  "}",
].join("\n");

/** A component with no props at all. */
export const EMPTY = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  "",
  "export function ForgeEmpty(): MpElement {",
  "  return <hr />;",
  "}",
].join("\n");

export const badgeNames: ContentComponentNamesInput = {
  neutralName: "ForgeBadge",
  publicName: "Badge",
  folder: "forge-badge",
  propertiesType: "BadgeProperties",
};

export const buttonNames: ContentComponentNamesInput = {
  neutralName: "ForgeButton",
  publicName: "Button",
  folder: "forge-button",
  propertiesType: "ButtonProperties",
};

export const gridNames: ContentComponentNamesInput = {
  neutralName: "ForgeGrid",
  publicName: "Grid",
  folder: "forge-grid",
  propertiesType: "GridProperties",
};

export const layoutNames: ContentComponentNamesInput = {
  neutralName: "ForgeLayout",
  publicName: "Layout",
  folder: "forge-layout",
  propertiesType: "LayoutProperties",
};

export const counterNames: ContentComponentNamesInput = {
  neutralName: "ForgeCounter",
  publicName: "Counter",
  folder: "forge-counter",
  propertiesType: "CounterProperties",
};

export const siteHeaderNames: ContentComponentNamesInput = {
  neutralName: "ForgeSiteHeader",
  publicName: "SiteHeader",
  folder: "forge-site-header",
  propertiesType: "SiteHeaderProperties",
};

export const requiredNames: ContentComponentNamesInput = {
  neutralName: "ForgeRequired",
  publicName: "Required",
  folder: "forge-required",
  propertiesType: "RequiredProperties",
};

export const emptyNames: ContentComponentNamesInput = {
  neutralName: "ForgeEmpty",
  publicName: "Empty",
  folder: "forge-empty",
  propertiesType: undefined,
};
