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
  if (event && typeof event === 'object' && 'target' in event) {
    const target = Reflect.get(event, 'target');
    if (target && typeof target === 'object' && 'value' in target) {
      return Reflect.get(target, 'value');
    }
  }
  return undefined;
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
 * Toggles playback controller between play and pause.
 */
function toggleControllerPlayback(controller?: TraceDebuggerController, isPlaying = false): void {
  if (!controller) return;
  if (isPlaying) {
    controller.pause();
  } else {
    controller.play();
  }
}

/**
 * Seeks controller to target step index if valid.
 */
function seekControllerStep(controller: TraceDebuggerController | undefined, event: unknown): void {
  const stepIndex = extractInputNumberValue(event);
  if (controller && stepIndex !== undefined) {
    controller.seekTo(stepIndex);
  }
}

/**
 * Hook to synchronize playback state and step with a trace debugger controller.
 */
function useDebuggerPlayback(controller?: TraceDebuggerController) {
  const initialPlaybackState = controller?.getPlaybackState() ?? DEFAULT_PLAYBACK_STATE;
  const initialStep = controller?.getCurrentStep();
  const [playbackState, setPlaybackState] = useState(initialPlaybackState);
  const [currentStep, setCurrentStep] = useState<TraceExecutionStep | undefined>(initialStep);

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

  return { playbackState, currentStep, setPlaybackState };
}

interface ScrubberButtonGroupProperties {
  readonly controller?: TraceDebuggerController;
  readonly isPlaying: boolean;
  readonly disabledPrev: boolean;
  readonly disabledNext: boolean;
  readonly disabledPlay: boolean;
  readonly onTogglePlay: () => void;
}

/**
 * Playback step navigation and play/pause action button group.
 */
function ScrubberButtonGroup(properties: ScrubberButtonGroupProperties): MpElement {
  const playIcon = properties.isPlaying ? '⏸' : '▶';
  const playLabel = properties.isPlaying ? 'Pause' : 'Play';
  return (
    <div className={styles.buttonGroup}>
      <button
        type="button"
        className={styles.controlBtn}
        title="Step Backward"
        aria-label="Step Backward"
        disabled={properties.disabledPrev}
        onClick={() => properties.controller?.stepBackward()}
      >
        ⏮
      </button>
      <button
        type="button"
        className={classNames(styles.controlBtn, styles.primaryBtn)}
        title={playLabel}
        aria-label={playLabel}
        disabled={properties.disabledPlay}
        onClick={properties.onTogglePlay}
      >
        {playIcon}
      </button>
      <button
        type="button"
        className={styles.controlBtn}
        title="Step Forward"
        aria-label="Step Forward"
        disabled={properties.disabledNext}
        onClick={() => properties.controller?.stepForward()}
      >
        ⏭
      </button>
    </div>
  );
}

interface ScrubberSpeedGroupProperties {
  readonly currentSpeed: number;
  readonly onSpeedChange: (speed: number) => void;
}

/**
 * Playback speed selector button group.
 */
function ScrubberSpeedGroup(properties: ScrubberSpeedGroupProperties): MpElement {
  return (
    <div className={styles.speedGroup}>
      {SPEED_PRESETS.map((speed) => (
        <button
          key={speed}
          type="button"
          className={classNames(styles.speedBtn, properties.currentSpeed === speed ? styles.speedBtnActive : undefined)}
          onClick={() => properties.onSpeedChange(speed)}
        >
          {speed}x
        </button>
      ))}
    </div>
  );
}

interface ScrubberStatusIndicatorProperties {
  readonly isTrap: boolean;
  readonly trapMessage?: string;
  readonly displayStep: number;
  readonly totalSteps: number;
}

/**
 * Execution step count or runtime trap status badge.
 */
function ScrubberStatusIndicator(properties: ScrubberStatusIndicatorProperties): MpElement {
  return (
    <div className={styles.statusIndicator}>
      {properties.isTrap ? (
        <span className={styles.trapBadge}>⚠️ TRAP: {properties.trapMessage ?? 'Runtime Trap'}</span>
      ) : (
        <span className={styles.stepBadge}>
          Step {properties.displayStep} of {properties.totalSteps}
        </span>
      )}
    </div>
  );
}

/**
 * Framework-neutral Forge playback scrubber for Flint execution traces.
 */
export function ForgeDebugScrubber(properties: Readonly<DebugScrubberProperties>): MpElement {
  const controller = properties?.controller;
  const { playbackState, currentStep, setPlaybackState } = useDebuggerPlayback(controller);

  /**
   * Toggles playback between playing and paused states.
   */
  const handleTogglePlay = (): void => {
    toggleControllerPlayback(controller, playbackState.isPlaying);
    if (controller) {
      setPlaybackState(controller.getPlaybackState());
    }
  };

  /**
   * Seeks the execution timeline to the slider's target step index.
   */
  const handleSliderChange = (event: unknown): void => {
    seekControllerStep(controller, event);
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
  const flags = computeScrubberFlags(controller, playbackState.currentStep, totalSteps);

  return (
    <div className={classNames(styles.scrubberContainer, properties?.className)}>
      <div className={styles.controlsRow}>
        <ScrubberButtonGroup
          controller={controller}
          isPlaying={playbackState.isPlaying}
          disabledPrev={flags.disabledPrevious}
          disabledNext={flags.disabledNext}
          disabledPlay={flags.disabledPlay}
          onTogglePlay={handleTogglePlay}
        />

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

        <ScrubberSpeedGroup
          currentSpeed={playbackState.playbackSpeed}
          onSpeedChange={handleSpeedChange}
        />

        <ScrubberStatusIndicator
          isTrap={Boolean(currentStep?.isTrap)}
          trapMessage={currentStep?.trapMessage}
          displayStep={flags.displayStep}
          totalSteps={totalSteps}
        />
      </div>
    </div>
  );
}
