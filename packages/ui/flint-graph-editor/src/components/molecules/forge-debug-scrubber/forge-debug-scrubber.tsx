import { classNames, useEffect, useState, type MpElement } from '@mission-platform/forge-jsx';

import { TraceDebuggerController, type TraceExecutionStep } from '../../../debugger/trace-controller';

import styles from './forge-debug-scrubber.module.scss';

export interface DebugScrubberProperties {
  readonly controller: TraceDebuggerController;
  readonly className?: string;
}

/**
 * Framework-neutral Forge playback scrubber for Flint execution traces.
 */
export function ForgeDebugScrubber(properties: Readonly<DebugScrubberProperties>): MpElement {
  const { controller } = properties;
  const [playbackState, setPlaybackState] = useState(controller.getPlaybackState());
  const [currentStep, setCurrentStep] = useState<TraceExecutionStep | undefined>(controller.getCurrentStep());

  useEffect(() => {
    const unsubscribe = controller.subscribe((step) => {
      setCurrentStep(step);
      setPlaybackState(controller.getPlaybackState());
    });
    return () => {
      unsubscribe();
    };
  }, [controller]);

  const handleTogglePlay = (): void => {
    if (playbackState.isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }
    setPlaybackState(controller.getPlaybackState());
  };

  const handleSliderChange = (event: unknown): void => {
    if (
      typeof HTMLInputElement !== 'undefined' &&
      event &&
      typeof event === 'object' &&
      'target' in event &&
      event.target instanceof HTMLInputElement
    ) {
      const stepIndex = Number(event.target.value);
      controller.seekTo(stepIndex);
    }
  };

  const handleSpeedChange = (speed: number): void => {
    controller.setPlaybackSpeed(speed);
    setPlaybackState(controller.getPlaybackState());
  };

  const totalSteps = playbackState.totalSteps;
  const isTrap = currentStep?.isTrap ?? false;

  return (
    <div className={classNames(styles.scrubberContainer, properties.className)}>
      <div className={styles.controlsRow}>
        {/* Playback Step Buttons */}
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.controlBtn}
            title="Step Backward"
            aria-label="Step Backward"
            disabled={playbackState.currentStep === 0}
            onClick={() => controller.stepBackward()}
          >
            ⏮
          </button>
          <button
            type="button"
            className={classNames(styles.controlBtn, styles.primaryBtn)}
            title={playbackState.isPlaying ? 'Pause' : 'Play'}
            aria-label={playbackState.isPlaying ? 'Pause' : 'Play'}
            disabled={totalSteps === 0}
            onClick={handleTogglePlay}
          >
            {playbackState.isPlaying ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            className={styles.controlBtn}
            title="Step Forward"
            aria-label="Step Forward"
            disabled={playbackState.currentStep >= totalSteps - 1}
            onClick={() => controller.stepForward()}
          >
            ⏭
          </button>
        </div>

        {/* Timeline Slider */}
        <div className={styles.sliderContainer}>
          <input
            type="range"
            min="0"
            max={Math.max(0, totalSteps - 1)}
            value={playbackState.currentStep}
            disabled={totalSteps === 0}
            aria-label="Execution timeline scrubber"
            className={styles.slider}
            onInput={handleSliderChange}
          />
        </div>

        {/* Speed Selector */}
        <div className={styles.speedGroup}>
          {[0.5, 1, 2].map((speed) => (
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

        {/* Step Counter & Diagnostics */}
        <div className={styles.statusIndicator}>
          {isTrap ? (
            <span className={styles.trapBadge}>⚠️ TRAP: {currentStep?.trapMessage ?? 'Runtime Trap'}</span>
          ) : (
            <span className={styles.stepBadge}>
              Step {totalSteps > 0 ? playbackState.currentStep + 1 : 0} of {totalSteps}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
