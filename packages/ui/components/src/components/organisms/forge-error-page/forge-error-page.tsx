import {
  classNames,
  hasSlot,
  Slot,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import styles from './forge-error-page.module.scss';

/** Size token controlling the error page scale. */
export type ErrorPageSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Visual treatment of an error action. */
export type ErrorPageActionVariant = 'primary' | 'secondary' | 'ghost';

/** Structured error information that can be passed as one public data object. */
export interface ErrorPageData {
  /** HTTP or application error code. */
  status?: number | string;
  /** Main heading. */
  title: string;
  /** Explanation shown below the heading. */
  message: string;
}

/** An action displayed below the error message. */
export interface ErrorPageAction {
  /** Stable key for the action. */
  id: string;
  /** Visible action label. */
  label: string;
  /** Optional link destination. */
  href?: string;
  /** Button treatment. Defaults to `'primary'` for the first action. */
  variant?: ErrorPageActionVariant;
  /** Whether this action is disabled. */
  disabled?: boolean;
  /** Called for button actions. */
  onClick?: () => void;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ErrorPageStyleProperties {
  readonly 'border-radius-sm'?: string;
  readonly 'color-action-primary'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-surface-secondary'?: string;
  readonly 'color-text-on-action'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-8'?: string;
}

export type ErrorPageStyle = CSSStyleProperties & {
  readonly '--forge-error-page-border-radius-sm'?: string | undefined;
  readonly '--forge-error-page-color-action-primary'?: string | undefined;
  readonly '--forge-error-page-color-border-default'?: string | undefined;
  readonly '--forge-error-page-color-surface-secondary'?: string | undefined;
  readonly '--forge-error-page-color-text-on-action'?: string | undefined;
  readonly '--forge-error-page-color-text-primary'?: string | undefined;
  readonly '--forge-error-page-color-text-secondary'?: string | undefined;
  readonly '--forge-error-page-spacing-2'?: string | undefined;
  readonly '--forge-error-page-spacing-3'?: string | undefined;
  readonly '--forge-error-page-spacing-4'?: string | undefined;
  readonly '--forge-error-page-spacing-8'?: string | undefined;
};

function createErrorPageStyle(properties: Readonly<ErrorPageStyleProperties> | undefined): ErrorPageStyle | undefined {
  return createForgeStyle({
    '--forge-error-page-border-radius-sm': properties?.['border-radius-sm'],
    '--forge-error-page-color-action-primary': properties?.['color-action-primary'],
    '--forge-error-page-color-border-default': properties?.['color-border-default'],
    '--forge-error-page-color-surface-secondary': properties?.['color-surface-secondary'],
    '--forge-error-page-color-text-on-action': properties?.['color-text-on-action'],
    '--forge-error-page-color-text-primary': properties?.['color-text-primary'],
    '--forge-error-page-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-error-page-spacing-2': properties?.['spacing-2'],
    '--forge-error-page-spacing-3': properties?.['spacing-3'],
    '--forge-error-page-spacing-4': properties?.['spacing-4'],
    '--forge-error-page-spacing-8': properties?.['spacing-8'],
  }) as ErrorPageStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ErrorPageProperties {
  /** Optional structured error data; individual props take precedence. */
  data?: ErrorPageData;
  /** Optional content in the illustration, actions, or default slots. */
  children?: MpChild | readonly MpChild[];
  /** Optional illustration slot. */
  illustration?: MpChild;
  /** Optional actions slot. */
  actions?: ErrorPageAction[] | MpChild;
  /** Optional additional action slot (legacy alias). */
  actionSlot?: MpChild;
  /** HTTP or application error code. */
  code?: number | string;
  /** Explanation shown below the heading. */
  description?: string;
  /** Render a link to `homeUrl`. */
  showHomeLink?: boolean;
  /** Home link destination. Defaults to `'/'`. */
  homeUrl?: string;
  /** Label for the home link. */
  homeLabel?: string;
  /** HTTP or application error code (legacy alias). */
  status?: number | string;
  /** Main heading. */
  title?: string;
  /** Explanation shown below the heading. */
  message?: string;
  /** Size token. Defaults to `'md'`. */
  size?: ErrorPageSize;
  /** Accessible label for the page landmark. */
  ariaLabel?: string;
  /** Label for the retry callback convenience action. */
  retryLabel?: string;
  /** Optional retry action appended after `actions`. */
  onRetry?: () => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ErrorPageStyleProperties>;
}

/** A semantic, slot-friendly error state page with typed action descriptors. */
export function ForgeErrorPage(properties: Readonly<ErrorPageProperties>): MpElement {
  const style = createErrorPageStyle(properties.properties);

  const {
    data,
    code,
    status,
    title: requestedTitle,
    message,
    description,
    actions = [],
    size = 'md',
    ariaLabel = 'Error page',
    retryLabel = 'Try again',
    onRetry,
  } = properties;
  const resolvedCode = code ?? data?.status ?? status;
  const defaultTitle =
    resolvedCode === 404 ? 'Page not found' : resolvedCode === 403 ? 'Access denied' : 'Something went wrong';
  const title = requestedTitle ?? data?.title ?? defaultTitle;
  const resolvedDescription = description ?? message ?? data?.message ?? 'We were unable to complete your request.';
  const actionItems = Array.isArray(actions) ? actions : [];
  const allActions =
    onRetry === undefined ? actionItems : [...actionItems, { id: 'retry', label: retryLabel, onClick: onRetry }];
  const actionContent = !Array.isArray(actions) && actions !== undefined ? actions : undefined;
  const hasActions =
    allActions.length > 0 ||
    actionContent !== undefined ||
    properties.actionSlot !== undefined ||
    (hasSlot('actions') && !Array.isArray(actions)) ||
    hasSlot('actionSlot') ||
    properties.showHomeLink === true;

  return (
    <main
      aria-label={ariaLabel}
      className={classNames(styles['forge-error-page'], styles[`forge-error-page--${size}`])}
      role="main"
      style={style}
    >
      {hasSlot('illustration') || properties.illustration !== undefined ? (
        <div
          aria-hidden="true"
          className={styles['forge-error-page__illustration']}
        >
          <Slot name="illustration">{properties.illustration}</Slot>
        </div>
      ) : undefined}
      {resolvedCode === undefined ? undefined : (
        <p
          aria-label={`Error ${resolvedCode}`}
          className={styles['forge-error-page__status']}
        >
          {resolvedCode}
        </p>
      )}
      <h1>{title}</h1>
      <p className={styles['forge-error-page__message']}>{resolvedDescription}</p>
      {properties.children === undefined ? undefined : (
        <div className={styles['forge-error-page__content']}>
          <Slot />
        </div>
      )}
      {hasActions ? (
        <div className={styles['forge-error-page__actions']}>
          {allActions.map((action, index) => {
            const variant = action.variant ?? (index === 0 ? 'primary' : 'secondary');
            return action.href ? (
              <a
                aria-disabled={action.disabled ? 'true' : undefined}
                className={classNames(
                  styles['forge-error-page__action'],
                  styles[`forge-error-page__action--${variant}`],
                )}
                href={action.disabled ? undefined : action.href}
                key={action.id}
                tabIndex={action.disabled ? -1 : undefined}
              >
                {action.label}
              </a>
            ) : (
              <button
                className={classNames(
                  styles['forge-error-page__action'],
                  styles[`forge-error-page__action--${variant}`],
                )}
                disabled={action.disabled}
                key={action.id}
                onClick={action.onClick}
                type="button"
              >
                {action.label}
              </button>
            );
          })}
          {properties.showHomeLink ? (
            <a
              className={classNames(styles['forge-error-page__action'], styles['forge-error-page__action--primary'])}
              href={properties.homeUrl ?? '/'}
            >
              {properties.homeLabel ?? 'Go home'}
            </a>
          ) : undefined}
          {actionContent !== undefined || (hasSlot('actions') && !Array.isArray(actions)) ? (
            <Slot name="actions">{actionContent}</Slot>
          ) : undefined}
          {hasSlot('actionSlot') ? <Slot name="actionSlot">{properties.actionSlot}</Slot> : undefined}
        </div>
      ) : undefined}
    </main>
  );
}
