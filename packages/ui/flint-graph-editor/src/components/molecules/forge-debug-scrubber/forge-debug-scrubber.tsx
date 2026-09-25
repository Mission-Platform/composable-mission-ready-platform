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
  if (typeof HTMLInputElement === 'undefined') {
    return undefined;
  }
  if (!event || typeof event !== 'object' || !('target' in event)) {
    return undefined;
  }
  const target = Reflect.get(event, 'target');
  return target instanceof HTMLInputElement ? Number(target.value) : undefined;
}

interface PlaybackControlsProperties {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly isPlaying: boolean;
  readonly onStepBackward: () => void;
  readonly onTogglePlay: () => void;
  readonly onStepForward: () => void;
}

/**
 * Renders playback transport buttons for step backward, play/pause, and step forward.
 */
function PlaybackControls(properties: Readonly<PlaybackControlsProperties>): MpElement {
  const { currentStep, totalSteps, isPlaying, onStepBackward, onTogglePlay, onStepForward } = properties;
  return (
    <div className={styles.buttonGroup}>
      <button
        type="button"
        className={styles.controlBtn}
        title="Step Backward"
        aria-label="Step Backward"
        disabled={currentStep === 0}
        onClick={onStepBackward}
      >
        ⏮
      </button>
      <button
        type="button"
        className={classNames(styles.controlBtn, styles.primaryBtn)}
        title={isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        disabled={totalSteps === 0}
        onClick={onTogglePlay}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button
        type="button"
        className={styles.controlBtn}
        title="Step Forward"
        aria-label="Step Forward"
        disabled={currentStep >= totalSteps - 1}
        onClick={onStepForward}
      >
        ⏭
      </button>
    </div>
  );
}

interface SpeedSelectorProperties {
  readonly activeSpeed: number;
  readonly onSelectSpeed: (speed: number) => void;
}

/**
 * Renders speed preset multipliers for trace scrubbing.
 */
function PlaybackSpeedSelector(properties: Readonly<SpeedSelectorProperties>): MpElement {
  const speeds = [0.5, 1, 2];
  return (
    <div className={styles.speedGroup}>
      {speeds.map((speed) => (
        <button
          key={speed}
          type="button"
          className={classNames(styles.speedBtn, properties.activeSpeed === speed ? styles.speedBtnActive : undefined)}
          onClick={() => properties.onSelectSpeed(speed)}
        >
          {speed}x
        </button>
      ))}
    </div>
  );
}

interface StatusIndicatorProperties {
  readonly isTrap: boolean;
  readonly trapMessage?: string;
  readonly currentStep: number;
  readonly totalSteps: number;
}

/**
 * Renders the execution step count badge or runtime trap indicator.
 */
function StatusIndicator(properties: Readonly<StatusIndicatorProperties>): MpElement {
  if (properties.isTrap) {
    return (
      <div className={styles.statusIndicator}>
        <span className={styles.trapBadge}>⚠️ TRAP: {properties.trapMessage ?? 'Runtime Trap'}</span>
      </div>
    );
  }
  const displayStep = properties.totalSteps > 0 ? properties.currentStep + 1 : 0;
  return (
    <div className={styles.statusIndicator}>
      <span className={styles.stepBadge}>
        Step {displayStep} of {properties.totalSteps}
      </span>
    </div>
  );
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

  /**
   * Toggles playback between playing and paused states.
   */
  const handleTogglePlay = (): void => {
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
    if (stepIndex !== undefined) {
      controller.seekTo(stepIndex);
    }
  };

  /**
   * Sets the playback speed multiplier and updates component state.
   */
  const handleSpeedChange = (speed: number): void => {
    controller.setPlaybackSpeed(speed);
    setPlaybackState(controller.getPlaybackState());
  };

  const totalSteps = playbackState.totalSteps;
  const isTrap = currentStep?.isTrap ?? false;

  return (
    <div className={classNames(styles.scrubberContainer, properties.className)}>
      <div className={styles.controlsRow}>
        <PlaybackControls
          currentStep={playbackState.currentStep}
          totalSteps={totalSteps}
          isPlaying={playbackState.isPlaying}
          onStepBackward={() => controller.stepBackward()}
          onTogglePlay={handleTogglePlay}
          onStepForward={() => controller.stepForward()}
        />

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

        <PlaybackSpeedSelector
          activeSpeed={playbackState.playbackSpeed}
          onSelectSpeed={handleSpeedChange}
        />

        <StatusIndicator
          isTrap={isTrap}
          trapMessage={currentStep?.trapMessage}
          currentStep={playbackState.currentStep}
          totalSteps={totalSteps}
        />
      </div>
    </div>
  );
}
