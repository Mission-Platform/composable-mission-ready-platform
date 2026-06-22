import { h, Slot, type MpChild, type MpElement, type MpProperties } from '@mission-platform/jsx';

import { BaseTypography } from '../base-typography';
import sizeStyles from '../size.module.scss';

import styles from './base-form-wizard.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type FormWizardSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** A single wizard step. */
export interface WizardStep {
  /** Stable step id. */
  id: string;
  /** Step title shown in the indicator. */
  title: string;
  /** Optional sub-label shown under the title. */
  description?: string;
  /** Render the step in an errored (highlighted) state. */
  error?: boolean;
  /**
   * Conditionally include the step in the wizard sequence. When `false`, the
   * step is omitted from the indicator and navigation entirely (a conditional
   * step). Defaults to `true`.
   */
  when?: boolean;
  /**
   * Per-step validity. When `false`, advancing past the step (via Next, the
   * final Finish, or a forward indicator jump) is blocked and the primary
   * button is disabled. The last visible step's `valid` therefore gates
   * completion (final-step validation). Defaults to `true`.
   */
  valid?: boolean;
  /** The step's body content (replaces the SFC's per-step scoped slot). */
  content?: MpChild;
}

export interface FormWizardProperties extends MpProperties {
  /** Size token controlling the wizard's font scale. Defaults to `'md'`. */
  size?: FormWizardSize;
  /** The ordered steps. */
  steps: WizardStep[];
  /** Active step index (controlled via `modelValue`). Defaults to `0`. */
  modelValue?: number;
  /** When `true`, the user may only jump at most one step ahead. Defaults to `true`. */
  linear?: boolean;
  /** Back button label. Defaults to `'Back'`. */
  backLabel?: string;
  /** Next button label. Defaults to `'Next'`. */
  nextLabel?: string;
  /** Finish button label (on the last step). Defaults to `'Finish'`. */
  finishLabel?: string;
  /** Optional footer content rendered before the navigation buttons — the `footer` named slot. */
  footer?: MpChild;
  /** Fired with the next active index (the controlled `v-model` update). */
  onUpdateModelValue?: (index: number) => void;
  /** Fired when the wizard advances. */
  onNext?: (index: number) => void;
  /** Fired when the wizard goes back. */
  onPrev?: (index: number) => void;
  /** Fired when the final step's Finish button is pressed. */
  onComplete?: () => void;
}

/**
 * `BaseFormWizard` — a multi-step form shell authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * It renders a clickable step indicator, the active step's body, and a
 * back/next/finish footer. It owns its styling through the co-located CSS Module
 * `base-form-wizard.module.scss`.
 *
 * Steps can be **conditional** (`step.when === false` removes a step from the
 * sequence) and **validated per step** (`step.valid === false` blocks Next, the
 * final Finish, and forward indicator jumps, and disables the primary button).
 * Because completion fires from the last visible step, that step's `valid`
 * doubles as the **final-step validation** gate. Validity is supplied by the
 * parent so the component stays controlled and framework-neutral.
 *
 * Substitutions from the original Vue SFC: the `BaseFormWizardSteps`/`Content`/
 * `Footer` sub-components are **inlined**; the per-step scoped/named slot for the
 * body becomes each step's `content` `MpChild` prop (the neutral dialect cannot
 * key a scoped slot by the dynamic active step); the footer slot becomes the
 * `footer` named slot (`<Slot>`); the `useI18n` labels become plain props; and
 * the `update:modelValue` + `next`/`prev`/`complete` emits become the callback
 * props. The active index stays **controlled** (`modelValue`).
 */
export function BaseFormWizard(properties: FormWizardProperties): MpElement {
  const {
    steps,
    modelValue = 0,
    linear = true,
    backLabel = 'Back',
    nextLabel = 'Next',
    finishLabel = 'Finish',
    size = 'md',
  } = properties;

  const visibleSteps = steps.filter((step) => step.when !== false);
  const current = Math.min(Math.max(modelValue, 0), Math.max(visibleSteps.length - 1, 0));
  const isFirst = current === 0;
  const isLast = current === visibleSteps.length - 1;
  const activeStep = visibleSteps[current];
  const canAdvance = activeStep ? activeStep.valid !== false : false;

  const goTo = (index: number): void => {
    if (index < 0 || index >= visibleSteps.length) {
      return;
    }
    if (index > current && !canAdvance) {
      return;
    }
    if (linear && index > current + 1) {
      return;
    }
    properties.onUpdateModelValue?.(index);
  };

  const next = (): void => {
    if (!canAdvance) {
      return;
    }
    if (isLast) {
      properties.onComplete?.();
      return;
    }
    const index = current + 1;
    properties.onUpdateModelValue?.(index);
    properties.onNext?.(index);
  };

  const previous = (): void => {
    if (isFirst) {
      return;
    }
    const index = current - 1;
    properties.onUpdateModelValue?.(index);
    properties.onPrev?.(index);
  };

  return (
    <div classNames={[styles['base-form-wizard'], sizeStyles[`base-size--${size}`]]}>
      <ol
        classNames={styles['base-form-wizard__steps']}
        role="list"
      >
        {visibleSteps.map((step, index) => (
          <li
            key={step.id}
            classNames={styles['base-form-wizard__step']}
          >
            <button
              aria-current={index === current ? 'step' : undefined}
              classNames={[styles['base-form-wizard__step-btn'], {
                [styles['base-form-wizard__step-btn--active']]: index === current,
                [styles['base-form-wizard__step-btn--done']]: index < current,
                [styles['base-form-wizard__step-btn--error']]: !!step.error,
              }]}
              disabled={(linear && index > current + 1) || (index > current && !canAdvance)}
              type="button"
              onClick={() => goTo(index)}
            >
              <span
                aria-hidden="true"
                classNames={styles['base-form-wizard__step-index']}
              >
                {index + 1}
              </span>
              <span classNames={styles['base-form-wizard__step-text']}>
                <BaseTypography
                  as="span"
                  color="inherit"
                  variant="label"
                >
                  {step.title}
                </BaseTypography>
                {step.description ? (
                  <BaseTypography
                    as="span"
                    color="secondary"
                    variant="caption"
                  >
                    {step.description}
                  </BaseTypography>
                ) : undefined}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div classNames={styles['base-form-wizard__content']}>{activeStep?.content}</div>

      <div classNames={styles['base-form-wizard__footer']}>
        <Slot name="footer" />
        <div classNames={styles['base-form-wizard__nav']}>
          <button
            classNames={[styles['base-form-wizard__button'], styles['base-form-wizard__button--secondary']]}
            disabled={isFirst}
            type="button"
            onClick={previous}
          >
            {backLabel}
          </button>
          <button
            classNames={[styles['base-form-wizard__button'], styles['base-form-wizard__button--primary']]}
            disabled={!canAdvance}
            type="button"
            onClick={next}
          >
            {isLast ? finishLabel : nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
