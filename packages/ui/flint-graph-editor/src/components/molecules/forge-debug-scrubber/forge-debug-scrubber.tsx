import { classNames, useEffect, useState, type MpElement } from '@mission-platform/forge-jsx';

import { TraceDebuggerController, type TraceExecutionStep } from '../../../debugger/trace-controller';

import styles from './forge-debug-scrubber.module.scss';

export interface DebugScrubberProperties {
  readonly controller: TraceDebuggerController;
  readonly className?: string;
}

/**
 * Safely extracts raw property value from event target.
 */
function extractEventTargetValue(event: unknown): unknown {
  const target = (event as { target?: { value?: unknown } } | undefined)?.target;
  return target?.value;
}

/**
 * Extracts numeric value from a DOM input event if valid.
 */
function extractInputNumberValue(event: unknown): number | undefined {
  const rawValue = extractEventTargetValue(event);
  if (typeof rawValue === 'number') {
    return rawValue;
  }
  if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
    return Number(rawValue);
  }
  return undefined;
}

const SPEED_PRESETS = [0.5, 1, 2] as const;

const DEFAULT_PLAYBACK_STATE = {
  isPlaying: false,
  currentStep: 0,
  totalSteps: 0,
  playbackSpeed: 1,
};

/**
 * Computes disabled state flags for scrubber controls.
 */
function computeScrubberFlags(controller: unknown, currentStepIndex: number, totalSteps: number) {
  const disabledPrevious = !controller || currentStepIndex === 0;
  const disabledNext = !controller || currentStepIndex >= totalSteps - 1;
  const disabledAction = !controller || totalSteps === 0;
  return {
    disabledPrevious,
    disabledNext,
    disabledPlay: disabledAction,
    disabledSlider: disabledAction,
    displayStep: totalSteps > 0 ? currentStepIndex + 1 : 0,
  };
}

/**
 * Framework-neutral Forge playback scrubber for Flint execution traces.
 */
export function ForgeDebugScrubber(properties: Readonly<DebugScrubberProperties>): MpElement {
  const controller = properties?.controller;
  const initialPlaybackState = controller?.getPlaybackState() ?? DEFAULT_PLAYBACK_STATE;
  const initialStep = controller?.getCurrentStep();
  const [playbackState, setPlaybackState] = useState(initialPlaybackState);
  const [currentStep, setCurrentStep] = useState<TraceExecutionStep | undefined>(initialStep);

  useEffect(() => {
    if (!controller) return;
    setPlaybackState(controller.getPlaybackState());
    setCurrentStep(controller.getCurrentStep());
    const unsubscribe = controller.subscribe((step) => {
      setCurrentStep(step);
      setPlaybackState(controller.getPlaybackState());
    });
    return () => {
      unsubscribe();
    };
  }, [controller]);

  /**
   * Toggles playback between playing and paused states.
   */
  const handleTogglePlay = (): void => {
    if (!controller) {
      return;
    }
    if (playbackState.isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }
    setPlaybackState(controller.getPlaybackState());
  };

  /**
   * Seeks the execution timeline to the slider's target step index.
   */
  const handleSliderChange = (event: unknown): void => {
    const stepIndex = extractInputNumberValue(event);
    if (controller && stepIndex !== undefined) {
      controller.seekTo(stepIndex);
    }
  };

  /**
   * Sets the playback speed multiplier and updates component state.
   */
  const handleSpeedChange = (speed: number): void => {
    if (controller) {
      controller.setPlaybackSpeed(speed);
      setPlaybackState(controller.getPlaybackState());
    }
  };

  const totalSteps = playbackState.totalSteps;
  const isTrap = Boolean(currentStep?.isTrap);
  const flags = computeScrubberFlags(controller, playbackState.currentStep, totalSteps);
  const playIcon = playbackState.isPlaying ? '⏸' : '▶';
  const playLabel = playbackState.isPlaying ? 'Pause' : 'Play';

  return (
    <div className={classNames(styles.scrubberContainer, properties?.className)}>
      <div className={styles.controlsRow}>
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.controlBtn}
            title="Step Backward"
            aria-label="Step Backward"
            disabled={flags.disabledPrevious}
            onClick={() => controller?.stepBackward()}
          >
            ⏮
          </button>
          <button
            type="button"
            className={classNames(styles.controlBtn, styles.primaryBtn)}
            title={playLabel}
            aria-label={playLabel}
            disabled={flags.disabledPlay}
            onClick={handleTogglePlay}
          >
            {playIcon}
          </button>
          <button
            type="button"
            className={styles.controlBtn}
            title="Step Forward"
            aria-label="Step Forward"
            disabled={flags.disabledNext}
            onClick={() => controller?.stepForward()}
          >
            ⏭
          </button>
        </div>

        <div className={styles.sliderContainer}>
          <input
            type="range"
            min="0"
            max={Math.max(0, totalSteps - 1)}
            value={playbackState.currentStep}
            disabled={flags.disabledSlider}
            aria-label="Execution timeline scrubber"
            className={styles.slider}
            onInput={handleSliderChange}
          />
        </div>

        <div className={styles.speedGroup}>
          {SPEED_PRESETS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={classNames(
                styles.speedBtn,
                playbackState.playbackSpeed === speed ? styles.speedBtnActive : undefined,
              )}
              onClick={() => handleSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>

        <div className={styles.statusIndicator}>
          {isTrap ? (
            <span className={styles.trapBadge}>⚠️ TRAP: {currentStep?.trapMessage ?? 'Runtime Trap'}</span>
          ) : (
            <span className={styles.stepBadge}>
              Step {flags.displayStep} of {totalSteps}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
