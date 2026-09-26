import { classNames, useEffect, useState, type MpElement } from '@mission-platform/forge-jsx';

import { TraceDebuggerController, type TraceExecutionStep } from '../../../debugger/trace-controller';

import styles from './forge-debug-scrubber.module.scss';

export interface DebugScrubberProperties {
  readonly controller: TraceDebuggerController;
  readonly className?: string;
}

/**
 * Extracts numeric value from a DOM input event if valid.
 */
function extractInputNumberValue(event: unknown): number | undefined {
  const target =
    typeof event === 'object' && event !== null && 'target' in event ? Reflect.get(event, 'target') : undefined;
  const rawValue =
    typeof target === 'object' && target !== null && 'value' in target ? Reflect.get(target, 'value') : undefined;
  return typeof rawValue === 'string' || typeof rawValue === 'number' ? Number(rawValue) : undefined;
}

const SPEED_PRESETS = [0.5, 1, 2] as const;

const DEFAULT_PLAYBACK_STATE = {
  isPlaying: false,
  currentStep: 0,
  totalSteps: 0,
  playbackSpeed: 1,
};

/**
 * Framework-neutral Forge playback scrubber for Flint execution traces.
 */
export function ForgeDebugScrubber(properties: Readonly<DebugScrubberProperties>): MpElement {
  const controller = properties?.controller;
  const [playbackState, setPlaybackState] = useState(
    controller ? controller.getPlaybackState() : DEFAULT_PLAYBACK_STATE,
  );
  const [currentStep, setCurrentStep] = useState<TraceExecutionStep | undefined>(
    controller ? controller.getCurrentStep() : undefined,
  );

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (controller) {
      setPlaybackState(controller.getPlaybackState());
      setCurrentStep(controller.getCurrentStep());
      const unsubscribe = controller.subscribe((step) => {
        setCurrentStep(step);
        setPlaybackState(controller.getPlaybackState());
      });
      cleanup = () => {
        unsubscribe();
      };
    }
    return cleanup;
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
  const displayStep = totalSteps > 0 ? playbackState.currentStep + 1 : 0;
  const isFirstStep = playbackState.currentStep === 0;
  const isLastStep = playbackState.currentStep >= totalSteps - 1;
  const hasNoSteps = totalSteps === 0;

  return (
    <div className={classNames(styles.scrubberContainer, properties?.className)}>
      <div className={styles.controlsRow}>
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.controlBtn}
            title="Step Backward"
            aria-label="Step Backward"
            disabled={isFirstStep || !controller}
            onClick={() => controller?.stepBackward()}
          >
            ⏮
          </button>
          <button
            type="button"
            className={classNames(styles.controlBtn, styles.primaryBtn)}
            title={playbackState.isPlaying ? 'Pause' : 'Play'}
            aria-label={playbackState.isPlaying ? 'Pause' : 'Play'}
            disabled={hasNoSteps || !controller}
            onClick={handleTogglePlay}
          >
            {playbackState.isPlaying ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            className={styles.controlBtn}
            title="Step Forward"
            aria-label="Step Forward"
            disabled={isLastStep || !controller}
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
            disabled={hasNoSteps || !controller}
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
              Step {displayStep} of {totalSteps}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
