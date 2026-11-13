/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic neutral-runtime helpers mirror framework component contracts. */
import { h } from './h';

/**
 * Framework-neutral virtual-node primitives.
 *
 * Components are authored once in JSX (in a consuming package such as
 * `@mission-platform/components`) and compiled by the classic JSX
 * transform into calls to {@link h}. Those calls produce the plain,
 * serialisable {@link MpElement} tree defined here — a structure that is
 * deliberately framework-agnostic so the per-framework adapters
 * (`@mission-platform/forge-adapters/react`, `@mission-platform/forge-adapters/vue`) can map it onto
 * `React.createElement` or Vue's `h` at render time.
 */

/**
 * Marker used as the element `type` for fragments (`<>…</>`), i.e. the classic
 * transform's `jsxFragmentFactory`.
 *
 * Like {@link Slot}, {@link Transition} and {@link TransitionGroup}, it is a
 * function-component marker rather than a bare `symbol`: under the classic `h`
 * factory the fragment factory has to be a **callable** JSX type, otherwise
 * authoring `<>…</>` (or an explicit `<Fragment>`) fails type-checking with
 * TS2604 ("does not have any construct or call signatures"). It is never
 * actually invoked, though — the runtime adapters intercept it by identity
 * (`type === Fragment`) and the build-time compiler
 * (`@mission-platform/vite-plugin-forge`) lowers fragments to each framework's
 * own form (React's `<>`, Vue's inlined children). Calling it directly is a bug.
 */
export const Fragment: MpFragment = () => {
  throw new Error(
    '@mission-platform/forge-jsx: <Fragment> / <> is a compile-time / adapter marker and must not be rendered directly.',
  );
};

/** Props carried by the framework-neutral Suspense marker. */
export interface MpSuspenseProperties {
  readonly fallback?: MpSuspenseChild;
  readonly children?: MpSuspenseChild;
}

/** Native async-boundary marker lowered by each framework compiler. */
export const Suspense: MpComponent<MpSuspenseProperties> = () => {
  throw new Error(
    '@mission-platform/forge-jsx: <Suspense> is a compile-time / adapter marker and must not be rendered directly.',
  );
};

/**
 * The **runtime** bag of attributes/props carried by an {@link MpElement}.
 *
 * This is deliberately a plain, untyped record: it is what the JSX factory
 * builds and what the adapters index into while walking a neutral tree. It is
 * *not* a base type for a component's props — a component declares exactly the
 * properties it accepts (including `children?: MpChild | readonly MpChild[]`
 * when it renders them), so that excess-property checking and `keyof` stay
 * meaningful in every compiled target. The handful of attributes every element
 * accepts regardless are declared once in {@link MpReservedProperties}.
 */
export type MpPropertyBag = Record<string, unknown>;

/**
 * Framework-neutral CSS style object used by the JSX `style` attribute.
 *
 * Component-owned custom properties should extend this type with explicit
 * `--forge-*` keys (for example `CSSStyleProperties & { '--forge-button-radius'?: string | undefined }`)
 * rather than introducing an untyped style dictionary or a non-DOM `styles` bag.
 */
export type CSSStyleProperties = {
  [property: string]: string | number | undefined;
};

type DefinedForgeStyle<T extends Record<string, string | undefined>> = {
  [K in keyof T as T[K] extends undefined ? never : K]?: Exclude<T[K], undefined>;
};

/**
 * Convert a camelCase string type to kebab-case.
 */
export type CamelToKebab<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Uppercase<T> ? '-' : ''}${Lowercase<T>}${CamelToKebab<U>}`
  : S;

/**
 * Convert a kebab-case string type to camelCase.
 */
export type KebabToCamel<S extends string> = S extends `${infer T}-${infer U}`
  ? `${T}${Capitalize<KebabToCamel<U>>}`
  : S;

/**
 * Permissive property override bag accepting either kebab-case or camelCase property keys.
 */
export type ForgePropertyBag<T extends Record<string, string | undefined> = Record<string, string | undefined>> = {
  [K in keyof T as K | (K extends string ? KebabToCamel<K> : never)]?: string | undefined;
};

/**
 * Build a neutral `style` map from defined custom-property values.
 *
 * Entries whose value is `undefined` are omitted so SCSS
 * `var(--forge-*, <token fallback>)` chains remain active. Returns `undefined`
 * when no overrides are present.
 */
export function createForgeStyle<const T extends Record<string, string | undefined>>(
  style: T,
): DefinedForgeStyle<T> | undefined {
  const entries = Object.entries(style).filter((entry): entry is [string, string] => entry[1] !== undefined);
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries) as DefinedForgeStyle<T>;
}

/** Strips existing dashes and namespace prefixes from a kebab string. */
function stripExistingPrefix(kebab: string, prefix: string): string {
  const stripped = kebab.replace(/^--(?:forge-)?/, '');
  return prefix && stripped.startsWith(`${prefix}-`) ? stripped.slice(prefix.length + 1) : stripped;
}

/**
 * Normalises a property name key to a `--forge-<prefix>-<kebab>` custom property name.
 */
function toForgePropertyName(key: string, prefix: string): string {
  const kebab = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  const base = stripExistingPrefix(kebab, prefix);
  return prefix ? `--forge-${prefix}-${base}` : `--forge-${base}`;
}

/**
 * Build a component-scoped CSS custom-property style map from a camelCase or kebab-case property bag.
 *
 * Automatically converts camelCase keys into kebab-case, ensures the component namespace
 * prefix `--forge-<prefix>-` is applied, and omits undefined entries so CSS token fallback
 * chains remain active. Returns `undefined` when no defined overrides are present.
 */
export function renderAccordionItems(
  items: readonly any[] = [],
  _exclusive: boolean = true,
  defaultOpen: readonly string[] = [],
  _properties?: any,
): any {
  return items.map((item) => {
    const isOpen = defaultOpen.includes(item.id);
    const itemClass = ['forge-accordion__item', item.disabled ? 'forge-accordion__item--disabled' : undefined]
      .filter(Boolean)
      .join(' ');

    return h(
      'details',
      { key: item.id, className: itemClass, open: isOpen },
      h(
        'summary',
        {
          className: 'forge-accordion__summary',
          tabIndex: 0,
          'aria-disabled': item.disabled ? 'true' : undefined,
        },
        h(
          'span',
          { className: 'forge-typography forge-typography--body-md forge-typography--weight-medium' },
          item.title,
        ),
        h('span', { className: 'forge-accordion__chevron', 'aria-hidden': 'true' }),
      ),
      h('div', { className: 'forge-accordion__content' }, item.content),
    );
  });
}

export function createCodeScannerStyle(): Record<string, string> {
  return { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' };
}

export function resolveIconPixelSize(size: string = 'md'): number {
  if (size === 'sm') return 16;
  if (size === 'lg') return 24;
  if (size === 'xl') return 32;
  return 20;
}

export function renderUnreadBadge(unreadCount: number = 0): any {
  if (unreadCount <= 0) return undefined;
  return h('span', { className: 'badge badge--primary badge--sm' }, String(unreadCount));
}

export function resolveEmailTypographyTag(asTag?: string, variant?: string): string {
  if (asTag) return asTag;
  if (variant === 'h1') return 'h1';
  if (variant === 'h2') return 'h2';
  if (variant === 'h3') return 'h3';
  if (variant === 'h4') return 'h4';
  return 'p';
}

export function resolveTypographyScaleVariant(variant?: string): string {
  if (variant === 'link' || !variant) return 'body-md';
  return variant;
}

export function resolveTypographyTag(asTag?: string, href?: string, variant?: string): string {
  if (asTag) return asTag;
  if (href || variant === 'link') return 'a';
  if (variant === 'display' || variant === 'h1') return 'h1';
  if (variant === 'h2') return 'h2';
  if (variant === 'h3') return 'h3';
  if (variant === 'h4') return 'h4';
  if (variant === 'h5') return 'h5';
  if (variant === 'h6') return 'h6';
  if (variant === 'code') return 'code';
  return 'p';
}

export function createPreviewTextStyle(): Record<string, string> {
  return { display: 'none', maxHeight: '0px', overflow: 'hidden' };
}

export function renderBarcodeSvg(
  value: string = '',
  symbology: string = 'code128',
  color: string = '#000000',
  background: string = '#ffffff',
  displayValue: boolean = false,
  ariaLabel?: string,
  onError?: (err: Error) => void,
  showActions?: any,
): any {
  if (symbology === 'ean13' && (value.length < 12 || !/^\d+$/.test(value))) {
    onError?.(new Error('Invalid EAN-13 payload'));
    return undefined;
  }

  const svg = h(
    'svg',
    {
      className: 'forge-barcode',
      viewBox: '0 0 200 100',
      role: 'img',
      'aria-label': ariaLabel,
    },
    h('rect', { width: '100%', height: '100%', fill: background }),
    h('rect', { x: 20, y: 10, width: 4, height: 70, fill: color }),
    h('rect', { x: 30, y: 10, width: 6, height: 70, fill: color }),
    h('rect', { x: 45, y: 10, width: 2, height: 70, fill: color }),
    h('rect', { x: 55, y: 10, width: 8, height: 70, fill: color }),
    displayValue ? h('text', { x: 100, y: 95, textAnchor: 'middle', fill: color }, value) : undefined,
  );

  let actionsToolbar: any;
  if (showActions) {
    const isAll = showActions === true;
    const saveImg = isAll || showActions.saveImage;
    const copyImg = isAll || showActions.copyImage;
    const copyVal = isAll || showActions.copyValue;

    const btns: any[] = [];
    if (saveImg) btns.push(h('button', { key: 'save', className: 'forge-button' }, 'Save image'));
    if (copyImg) btns.push(h('button', { key: 'copy-img', className: 'forge-button' }, 'Copy image'));
    if (copyVal) btns.push(h('button', { key: 'copy-val', className: 'forge-button' }, 'Copy value'));

    if (btns.length > 0) {
      actionsToolbar = h('div', { className: 'forge-barcode__actions' }, ...btns);
    }
  }

  return h('div', { className: 'forge-barcode-wrapper' }, svg, actionsToolbar);
}

export function renderCodeBlockLineNumbers(code: string = ''): any {
  const normalized = code.endsWith('\n') ? code.slice(0, -1) : code;
  const lineCount = Math.max(1, normalized.split('\n').length);
  return Array.from({ length: lineCount }, (_, i) =>
    h('span', { key: i + 1, className: 'forge-code-block__line-number', 'aria-hidden': 'true' }, String(i + 1)),
  );
}

export function renderResourcePlannerRows(
  resources: readonly any[] = [],
  segments: readonly any[] = [],
  _assignments: readonly any[] = [],
  _availability: readonly any[] = [],
  _onEventClick?: (assignment: any) => void,
): any {
  return resources.map((resource) => {
    return h(
      'div',
      { key: resource.id, className: 'forge-resource-planner__row' },
      h(
        'div',
        { className: 'forge-resource-planner__resource-cell' },
        h('strong', { className: 'forge-resource-planner__resource-name' }, resource.name),
        resource.title ? h('span', { className: 'forge-resource-planner__resource-title' }, resource.title) : undefined,
      ),
      h(
        'div',
        { className: 'forge-resource-planner__timeline-track' },
        ...segments.map((_seg, idx) => h('div', { key: idx, className: 'forge-resource-planner__segment' })),
      ),
    );
  });
}

export function renderRatingStars(
  max: number = 5,
  modelValue: number = 0,
  disabled: boolean = false,
  isReadonly: boolean = false,
  onUpdateModelValue?: (val: number) => void,
  onChange?: (val: number) => void,
): any {
  const count = Math.max(1, Math.floor(max));
  return Array.from({ length: count }, (_, index) => {
    const starValue = index + 1;
    const isFilled = starValue <= modelValue;
    const isInteractive = !disabled && !isReadonly;

    const starClass = ['forge-rating__star', isFilled ? 'forge-rating__star--filled' : 'forge-rating__star--empty']
      .filter(Boolean)
      .join(' ');

    const handleClick = () => {
      if (isInteractive) {
        onUpdateModelValue?.(starValue);
        onChange?.(starValue);
      }
    };

    return h(
      'button',
      {
        key: starValue,
        type: 'button',
        className: starClass,
        disabled: disabled || isReadonly || undefined,
        'aria-label': `${starValue} of ${count} stars`,
        onClick: isInteractive ? handleClick : undefined,
      },
      '★',
    );
  });
}

export function createWidthStyle(width: string = '0%'): Record<string, string> {
  return { width };
}

export function createHighlightStyle(left: string = '0%', width: string = '100%'): Record<string, string> {
  return { left, width };
}

export function createLeftPositionStyle(left: string = '0%'): Record<string, string> {
  return { left };
}

export function createRangeInputMath(
  modelValue: [number, number] = [0, 100],
  min: number = 0,
  max: number = 100,
): {
  minPercent: number;
  maxPercent: number;
  highlightLeft: string;
  highlightWidth: string;
  minLeft: string;
  maxLeft: string;
} {
  const range = max > min ? max - min : 1;
  const rawMin = Math.min(modelValue[0], modelValue[1]);
  const rawMax = Math.max(modelValue[0], modelValue[1]);
  const minPercent = ((rawMin - min) / range) * 100;
  const maxPercent = ((rawMax - min) / range) * 100;

  return {
    minPercent,
    maxPercent,
    highlightLeft: `${minPercent}%`,
    highlightWidth: `${maxPercent - minPercent}%`,
    minLeft: `${minPercent}%`,
    maxLeft: `${maxPercent}%`,
  };
}

export function createSliderMath(
  value: number = 0,
  min: number = 0,
  max: number = 100,
): { percent: number; fillWidth: string; thumbLeft: string } {
  const range = max > min ? max - min : 1;
  const clamped = Math.min(max, Math.max(min, value));
  const percent = ((clamped - min) / range) * 100;
  return {
    percent,
    fillWidth: `${percent}%`,
    thumbLeft: `${percent}%`,
  };
}

export function renderSegmentControlOptions(
  options: readonly any[] = [],
  modelValue?: string,
  onSelect?: (value: string) => void,
): any {
  return options.map((option) => {
    const isSelected = option.value === modelValue;
    const optionClass = [
      'forge-segment-control__button',
      isSelected ? 'forge-segment-control__button--selected' : undefined,
      option.disabled ? 'forge-segment-control__button--disabled' : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    return h(
      'button',
      {
        key: option.value,
        type: 'button',
        role: 'radio',
        'aria-checked': isSelected ? 'true' : 'false',
        className: optionClass,
        disabled: option.disabled || undefined,
        onClick: onSelect && !option.disabled ? () => onSelect(option.value) : undefined,
      },
      option.icon
        ? h('span', { className: 'forge-segment-control__icon', 'aria-hidden': 'true' }, option.icon)
        : undefined,
      h('span', { className: 'forge-segment-control__label' }, option.label),
    );
  });
}

export function renderStepsItems(
  steps: readonly any[] = [],
  currentStep: number = 0,
  onStepClick?: (step: number) => void,
): any {
  return steps.map((step, index) => {
    const isCompleted = index < currentStep;
    const isCurrent = index === currentStep;
    const status = isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming';

    const stepClass = ['forge-steps__item', `forge-steps__item--${status}`].filter(Boolean).join(' ');

    return h(
      'li',
      { key: step.id ?? index, className: stepClass },
      h(
        'button',
        {
          type: 'button',
          className: 'forge-steps__button',
          'aria-current': isCurrent ? 'step' : undefined,
          onClick: onStepClick ? () => onStepClick(index) : undefined,
        },
        h('span', { className: 'forge-steps__indicator' }, isCompleted ? '✓' : String(index + 1)),
        h(
          'span',
          { className: 'forge-steps__content' },
          h('strong', { className: 'forge-steps__title' }, step.title),
          step.description ? h('span', { className: 'forge-steps__description' }, step.description) : undefined,
        ),
      ),
    );
  });
}

export function renderDropdownItems(items: readonly any[] = [], onSelect?: (item: any) => void): any {
  return items.map((item, index) => {
    if (item.type === 'divider') {
      return h('li', { key: index, role: 'separator', className: 'forge-dropdown__divider' });
    }
    return h(
      'li',
      { key: item.id ?? index, role: 'none', className: 'forge-dropdown__item' },
      h(
        'button',
        {
          type: 'button',
          role: 'menuitem',
          className: 'forge-dropdown__button',
          disabled: item.disabled || undefined,
          onClick: onSelect && !item.disabled ? () => onSelect(item) : item.onSelect,
        },
        item.icon ? h('span', { className: 'forge-dropdown__icon', 'aria-hidden': 'true' }, item.icon) : undefined,
        h('span', { className: 'forge-dropdown__label' }, item.label),
      ),
    );
  });
}

export function renderNotificationPanelItems(
  notifications: readonly any[] = [],
  onDismiss?: (id: string) => void,
  _onRead?: (id: string) => void,
  onActionClick?: (item: any) => void,
): any {
  return notifications.map((item) => {
    const isUnread = !item.read;
    const typeClass = item.type ? `forge-notification-panel__item--${item.type}` : undefined;
    const itemClasses = [
      'forge-notification-panel__item',
      typeClass,
      isUnread ? 'forge-notification-panel__item--unread' : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    const action = item.action;

    return h(
      'li',
      { key: item.id, className: itemClasses },
      h(
        'div',
        { className: 'forge-notification-panel__item-header' },
        h('strong', { className: 'forge-notification-panel__item-title' }, item.title),
        h(
          'time',
          { className: 'forge-notification-panel__item-time' },
          item.timestamp ?? `${item.date ?? ''} ${item.time ?? ''}`.trim(),
        ),
      ),
      h('p', { className: 'forge-notification-panel__item-message' }, item.message),
      action
        ? h(
            'div',
            { className: 'forge-notification-panel__item-action' },
            action.url
              ? h(
                  'a',
                  { href: action.url, className: 'forge-notification-panel__action-btn', onClick: action.handler },
                  action.label,
                )
              : h(
                  'button',
                  {
                    type: 'button',
                    className: 'forge-notification-panel__action-btn',
                    onClick: action.handler ? action.handler : onActionClick ? () => onActionClick(item) : undefined,
                  },
                  action.label,
                ),
          )
        : undefined,
      onDismiss
        ? h(
            'button',
            {
              type: 'button',
              className: 'forge-notification-panel__dismiss-btn',
              'aria-label': 'Dismiss notification',
              onClick: () => onDismiss(item.id),
            },
            '×',
          )
        : undefined,
    );
  });
}

export function renderMarketingHeaderActions(actions: readonly any[] = []): any {
  return actions.map((action, index) => {
    const variant = action.variant ?? (index === 0 ? 'primary' : 'secondary');
    const buttonClass = ['forge-marketing-header__action', `forge-marketing-header__action--${variant}`]
      .filter(Boolean)
      .join(' ');

    const targetUrl = action.url ?? action.href;
    if (targetUrl) {
      return h(
        'a',
        { key: action.id ?? index, href: targetUrl, className: buttonClass, onClick: action.handler },
        action.label,
      );
    }
    return h(
      'button',
      { key: action.id ?? index, type: 'button', className: buttonClass, onClick: action.handler },
      action.label,
    );
  });
}

export function renderNavbarItems(items: readonly any[] = []): any {
  return items.map((item, index) => {
    const isExternal = Boolean(item.external);
    const itemClass = ['forge-navbar__item', item.active ? 'forge-navbar__item--active' : undefined]
      .filter(Boolean)
      .join(' ');

    return h(
      'li',
      { key: index, className: itemClass },
      h(
        'a',
        {
          href: item.href,
          className: 'forge-navbar__link',
          target: isExternal ? '_blank' : undefined,
          rel: isExternal ? 'noopener noreferrer' : undefined,
        },
        item.label,
      ),
    );
  });
}

export function renderSiteFooterSections(sections: readonly any[] = []): any {
  return sections.map((section, index) => {
    return h(
      'div',
      { key: index, className: 'forge-site-footer__section' },
      h('h3', { className: 'forge-site-footer__section-title' }, section.title),
      h(
        'ul',
        { className: 'forge-site-footer__section-list' },
        (section.links ?? []).map((link: any, linkIndex: number) =>
          h(
            'li',
            { key: linkIndex, className: 'forge-site-footer__link-item' },
            h('a', { href: link.href, className: 'forge-site-footer__link' }, link.label),
          ),
        ),
      ),
    );
  });
}

export function renderTableColumns(columns: readonly any[] = []): any {
  return columns.map((col, index) => {
    return h(
      'th',
      { key: col.key ?? col.id ?? index, scope: 'col', className: 'forge-table__header-cell' },
      col.title ?? col.label ?? col.name ?? '',
    );
  });
}

export function renderTableRows(data: readonly any[] = [], columns: readonly any[] = []): any {
  return data.map((row, rowIndex) => {
    return h(
      'tr',
      { key: row.id ?? rowIndex, className: 'forge-table__row' },
      ...columns.map((col, colIndex) => {
        const key = col.key ?? col.id ?? col.name;
        const cellValue = key ? row[key] : '';
        return h('td', { key: key ?? colIndex, className: 'forge-table__cell' }, String(cellValue ?? ''));
      }),
    );
  });
}

export function renderTreeViewNodes(nodes: readonly any[] = [], onSelect?: (node: any) => void): any {
  return nodes.map((node) => {
    const isSelected = Boolean(node.selected);
    const itemClass = ['forge-tree-view__item', isSelected ? 'forge-tree-view__item--selected' : undefined]
      .filter(Boolean)
      .join(' ');

    return h(
      'li',
      { key: node.id, role: 'treeitem', 'aria-selected': isSelected ? 'true' : 'false', className: itemClass },
      h(
        'div',
        { className: 'forge-tree-view__node', onClick: onSelect ? () => onSelect(node) : undefined },
        h('span', { className: 'forge-tree-view__label' }, node.label),
      ),
      node.children && node.children.length > 0
        ? h('ul', { role: 'group', className: 'forge-tree-view__group' }, renderTreeViewNodes(node.children, onSelect))
        : undefined,
    );
  });
}

export function renderDataCardMetrics(metrics: readonly any[] = []): any {
  return metrics.map((metric, index) => {
    return h(
      'div',
      { key: index, className: 'forge-data-card__metric' },
      h('span', { className: 'forge-data-card__metric-label' }, metric.label),
      h('strong', { className: 'forge-data-card__metric-value' }, metric.value),
    );
  });
}

export function renderCtaBannerActions(actions: readonly any[] = []): any {
  return actions.map((action, index) => {
    const variant = action.variant ?? (index === 0 ? 'primary' : 'secondary');
    const buttonClass = ['forge-cta-banner__action', `forge-cta-banner__action--${variant}`].filter(Boolean).join(' ');

    if (action.href) {
      return h('a', { key: index, href: action.href, className: buttonClass, onClick: action.onClick }, action.label);
    }
    return h('button', { key: index, type: 'button', className: buttonClass, onClick: action.onClick }, action.label);
  });
}

export function renderComparisonTableBody(items: readonly any[] = [], features: readonly any[] = []): any {
  return features.map((feature) => {
    return h(
      'tr',
      { key: feature.id, className: 'forge-comparison-table__row' },
      h(
        'th',
        { scope: 'row', className: 'forge-comparison-table__feature-cell' },
        h('span', { className: 'forge-comparison-table__feature-label' }, feature.label),
        feature.description
          ? h('span', { className: 'forge-comparison-table__feature-description' }, feature.description)
          : undefined,
      ),
      ...items.map((item) => {
        const val = feature.values?.[item.id];
        let displayVal: any;
        if (typeof val === 'boolean') {
          displayVal = val ? '✓' : '—';
        } else {
          displayVal = String(val ?? '—');
        }
        return h('td', { key: item.id, className: 'forge-comparison-table__cell' }, displayVal);
      }),
    );
  });
}

export function renderComparisonTableHeaders(items: readonly any[] = []): any {
  return items.map((item) => {
    const isHighlighted = Boolean(item.highlighted);
    const thClass = [
      'forge-comparison-table__header-cell',
      isHighlighted ? 'forge-comparison-table__header-cell--highlighted' : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    return h(
      'th',
      { key: item.id, scope: 'col', className: thClass },
      h('div', { className: 'forge-comparison-table__plan-name' }, item.name),
      item.price ? h('div', { className: 'forge-comparison-table__plan-price' }, item.price) : undefined,
      item.description
        ? h('div', { className: 'forge-comparison-table__plan-description' }, item.description)
        : undefined,
    );
  });
}

export function renderCommentTree(
  comments: readonly any[] = [],
  onReply?: (comment: any) => void,
  onResolve?: (comment: any) => void,
): any {
  return comments.map((comment) => {
    const authorName = typeof comment.author === 'string' ? comment.author : (comment.author?.name ?? '');
    const bodyText = comment.body ?? comment.content ?? '';

    return h(
      'li',
      { key: comment.id, className: 'forge-comment-thread__item' },
      h(
        'div',
        { className: 'forge-comment-thread__header' },
        h('strong', { className: 'forge-comment-thread__author' }, authorName),
        h('time', { className: 'forge-comment-thread__timestamp' }, comment.timestamp),
      ),
      h('div', { className: 'forge-comment-thread__body' }, bodyText),
      h(
        'div',
        { className: 'forge-comment-thread__actions' },
        onReply ? h('button', { type: 'button', onClick: () => onReply(comment) }, 'Reply') : undefined,
        onResolve ? h('button', { type: 'button', onClick: () => onResolve(comment) }, 'Resolve') : undefined,
      ),
      comment.replies && comment.replies.length > 0
        ? h(
            'ul',
            { className: 'forge-comment-thread__replies' },
            renderCommentTree(comment.replies, onReply, onResolve),
          )
        : undefined,
    );
  });
}

export function renderCommandPaletteGroups(
  commands: readonly any[] = [],
  _groups: readonly string[] = [],
  activeIndex: number = 0,
  onSelect?: (command: any) => void,
): any {
  return commands.map((command, index) => {
    const isSelected = index === activeIndex;
    const itemClass = [
      'forge-command-palette__item',
      isSelected ? 'forge-command-palette__item--active' : undefined,
      command.disabled ? 'forge-command-palette__item--disabled' : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    return h(
      'li',
      {
        key: command.id ?? index,
        id: `command-${command.id ?? index}`,
        role: 'option',
        'aria-selected': isSelected ? 'true' : 'false',
        'aria-disabled': command.disabled ? 'true' : undefined,
        className: itemClass,
        onClick: onSelect && !command.disabled ? () => onSelect(command) : undefined,
      },
      command.icon
        ? h('span', { className: 'forge-command-palette__item-icon', 'aria-hidden': 'true' }, command.icon)
        : undefined,
      h(
        'span',
        { className: 'forge-command-palette__item-body' },
        h('span', { className: 'forge-command-palette__item-label' }, command.label),
        command.description
          ? h('span', { className: 'forge-command-palette__item-description' }, command.description)
          : undefined,
      ),
      command.shortcut ? h('kbd', { className: 'forge-command-palette__item-shortcut' }, command.shortcut) : undefined,
    );
  });
}

export function renderCarouselSlides(
  slides: readonly any[] = [],
  current: number = 0,
  _orientation: string = 'horizontal',
  slideWidth: number = 100,
): any {
  return slides.map((slide, index) => {
    const isSelected = index === current;
    const itemClass = ['forge-carousel__slide', isSelected ? 'forge-carousel__slide--selected' : undefined]
      .filter(Boolean)
      .join(' ');

    const itemStyle = {
      flex: `0 0 ${slideWidth}%`,
      width: `${slideWidth}%`,
    };

    return h(
      'li',
      {
        key: slide.id ?? index,
        className: itemClass,
        role: 'group',
        'aria-roledescription': 'slide',
        'aria-label': `${index + 1} of ${slides.length}`,
        style: itemStyle,
      },
      slide.image
        ? h('img', { className: 'forge-carousel__image', src: slide.image, alt: slide.alt ?? '' })
        : h('div', { className: 'forge-carousel__content' }, slide.content),
    );
  });
}

export function renderAssetBrowserGrid(
  assets: readonly any[] = [],
  selected: readonly string[] = [],
  onSelect?: (asset: any) => void,
): any {
  return assets.map((asset) => {
    const isSelected = selected.includes(asset.id);
    const itemClass = ['forge-asset-browser__item', isSelected ? 'forge-asset-browser__item--selected' : undefined]
      .filter(Boolean)
      .join(' ');

    return h(
      'li',
      { key: asset.id, className: itemClass },
      h(
        'button',
        {
          type: 'button',
          className: 'forge-asset-browser__card',
          role: 'option',
          'aria-selected': isSelected ? 'true' : 'false',
          onClick: onSelect ? () => onSelect(asset) : undefined,
        },
        h('img', { className: 'forge-asset-browser__thumbnail', src: asset.src, alt: asset.alt ?? '' }),
        h(
          'span',
          { className: 'forge-asset-browser__caption' },
          h('strong', { className: 'forge-asset-browser__name' }, asset.name),
          asset.metadata ? h('span', { className: 'forge-asset-browser__metadata' }, asset.metadata) : undefined,
        ),
      ),
    );
  });
}

export function renderActivityFeedItems(
  items: readonly any[] = [],
  maxItems?: number,
  onItemClick?: (item: any) => void,
): any {
  const visibleItems = maxItems === undefined ? items : items.slice(0, Math.max(0, maxItems));
  return visibleItems.map((item, index) => {
    const initials = item.user?.name
      ? item.user.name
          .split(' ')
          .map((p: string) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : '';
    const avatar = h(
      'span',
      { className: 'forge-activity-feed__avatar' },
      h(
        'div',
        {
          className: 'avatar avatar--sm avatar--circle',
          style: {
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
        item.user?.avatar
          ? h('img', { className: 'avatar__image-img', src: item.user.avatar, alt: '' })
          : h('span', { className: 'avatar__initials' }, initials),
      ),
    );
    const summary = h(
      'span',
      { className: 'forge-activity-feed__summary' },
      h('strong', {}, item.user?.name ?? ''),
      ' ',
      item.action ?? '',
      item.target ? ` ${item.target}` : '',
    );
    const time = h('time', { className: 'forge-activity-feed__time', dateTime: item.timestamp }, item.timestamp);
    const body = h(
      'span',
      { className: 'forge-activity-feed__body' },
      summary,
      item.icon ? h('span', { className: 'forge-activity-feed__icon', 'aria-hidden': 'true' }, item.icon) : undefined,
      time,
    );

    return h(
      'li',
      { key: `${item.timestamp}-${index}`, className: 'forge-activity-feed__item' },
      h(
        'button',
        {
          type: 'button',
          className: 'forge-activity-feed__link',
          onClick: onItemClick ? () => onItemClick(item) : undefined,
        },
        avatar,
        body,
      ),
    );
  });
}

export function renderTimelineItems(items: readonly any[] = [], align: string = 'start'): any {
  return items.map((item, index) => {
    const isEven = index % 2 === 0;
    const isOutlined = Boolean(item.outlined);
    const variant = item.variant ?? 'primary';

    const itemClasses = [
      'forge-timeline__item',
      isOutlined ? 'forge-timeline__item--outlined' : undefined,
      `forge-timeline__item--${variant}`,
      align === 'alternate' ? (isEven ? 'forge-timeline__item--left' : 'forge-timeline__item--right') : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    const markerClasses = [
      'forge-timeline__marker',
      `forge-timeline__marker--${variant}`,
      isOutlined ? 'forge-timeline__marker--outlined' : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    return h(
      'li',
      { key: item.id ?? index, className: itemClasses },
      h('div', { className: 'forge-timeline__tail', 'aria-hidden': 'true' }),
      h('div', { className: markerClasses, 'aria-hidden': 'true' }),
      h(
        'div',
        { className: 'forge-timeline__content' },
        item.time
          ? h(
              'div',
              { className: 'forge-timeline__time' },
              h(
                'span',
                { className: 'forge-typography forge-typography--caption forge-typography--color-tertiary' },
                item.time,
              ),
            )
          : undefined,
        item.title
          ? h(
              'div',
              { className: 'forge-timeline__title' },
              h(
                'span',
                {
                  className:
                    'forge-typography forge-typography--body-md forge-typography--weight-semibold forge-typography--color-primary',
                },
                item.title,
              ),
            )
          : undefined,
        item.body
          ? h(
              'div',
              { className: 'forge-timeline__body' },
              h(
                'span',
                { className: 'forge-typography forge-typography--body-sm forge-typography--color-secondary' },
                item.body,
              ),
            )
          : undefined,
      ),
    );
  });
}

export function renderTabsList(
  tabs: readonly any[] = [],
  activeId?: string,
  variant: string = 'line',
  closable: boolean = false,
  onSelect?: (id: string) => void,
  onClose?: (id: string) => void,
  addable: boolean = false,
  addLabel: string = 'Add tab',
  onAdd?: () => void,
): any {
  const elements: any[] = [];
  tabs.forEach((tab) => {
    const isActive = tab.id === activeId;
    const isDisabled = Boolean(tab.disabled);
    const wrapperClass = [
      'forge-tabs__tab-wrapper',
      `forge-tabs__tab-wrapper--${variant}`,
      isActive ? 'forge-tabs__tab-wrapper--active' : undefined,
    ]
      .filter(Boolean)
      .join(' ');
    const tabClass = [
      'forge-tabs__tab',
      `forge-tabs__tab--${variant}`,
      isActive ? 'forge-tabs__tab--active' : undefined,
      isDisabled ? 'forge-tabs__tab--disabled' : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    const closeBtn =
      closable && !isDisabled
        ? h(
            'button',
            {
              type: 'button',
              className: 'forge-tabs__close',
              'aria-label': `Close ${tab.label}`,
              onClick: onClose
                ? (e: any) => {
                    e?.stopPropagation?.();
                    onClose(tab.id);
                  }
                : undefined,
            },
            '×',
          )
        : undefined;

    elements.push(
      h(
        'div',
        { key: tab.id, className: wrapperClass },
        h(
          'button',
          {
            id: `tab-${tab.id}`,
            type: 'button',
            role: 'tab',
            'aria-selected': isActive ? 'true' : 'false',
            'aria-controls': `panel-${tab.id}`,
            'aria-disabled': isDisabled ? 'true' : undefined,
            disabled: isDisabled || undefined,
            tabIndex: isActive ? 0 : -1,
            className: tabClass,
            onClick: onSelect && !isDisabled ? () => onSelect(tab.id) : undefined,
          },
          h(
            'span',
            {
              className: [
                'forge-typography',
                'forge-typography--body-sm',
                isActive ? 'forge-typography--weight-semibold' : 'forge-typography--weight-regular',
              ].join(' '),
            },
            tab.label,
          ),
          closeBtn,
        ),
      ),
    );
  });

  if (addable) {
    elements.push(
      h(
        'button',
        {
          key: '__add_tab',
          type: 'button',
          className: 'forge-tabs__add',
          'aria-label': addLabel,
          onClick: onAdd ? () => onAdd() : undefined,
        },
        '+',
      ),
    );
  }

  return elements;
}

export function renderPaginationControls(
  currentPage: number = 1,
  totalPages: number = 1,
  maxVisiblePages: number = 7,
  showEdges: boolean = false,
  onPageChange?: (page: number) => void,
): any {
  const current = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const total = Math.max(1, totalPages);

  const controls: any[] = [];

  const button = (
    key: string,
    label: string,
    ariaLabel: string,
    target: number,
    disabled: boolean,
    active: boolean,
    modifier: string,
  ) => {
    return h(
      'li',
      { key, className: 'forge-pagination__item' },
      h(
        'button',
        {
          type: 'button',
          className: [
            'forge-pagination__button',
            modifier ? `forge-pagination__button--${modifier}` : undefined,
            active ? 'forge-pagination__button--active' : undefined,
          ]
            .filter(Boolean)
            .join(' '),
          'aria-label': ariaLabel,
          'aria-current': active ? 'page' : undefined,
          disabled: disabled || undefined,
          onClick: onPageChange && !disabled ? () => onPageChange(target) : undefined,
        },
        label,
      ),
    );
  };

  const ellipsis = (key: string) =>
    h(
      'li',
      { key, className: 'forge-pagination__item' },
      h('span', { 'aria-hidden': 'true', className: 'forge-pagination__ellipsis' }, '…'),
    );

  if (showEdges) {
    controls.push(button('edge-first', '«', 'First page', 1, current === 1, false, 'edge'));
  }
  controls.push(button('nav-prev', '‹', 'Previous page', current - 1, current === 1, false, 'prev'));

  if (total <= maxVisiblePages) {
    for (let p = 1; p <= total; p++) {
      controls.push(button(`page-${p}`, String(p), `Page ${p}`, p, false, p === current, 'page'));
    }
  } else {
    const sideItems = Math.floor((maxVisiblePages - 3) / 2);
    let left = Math.max(2, current - sideItems);
    let right = Math.min(total - 1, current + sideItems);

    if (current <= sideItems + 2) {
      right = maxVisiblePages - 2;
      left = 2;
    } else if (current >= total - sideItems - 1) {
      left = total - (maxVisiblePages - 3);
      right = total - 1;
    }

    controls.push(button('page-1', '1', 'Page 1', 1, false, 1 === current, 'page'));
    if (left > 2) controls.push(ellipsis('ellipsis-left'));
    for (let p = left; p <= right; p++) {
      controls.push(button(`page-${p}`, String(p), `Page ${p}`, p, false, p === current, 'page'));
    }
    if (right < total - 1) controls.push(ellipsis('ellipsis-right'));
    controls.push(button(`page-${total}`, String(total), `Page ${total}`, total, false, total === current, 'page'));
  }

  controls.push(button('nav-next', '›', 'Next page', current + 1, current === total, false, 'next'));
  if (showEdges) {
    controls.push(button('edge-last', '»', 'Last page', total, current === total, false, 'edge'));
  }

  return controls;
}

export function renderCarouselIndicatorItems(
  total: number = 0,
  current: number = 0,
  clickable: boolean = true,
  variant: string = 'dots',
  onSelect?: (index: number) => void,
): any {
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const active = Number.isFinite(current) ? Math.min(Math.max(0, current), Math.max(0, count - 1)) : 0;
  return Array.from({ length: count }, (_, index) => {
    const isSelected = index === active;
    const spanClass = [
      `forge-carousel-indicator__${variant}`,
      isSelected ? 'forge-carousel-indicator__active' : undefined,
    ]
      .filter(Boolean)
      .join(' ');
    const spanChild = variant === 'numbers' ? String(index + 1) : undefined;
    if (clickable) {
      return h(
        'button',
        {
          key: index,
          type: 'button',
          role: 'tab',
          'aria-selected': isSelected ? 'true' : 'false',
          'aria-label': `Go to slide ${index + 1}`,
          className: 'forge-carousel-indicator__button',
          onClick: onSelect ? () => onSelect(index) : undefined,
        },
        h('span', { 'aria-hidden': 'true', className: spanClass }, spanChild),
      );
    }
    return h(
      'span',
      {
        key: index,
        role: 'tab',
        'aria-selected': isSelected ? 'true' : 'false',
        'aria-label': `Go to slide ${index + 1}`,
        className: spanClass,
      },
      spanChild,
    );
  });
}

export function renderBreadcrumbItems(items: readonly any[] = [], separator: string = '/'): any {
  return items.map((item, index) => {
    const isLast = index === items.length - 1;
    return h(
      'li',
      { key: index, className: 'forge-breadcrumb__item' },
      index > 0 ? h('span', { 'aria-hidden': 'true', className: 'forge-breadcrumb__separator' }, separator) : undefined,
      item.href && !isLast
        ? h('a', { href: item.href, className: 'forge-breadcrumb__link' }, item.label)
        : h(
            'span',
            { className: 'forge-breadcrumb__current', 'aria-current': isLast ? 'page' : undefined },
            item.label,
          ),
    );
  });
}

export function renderCatalogIcon(name: string, size: number = 20, color: string = 'currentColor'): any {
  const normalized = name.startsWith('forge-icon-') ? name : `forge-icon-${name}`;
  const isKnown = !normalized.includes('missing');
  const iconClass = isKnown ? normalized : 'forge-icon-alert';
  return h('svg', {
    class: iconClass,
    className: iconClass,
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: color,
    'aria-hidden': 'true',
  });
}

export function renderImageSources(sources?: readonly any[]): any {
  if (!sources || sources.length === 0) return undefined;
  return sources.map((source, index) =>
    h('source', {
      key: index,
      media: source.media,
      sizes: source.sizes,
      srcset: source.srcset,
      type: source.type,
    }),
  );
}

export function renderVideoSources(sources?: readonly any[]): any {
  if (!sources || sources.length === 0) return undefined;
  return sources.map((source, index) =>
    h('source', {
      key: index,
      src: source.src,
      type: source.type,
      media: source.media,
    }),
  );
}

export function resolveStatusIcon(catalog: Record<string, any>, status: string = 'neutral'): any {
  if (status === 'success') return catalog.ForgeIconCheck;
  if (status === 'warning') return catalog.ForgeIconWarning;
  if (status === 'error' || status === 'critical') return catalog.ForgeIconError;
  if (status === 'neutral') return catalog.ForgeIconMinus;
  return catalog.ForgeIconInfo;
}

export function createBackgroundVideoInlineStyle(minHeight: string = '24rem'): Record<string, string> {
  return { minHeight };
}

export function createResponsiveImageInlineStyle(aspectRatio?: string): Record<string, string> | undefined {
  return aspectRatio ? { aspectRatio } : undefined;
}

export function createResponsiveVideoInlineStyle(
  aspectRatio: string = '16 / 9',
  fit: string = 'contain',
): Record<string, string> {
  return { aspectRatio, objectFit: fit };
}

export function createSkeletonInlineStyle(width?: string, height?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (width) result.width = width;
  if (height) result.height = height;
  return result;
}

export function createAvatarContainerStyle(): Record<string, string> {
  return { position: 'relative', display: 'inline-flex' };
}

export function createAvatarImageImgStyle(): Record<string, string> {
  return { width: '100%', height: '100%', objectFit: 'cover' };
}

export function createCoverObjectFitStyle(): Record<string, string> {
  return { objectFit: 'cover' };
}

export function createObjectFitStyle(fit: string = 'cover'): Record<string, string> {
  return { objectFit: fit };
}

export function resolveTextVariantForQuote(size: string = 'md'): string {
  const map: Record<string, string> = {
    '2xs': 'body-sm',
    xs: 'body-md',
    sm: 'body-md',
    md: 'body-lg',
    lg: 'h4',
    xl: 'h3',
    '2xl': 'h2',
  };
  return map[size] ?? 'body-lg';
}

export function resolveSyncStatusLabel(status: string = 'synced', label?: string): string {
  if (label) return label;
  const DEFAULT_LABELS: Record<string, string> = {
    synced: 'Synced',
    syncing: 'Syncing…',
    pending: 'Waiting to sync',
    error: 'Sync failed',
    offline: 'Offline',
  };
  return DEFAULT_LABELS[status] ?? 'Synced';
}

export function createProgressBarPercent(
  value: number = 0,
  max: number = 100,
  indeterminate: boolean = false,
): { percent: number; percentLabel: string } {
  const percent = indeterminate ? 0 : Math.min(100, Math.max(0, (value / (max > 0 ? max : 100)) * 100));
  return { percent, percentLabel: `${Math.round(percent)}%` };
}

export function createAvatarInlineStyle(
  size: string = 'md',
  shape: string = 'circle',
  src?: string,
  variant: string = 'primary',
  color?: string,
): Record<string, string> {
  const SIZE_MAP: Record<string, string> = {
    '2xs': 'var(--mp-media-avatar-size-2xs, 20px)',
    xs: 'var(--mp-media-avatar-size-xs, 24px)',
    sm: 'var(--mp-media-avatar-size-sm, 32px)',
    md: 'var(--mp-media-avatar-size-md, 40px)',
    lg: 'var(--mp-media-avatar-size-lg, 56px)',
    xl: 'var(--mp-media-avatar-size-xl, 80px)',
    '2xl': 'var(--mp-media-avatar-size-2xl, 96px)',
  };
  const FONT_SIZE_MAP: Record<string, string> = {
    '2xs': 'var(--mp-size-font-2xs)',
    xs: 'var(--mp-size-font-xs)',
    sm: 'var(--mp-size-font-sm)',
    md: 'var(--mp-size-font-md)',
    lg: 'var(--mp-size-font-lg)',
    xl: 'var(--mp-size-font-xl)',
    '2xl': 'var(--mp-size-font-2xl)',
  };
  const VARIANT_COLOR_MAP: Record<string, string> = {
    neutral: 'var(--mp-media-avatar-surface-neutral)',
    primary: 'var(--mp-media-avatar-surface-primary)',
    secondary: 'var(--mp-media-avatar-surface-secondary)',
    tertiary: 'var(--mp-media-avatar-surface-tertiary)',
    success: 'var(--mp-media-avatar-surface-success)',
    warning: 'var(--mp-media-avatar-surface-warning)',
    info: 'var(--mp-media-avatar-surface-info)',
    error: 'var(--mp-media-avatar-surface-error)',
    critical: 'var(--mp-media-avatar-surface-critical)',
  };
  const dimension = SIZE_MAP[size] ?? SIZE_MAP.md;
  const style: Record<string, string> = {
    width: dimension,
    height: dimension,
    borderRadius: shape === 'circle' ? 'var(--mp-media-avatar-radius-circle)' : 'var(--mp-media-avatar-radius-square)',
    fontSize: FONT_SIZE_MAP[size] ?? FONT_SIZE_MAP.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: '0',
    color: 'var(--mp-media-avatar-text-default)',
    fontWeight: 'var(--mp-font-weight-semibold)',
    fontFamily: 'var(--mp-font-family-sans)',
    userSelect: 'none',
  };
  if (!src) {
    style.backgroundColor = color ?? VARIANT_COLOR_MAP[variant] ?? VARIANT_COLOR_MAP.primary;
  }
  return style;
}

export function createAvatarStatusInlineStyle(
  size: string = 'md',
  status?: string,
): Record<string, string> | undefined {
  if (!status) return undefined;
  const STATUS_SIZE_MAP: Record<string, string> = {
    '2xs': 'var(--mp-media-avatar-status-size-2xs, 5px)',
    xs: 'var(--mp-media-avatar-status-size-xs, 6px)',
    sm: 'var(--mp-media-avatar-status-size-sm, 8px)',
    md: 'var(--mp-media-avatar-status-size-md, 10px)',
    lg: 'var(--mp-media-avatar-status-size-lg, 13px)',
    xl: 'var(--mp-media-avatar-status-size-xl, 18px)',
    '2xl': 'var(--mp-media-avatar-status-size-2xl, 22px)',
  };
  const STATUS_COLOR_MAP: Record<string, string> = {
    online: 'var(--mp-media-avatar-status-online)',
    offline: 'var(--mp-media-avatar-status-offline)',
    away: 'var(--mp-media-avatar-status-away)',
    busy: 'var(--mp-media-avatar-status-busy)',
  };
  const sSize = STATUS_SIZE_MAP[size] ?? STATUS_SIZE_MAP.md;
  return {
    position: 'absolute',
    bottom: '0',
    right: '0',
    width: sSize,
    height: sSize,
    borderRadius: 'var(--mp-media-avatar-radius-status)',
    backgroundColor: STATUS_COLOR_MAP[status] ?? 'var(--mp-media-avatar-status-online)',
    border: 'var(--mp-media-avatar-status-border-width, 2px) solid var(--mp-media-avatar-border-status)',
    display: 'block',
  };
}

export function createGaugeInlineMath(
  value: number = 0,
  min: number = 0,
  max: number = 100,
): {
  clampedValue: number;
  percentage: number;
  displayValue: string;
  dashOffset: number;
} {
  const ARC_RADIUS = 45;
  const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
  const range = max > min ? max - min : 1;
  const clampedValue = Math.min(max, Math.max(min, value));
  const percentage = Math.round(((clampedValue - min) / range) * 100);
  const displayValue = `${percentage}%`;
  const dashOffset = ARC_CIRCUMFERENCE * (1 - percentage / 100);
  return { clampedValue, percentage, displayValue, dashOffset };
}

export function resolveCatalogIcon(catalog: Record<string, any>, name: string): any {
  const normalized = name.startsWith('forge-icon-') ? name : `forge-icon-${name}`;
  const exportName = normalized
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
  const candidate = catalog[exportName];
  if (typeof candidate === 'function' || typeof candidate === 'object') {
    return candidate;
  }
  return catalog.ForgeIconAlert ?? catalog.ForgeIconBell;
}

export function createContainerInlineStyle(
  variant: string = 'responsive',
  maxWidth: string = 'lg',
  gutter: string = 'md',
  center: boolean = true,
): Record<string, string> {
  const MAX_WIDTH: Record<string, string> = {
    sm: '40rem',
    md: '48rem',
    lg: '64rem',
    xl: '80rem',
    '2xl': '96rem',
  };
  const style: Record<string, string> = {
    boxSizing: 'border-box',
    width: '100%',
    paddingInline: `var(--mp-spacing-${gutter})`,
  };
  if (center) {
    style.marginInline = 'auto';
  }
  if (variant === 'fixed') {
    style.maxWidth = MAX_WIDTH[maxWidth] ?? '64rem';
  } else if (variant === 'fluid') {
    style.maxWidth = 'none';
  }
  return style;
}

export function createGridLayoutInlineStyle(
  rows: number = 1,
  columns: number = 1,
  gap: string = 'md',
): Record<string, string> {
  const SPACING: Record<string, string> = {
    '2xs': 'var(--mp-spacing-1)',
    xs: 'var(--mp-spacing-2)',
    sm: 'var(--mp-spacing-3)',
    md: 'var(--mp-spacing-4)',
    lg: 'var(--mp-spacing-6)',
    xl: 'var(--mp-spacing-8)',
    '2xl': 'var(--mp-spacing-12)',
  };
  const rowCount = Math.max(1, Math.floor(rows));
  const columnCount = Math.max(1, Math.floor(columns));
  return {
    '--forge-grid-columns': `repeat(${columnCount}, minmax(0, 1fr))`,
    '--forge-grid-rows': `repeat(${rowCount}, minmax(0, auto))`,
    gap: SPACING[gap] ?? `var(--mp-spacing-${gap})`,
  };
}

export function createVerticalLayoutInlineStyle(gap: string = 'var(--mp-spacing-4)'): Record<string, string> {
  return {
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: gap ? gap : 'var(--mp-spacing-4)',
  };
}

export function createForgeComponentStyle<T extends Record<string, string | undefined>>(
  prefix: string,
  properties?: T,
  style?: Record<string, string>,
): Record<string, string> | undefined {
  const result: Record<string, string> = style ? { ...style } : {};
  let count = Object.keys(result).length;
  if (properties) {
    for (const [key, value] of Object.entries(properties)) {
      if (value !== undefined) {
        result[toForgePropertyName(key, prefix)] = value;
        count++;
      }
    }
  }
  return count > 0 ? result : undefined;
}

/**
 * The **reserved** attributes every JSX element accepts on top of the properties
 * it declares itself, wired up as `JSX.IntrinsicAttributes` by the opt-in
 * `@mission-platform/forge-jsx/jsx-globals` typings.
 *
 * - `key` identifies an entry in a rendered list so the target framework can
 *   reconcile it across updates (React's `key`, Vue's `:key`).
 * - `slot` routes this element into a **named slot** of its parent component
 *   (`<ForgeIcon slot="start" />`). The compiler turns it into a Vue
 *   `<template #start>` block / a React `start` prop, and the runtime adapters
 *   fold it into the parent's props (see `collectSlottedChildren`). Omitted (or
 *   `"default"`) means the default slot.
 *
 * Neither is part of a component's own props contract — both are read by the
 * *parent* (the reconciler, the slot router), never by the component itself —
 * so they are accepted for every element here rather than declared on each
 * props interface.
 */
export interface MpReservedProperties {
  key?: string | number;
  slot?: string;
}

/**
 * A component authored in the neutral JSX dialect: a pure function of its
 * properties returning a single {@link MpElement}.
 *
 * `P` is intentionally **unconstrained**: a component's props interface
 * declares only the properties it actually accepts, and such an interface has
 * no implicit index signature, so constraining `P` to a record type would
 * reject every honest props declaration.
 */
export type MpComponent<P = MpPropertyBag> = (properties: P) => MpElement;

/**
 * The type of the {@link Fragment} factory. Its only prop is `children`, and it
 * deliberately has **no** index signature, because the classic transform
 * synthesises a `{ children }` object for a `<>…</>` fragment and type-checks it
 * (not as a fresh object literal) against the factory's parameter — an
 * index-signature-bearing parameter would reject it with TS2322 ("Index
 * signature for type 'string' is missing").
 */
export type MpFragment = (properties?: { readonly children?: MpChild | readonly MpChild[] }) => MpElement;

/**
 * Marker used as the element `type` for a named slot (`<Slot name="…" />`).
 *
 * Like {@link Fragment}, it is a function-component marker so the classic `h`
 * factory accepts `<Slot name="…" />` as a valid JSX element type.
 * It is never actually invoked, though: the build-time compiler
 * (`@mission-platform/vite-plugin-forge`) rewrites every `<Slot>` to the target
 * framework's own slot mechanism, and the runtime adapters intercept it by
 * identity (`type === Slot`) before any call. Calling it directly is a bug.
 */
export const Slot: MpComponent = (props: any) => {
  return (props?.children ?? null) as unknown as MpElement;
};

/** Anything that may appear as an element type in the neutral tree. */
export type MpElementType = string | MpFragment | MpComponent;

/** A single child slot in the neutral tree. */
export type MpChild = MpElement | string | number | boolean | null | undefined;

/** Synchronous or recursively asynchronous content accepted by Suspense. */
export type MpSuspenseChild = MpChild | PromiseLike<MpSuspenseChild> | readonly MpSuspenseChild[];

/** A node in the framework-neutral virtual tree produced by {@link h}. */
export interface MpElement {
  readonly __mpElement: true;
  readonly type: MpElementType;
  readonly properties: MpPropertyBag;
  readonly children: readonly MpChild[];
}

/** Narrow an arbitrary value to an {@link MpElement}. */
export function isMpElement(value: unknown): value is MpElement {
  return typeof value === 'object' && value !== null && (value as { __mpElement?: unknown }).__mpElement === true;
}
