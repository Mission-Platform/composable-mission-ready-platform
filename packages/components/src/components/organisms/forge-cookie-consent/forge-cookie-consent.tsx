import {
  classNames,
  hasSlot,
  type MpChild,
  type MpElement,
  Slot,
  useEffect,
  useId,
  useRef,
  useState,
} from '@mission-platform/forge';

import styles from './forge-cookie-consent.module.scss';

/** Size token controlling the consent surface scale. */
export type CookieConsentSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A user-configurable cookie category. */
export interface CookieCategory {
  /** Stable storage key for this category. */
  id: string;
  /** Label shown to the user. */
  label: string;
  /** Optional explanation of the category. */
  description?: string;
  /** Required categories are always enabled. */
  required?: boolean;
  /** Initial preference when no stored consent exists. Defaults to `false`. */
  defaultEnabled?: boolean;
}

/** The consent payload emitted to the host application and persisted in storage. */
export interface CookieConsentState {
  /** Whether the user has completed the consent flow. */
  decided: boolean;
  /** Enabled state keyed by `CookieCategory.id`. */
  categories: Record<string, boolean>;
  /** Unix timestamp in milliseconds when the decision was made. */
  timestamp: number;
}

export interface CookieConsentProperties {
  /** Optional additional content in the banner. */
  children?: MpChild | readonly MpChild[];
  /** Optional content slot rendered in the banner. */
  content?: MpChild;
  /** Categories available in the preferences dialog. */
  categories: CookieCategory[];
  /** Whether the banner is open. Omit for internally managed state. */
  open?: boolean;
  /** Banner heading. Defaults to `'Your privacy matters'`. */
  title?: string;
  /** Banner explanation. */
  description?: string;
  /** Optional privacy-policy destination. */
  privacyPolicyUrl?: string;
  /** Optional privacy-policy destination (legacy alias). */
  policyHref?: string;
  /** Label for the policy link. */
  policyLabel?: string;
  /** Whether the banner is initially shown. Defaults to `true`. */
  defaultOpen?: boolean;
  /** Storage key. Defaults to `'forge-cookie-consent'`. */
  storageKey?: string;
  /** Persistence medium. Defaults to `'local'`. */
  storage?: 'local' | 'session';
  /** Size token. Defaults to `'md'`. */
  size?: CookieConsentSize;
  /** Banner placement. Defaults to `'bottom'`. */
  position?: 'top' | 'bottom';
  /** Label for enabling every category. */
  acceptLabel?: string;
  /** Label for enabling required categories only. */
  rejectLabel?: string;
  /** Label for opening the preferences dialog. */
  manageLabel?: string;
  /** Label for saving category preferences. */
  saveLabel?: string;
  /** Called after a decision is made. */
  onConsent?: (state: CookieConsentState) => void;
  /** Called after all categories are accepted. */
  onAccept?: (state: CookieConsentState) => void;
  /** Called after optional categories are rejected. */
  onReject?: (state: CookieConsentState) => void;
  /** Called after customized categories are saved. */
  onCustomize?: (state: CookieConsentState) => void;
  /** Called whenever visibility changes. */
  onOpenChange?: (open: boolean) => void;
}

function initialCategories(categories: CookieCategory[], all: boolean): Record<string, boolean> {
  return Object.fromEntries(
    categories.map((category) => [category.id, category.required === true || all || category.defaultEnabled === true]),
  );
}

function readStoredConsent(key: string, storageType: 'local' | 'session'): CookieConsentState | undefined {
  if (globalThis.window === undefined) {
    return undefined;
  }
  try {
    const storage = storageType === 'session' ? globalThis.sessionStorage : globalThis.localStorage;
    const value = storage.getItem(key);
    if (value === null) {
      return undefined;
    }
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('decided' in parsed) ||
      typeof parsed.decided !== 'boolean' ||
      !('categories' in parsed) ||
      typeof parsed.categories !== 'object' ||
      parsed.categories === null ||
      !('timestamp' in parsed) ||
      typeof parsed.timestamp !== 'number' ||
      !Number.isFinite(parsed.timestamp)
    ) {
      return undefined;
    }
    return parsed as CookieConsentState;
  } catch {
    return undefined;
  }
}

/**
 * A consent banner and accessible preferences dialog with required-category
 * enforcement and guarded local/session storage persistence.
 */
export function ForgeCookieConsent(properties: Readonly<CookieConsentProperties>): MpElement {
  const {
    categories,
    open: controlledOpen,
    title = 'Your privacy matters',
    description = 'We use cookies to improve your experience. Choose which categories you allow.',
    privacyPolicyUrl,
    policyHref,
    policyLabel = 'Privacy policy',
    defaultOpen = true,
    storageKey = 'forge-cookie-consent',
    storage: storageType = 'local',
    size = 'md',
    position = 'bottom',
    acceptLabel = 'Accept all',
    rejectLabel = 'Reject non-essential',
    manageLabel = 'Customize',
    saveLabel = 'Save preferences',
  } = properties;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(initialCategories(categories, false));
  const bannerTitleId = `${useId().replaceAll(/[^a-zA-Z0-9_-]/g, '') || 'instance'}-cookie-title`;
  const dialogTitleId = `${useId().replaceAll(/[^a-zA-Z0-9_-]/g, '') || 'instance'}-cookie-dialog-title`;
  const dialogReference = useRef<HTMLElement | null>(null);
  const open = controlledOpen ?? internalOpen;

  useEffect(() => {
    const stored = readStoredConsent(storageKey, storageType);
    if (stored?.decided === true) {
      const storedCategories = Object.fromEntries(
        categories.map((category) => [
          category.id,
          category.required === true || stored.categories[category.id] === true,
        ]),
      );
      const enabledMatchesStored =
        categories.every((category) => enabled[category.id] === storedCategories[category.id]) &&
        Object.keys(enabled).length === categories.length;
      if (!enabledMatchesStored) {
        setEnabled(storedCategories);
      }
      if (controlledOpen === undefined && internalOpen) {
        setInternalOpen(false);
        properties.onOpenChange?.(false);
      }
    }
  }, [categories, controlledOpen, enabled, internalOpen, properties, storageKey, storageType]);

  useEffect(() => {
    if (!settingsOpen || globalThis.document === undefined) {
      return;
    }
    dialogReference.current?.focus();
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSettingsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [settingsOpen]);

  const updateVisibility = (next: boolean): void => {
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
    properties.onOpenChange?.(next);
  };

  const commit = (next: Record<string, boolean>, action: 'accept' | 'reject' | 'customize'): void => {
    const state: CookieConsentState = { decided: true, categories: next, timestamp: Date.now() };
    try {
      if (globalThis.window !== undefined) {
        const storage = storageType === 'session' ? globalThis.sessionStorage : globalThis.localStorage;
        storage.setItem(storageKey, JSON.stringify(state));
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    setEnabled(next);
    setSettingsOpen(false);
    updateVisibility(false);
    properties.onConsent?.(state);
    if (action === 'accept') {
      properties.onAccept?.(state);
    } else if (action === 'reject') {
      properties.onReject?.(state);
    } else {
      properties.onCustomize?.(state);
    }
  };

  const acceptAll = (): void => commit(initialCategories(categories, true), 'accept');
  const rejectOptional = (): void => commit(initialCategories(categories, false), 'reject');

  const settings = settingsOpen ? (
    <div
      className={styles['forge-cookie-consent__overlay']}
      onClick={(event: MouseEvent) => {
        if (event.target === event.currentTarget) {
          setSettingsOpen(false);
        }
      }}
    >
      <section
        aria-labelledby={dialogTitleId}
        aria-label="Cookie preferences"
        aria-modal="true"
        className={classNames(styles['forge-cookie-consent__dialog'], styles[`forge-cookie-consent--${size}`])}
        ref={dialogReference}
        role="dialog"
        tabIndex={-1}
      >
        <h2 id={dialogTitleId}>{title}</h2>
        <div className={styles['forge-cookie-consent__categories']}>
          {categories.map((category) => (
            <label
              className={styles['forge-cookie-consent__category']}
              key={category.id}
            >
              <input
                checked={enabled[category.id] ?? category.required === true}
                disabled={category.required === true}
                onChange={(event: Event) => {
                  const checked = (event.currentTarget as HTMLInputElement).checked;
                  setEnabled((current) => ({ ...current, [category.id]: checked }));
                }}
                type="checkbox"
              />
              <span>
                <strong>{category.label}</strong>
                {category.required ? (
                  <small>Always active</small>
                ) : category.description ? (
                  <small>{category.description}</small>
                ) : undefined}
              </span>
            </label>
          ))}
        </div>
        <div className={styles['forge-cookie-consent__actions']}>
          <button
            onClick={() => setSettingsOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              commit(
                Object.fromEntries(
                  categories.map((category) => [
                    category.id,
                    category.required === true || enabled[category.id] === true,
                  ]),
                ),
                'customize',
              )
            }
            type="button"
          >
            {saveLabel}
          </button>
        </div>
      </section>
    </div>
  ) : undefined;

  if (!open) {
    return <>{settings}</>;
  }

  return (
    <>
      <aside
        aria-labelledby={bannerTitleId}
        className={classNames(
          styles['forge-cookie-consent'],
          styles[`forge-cookie-consent--${position}`],
          styles[`forge-cookie-consent--${size}`],
        )}
        role="region"
      >
        <div className={styles['forge-cookie-consent__content']}>
          <h2 id={bannerTitleId}>{title}</h2>
          <p>{description}</p>
          {(privacyPolicyUrl ?? policyHref) ? <a href={privacyPolicyUrl ?? policyHref}>{policyLabel}</a> : undefined}
          <ul className={styles['forge-cookie-consent__summary']}>
            {categories.map((category) => (
              <li key={category.id}>{category.label}</li>
            ))}
          </ul>
          {hasSlot('content') ? <Slot name="content">{properties.content}</Slot> : undefined}
          {properties.children === undefined ? undefined : <Slot />}
        </div>
        <div className={styles['forge-cookie-consent__actions']}>
          <button
            onClick={rejectOptional}
            type="button"
          >
            {rejectLabel}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            {manageLabel}
          </button>
          <button
            onClick={acceptAll}
            type="button"
          >
            {acceptLabel}
          </button>
        </div>
      </aside>
      {settings}
    </>
  );
}
