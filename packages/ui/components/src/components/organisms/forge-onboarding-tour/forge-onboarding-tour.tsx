import {
  classNames,
  hasSlot,
  Slot,
  useEffect,
  useId,
  useRef,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-onboarding-tour.module.scss';

/** Size token controlling the tour dialog scale. */
export type OnboardingTourSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Placement preference for a tour dialog anchored to a target. */
export type OnboardingTourPlacement = 'top' | 'right' | 'bottom' | 'left' | 'center';

/** One guided step in an onboarding tour. */
export interface TourStep {
  /** Step heading. */
  title: string;
  /** Step explanation. */
  content: string;
  /** CSS selector for the element to spotlight. */
  target: string;
  /** Preferred dialog position around `target`. */
  placement?: OnboardingTourPlacement;
}

/** @deprecated Use `TourStep`. */
export type OnboardingStep = TourStep;

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface OnboardingTourStyleProperties {
  readonly 'border-radius-lg'?: string;
  readonly 'border-radius-sm'?: string;
  readonly 'color-action-primary'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-surface-primary'?: string;
  readonly 'color-text-on-action'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'overlay-modal-backdrop-surface'?: string;
  readonly 'shadow-xl'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-5'?: string;
}

export type OnboardingTourStyle = CSSStyleProperties & {
  readonly '--forge-onboarding-tour-border-radius-lg'?: string | undefined;
  readonly '--forge-onboarding-tour-border-radius-sm'?: string | undefined;
  readonly '--forge-onboarding-tour-color-action-primary'?: string | undefined;
  readonly '--forge-onboarding-tour-color-border-default'?: string | undefined;
  readonly '--forge-onboarding-tour-color-surface-primary'?: string | undefined;
  readonly '--forge-onboarding-tour-color-text-on-action'?: string | undefined;
  readonly '--forge-onboarding-tour-color-text-primary'?: string | undefined;
  readonly '--forge-onboarding-tour-color-text-secondary'?: string | undefined;
  readonly '--forge-onboarding-tour-overlay-modal-backdrop-surface'?: string | undefined;
  readonly '--forge-onboarding-tour-shadow-xl'?: string | undefined;
  readonly '--forge-onboarding-tour-spacing-2'?: string | undefined;
  readonly '--forge-onboarding-tour-spacing-3'?: string | undefined;
  readonly '--forge-onboarding-tour-spacing-4'?: string | undefined;
  readonly '--forge-onboarding-tour-spacing-5'?: string | undefined;
};

function createOnboardingTourStyle(
  properties: Readonly<OnboardingTourStyleProperties> | undefined,
): OnboardingTourStyle | undefined {
  return createForgeStyle({
    '--forge-onboarding-tour-border-radius-lg': properties?.['border-radius-lg'],
    '--forge-onboarding-tour-border-radius-sm': properties?.['border-radius-sm'],
    '--forge-onboarding-tour-color-action-primary': properties?.['color-action-primary'],
    '--forge-onboarding-tour-color-border-default': properties?.['color-border-default'],
    '--forge-onboarding-tour-color-surface-primary': properties?.['color-surface-primary'],
    '--forge-onboarding-tour-color-text-on-action': properties?.['color-text-on-action'],
    '--forge-onboarding-tour-color-text-primary': properties?.['color-text-primary'],
    '--forge-onboarding-tour-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-onboarding-tour-overlay-modal-backdrop-surface': properties?.['overlay-modal-backdrop-surface'],
    '--forge-onboarding-tour-shadow-xl': properties?.['shadow-xl'],
    '--forge-onboarding-tour-spacing-2': properties?.['spacing-2'],
    '--forge-onboarding-tour-spacing-3': properties?.['spacing-3'],
    '--forge-onboarding-tour-spacing-4': properties?.['spacing-4'],
    '--forge-onboarding-tour-spacing-5': properties?.['spacing-5'],
  }) as OnboardingTourStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface OnboardingTourProperties {
  /** Ordered tour steps. */
  steps: TourStep[];
  /** Optional default-slot content in the dialog. */
  children?: MpChild | readonly MpChild[];
  /** Optional scoped content slot in the dialog. */
  content?: MpChild;
  /** Whether the tour is visible. Omit for internally managed state. */
  open?: boolean;
  /** Whether the tour is visible (the `v-model` value). */
  modelValue?: boolean;
  /** Initial visibility when `open` is omitted. Defaults to `true`. */
  defaultOpen?: boolean;
  /** Initially active step index. Defaults to `0`. */
  initialStep?: number;
  /** Active step index. */
  currentStep?: number;
  /** Render the modal backdrop. Defaults to `true`. */
  overlay?: boolean;
  /** Dialog accessible label. Defaults to `'Product tour'`. */
  title?: string;
  /** Size token. Defaults to `'md'`. */
  size?: OnboardingTourSize;
  /** Storage key used when `persist` is enabled. */
  storageKey?: string;
  /** Remember a completed or skipped tour in local storage. Defaults to `false`. */
  persist?: boolean;
  /** Label for the next/finish button. */
  nextLabel?: string;
  /** Label for the previous button. */
  previousLabel?: string;
  /** Label for the skip button. */
  skipLabel?: string;
  /** Called when the active step changes. */
  onStepChange?: (step: TourStep, index: number) => void;
  /** Called when the tour requests a model value update. */
  onUpdate?: (open: boolean) => void;
  /** Called when the controlled active step changes. */
  onCurrentStepChange?: (index: number) => void;
  /** Called when the final step is completed. */
  onComplete?: () => void;
  /** Called when the tour is skipped or dismissed. */
  onSkip?: () => void;
  /** Called when visibility changes. */
  onOpenChange?: (open: boolean) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<OnboardingTourStyleProperties>;
}

function readCompleted(key: string): boolean {
  if (globalThis.window === undefined) {
    return false;
  }
  try {
    return globalThis.localStorage.getItem(key) === 'completed';
  } catch {
    return false;
  }
}

function writeCompleted(key: string): void {
  try {
    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem(key, 'completed');
    }
  } catch {
    // Storage may be blocked; completing the tour still works for this session.
  }
}

/** An accessible spotlight tour with keyboard navigation and optional completion persistence. */
export function ForgeOnboardingTour(properties: Readonly<OnboardingTourProperties>): MpElement {
  const style = createOnboardingTourStyle(properties.properties);

  const {
    steps,
    open,
    modelValue,
    defaultOpen = true,
    initialStep = 0,
    currentStep,
    overlay = true,
    size = 'md',
    storageKey = 'forge-onboarding-tour',
    persist = false,
    nextLabel = 'Next',
    previousLabel = 'Previous',
    skipLabel = 'Skip tour',
  } = properties;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, Math.min(currentStep ?? initialStep, Math.max(steps.length - 1, 0))),
  );
  const [targetStyle, setTargetStyle] = useState<Record<string, string>>({});
  const dialogReference = useRef<HTMLElement | null>(null);
  const headingId = `forge-onboarding-tour-title-${useId().replaceAll(/[^a-zA-Z0-9_-]/g, '') || 'instance'}`;
  const isOpen = modelValue ?? open ?? internalOpen;
  const step = steps[activeIndex];

  useEffect(() => {
    if (persist && readCompleted(storageKey) && modelValue === undefined && open === undefined) {
      setInternalOpen(false);
    }
  }, [persist, storageKey, modelValue, open]);

  useEffect(() => {
    if (currentStep === undefined) {
      return;
    }
    setActiveIndex(Math.max(0, Math.min(currentStep, Math.max(steps.length - 1, 0))));
  }, [currentStep, steps.length]);

  useEffect(() => {
    if (!isOpen || step?.target === undefined || globalThis.document === undefined) {
      setTargetStyle({});
      return;
    }
    const updateTarget = (): void => {
      let target: HTMLElement | undefined;
      try {
        target = document.querySelector<HTMLElement>(step.target as string) ?? undefined;
      } catch {
        target = undefined;
      }
      if (target === undefined) {
        setTargetStyle({});
        return;
      }
      const rect = target.getBoundingClientRect();
      setTargetStyle({
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    };
    updateTarget();
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [isOpen, step?.target]);

  useEffect(() => {
    if (isOpen) {
      dialogReference.current?.focus();
    }
  }, [isOpen, activeIndex]);

  useEffect(() => {
    if (!isOpen || globalThis.document === undefined) {
      return;
    }
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        skip();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft' && activeIndex > 0) {
        event.preventDefault();
        previous();
      }
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [isOpen, activeIndex, steps.length]);

  const close = (callback: (() => void) | undefined, remember: boolean): void => {
    if (remember && persist) {
      writeCompleted(storageKey);
    }
    if (open === undefined) {
      setInternalOpen(false);
    }
    properties.onOpenChange?.(false);
    properties.onUpdate?.(false);
    callback?.();
  };

  const complete = (): void => close(properties.onComplete, true);
  const skip = (): void => close(properties.onSkip, true);
  const next = (): void => {
    if (activeIndex >= steps.length - 1) {
      complete();
      return;
    }
    const nextIndex = activeIndex + 1;
    setActiveIndex(nextIndex);
    properties.onCurrentStepChange?.(nextIndex);
    const nextStep = steps[nextIndex];
    if (nextStep !== undefined) {
      properties.onStepChange?.(nextStep, nextIndex);
    }
  };
  const previous = (): void => {
    if (activeIndex === 0) {
      return;
    }
    const previousIndex = activeIndex - 1;
    setActiveIndex(previousIndex);
    properties.onCurrentStepChange?.(previousIndex);
    const previousStep = steps[previousIndex];
    if (previousStep !== undefined) {
      properties.onStepChange?.(previousStep, previousIndex);
    }
  };

  if (!isOpen || step === undefined) {
    return <></>;
  }

  const placement = step.placement ?? (step.target ? 'bottom' : 'center');
  return (
    <div
      className={styles['forge-onboarding-tour']}
      style={style}
    >
      {overlay ? (
        <div
          aria-hidden="true"
          className={classNames(styles['forge-onboarding-tour__backdrop'], {
            [styles['forge-onboarding-tour__backdrop--spotlight']]: Object.keys(targetStyle).length > 0,
          })}
          onClick={skip}
        />
      ) : undefined}
      {Object.keys(targetStyle).length > 0 ? (
        <div
          aria-hidden="true"
          className={styles['forge-onboarding-tour__spotlight']}
          style={targetStyle}
        />
      ) : undefined}
      <section
        aria-label={properties.title ?? 'Product tour'}
        aria-labelledby={headingId}
        aria-modal="true"
        className={classNames(
          styles['forge-onboarding-tour__dialog'],
          styles[`forge-onboarding-tour__dialog--${placement}`],
          styles[`forge-onboarding-tour--${size}`],
        )}
        ref={dialogReference}
        role="dialog"
        tabIndex={-1}
      >
        <div className={styles['forge-onboarding-tour__progress']}>
          Step {activeIndex + 1} of {steps.length}
        </div>
        <h2 id={headingId}>{step.title}</h2>
        <p>{step.content}</p>
        {hasSlot('content') ? (
          <Slot
            name="content"
            step={step}
            index={activeIndex}
          >
            {properties.content}
          </Slot>
        ) : undefined}
        {properties.children === undefined ? undefined : <Slot />}
        <div className={styles['forge-onboarding-tour__actions']}>
          <button
            onClick={skip}
            type="button"
          >
            {skipLabel}
          </button>
          {activeIndex > 0 ? (
            <button
              onClick={previous}
              type="button"
            >
              {previousLabel}
            </button>
          ) : undefined}
          <button
            onClick={next}
            type="button"
          >
            {activeIndex === steps.length - 1 ? 'Finish' : nextLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
