import type { FlintNodeSourceMap } from '@mission-platform/flint';
import type { FlintTraceEvent, FlintTraceReport } from '@mission-platform/flint-runtime';

export interface TraceExecutionStep {
  readonly stepIndex: number;
  readonly event: FlintTraceEvent;
  readonly nodeId?: string;
  readonly portValues: Readonly<Record<string, unknown>>;
  readonly isTrap: boolean;
  readonly trapMessage?: string;
  readonly edgePulses: readonly {
    readonly edgeId: string;
    readonly offset: number;
  }[];
}

export type TraceStepListener = (step: TraceExecutionStep, controller: TraceDebuggerController) => void;

/**
 * Controller bridging compiler runtime execution traces to visual node replay.
 */
export class TraceDebuggerController {
  private steps: readonly TraceExecutionStep[] = [];
  private currentStep = 0;
  private isPlaying = false;
  private playbackSpeed = 1;
  private timerId?: ReturnType<typeof setTimeout>;

  private readonly listeners = new Set<TraceStepListener>();

  constructor(
    report?: FlintTraceReport,
    sourceMap?: FlintNodeSourceMap,
    edgeMap?: ReadonlyMap<string, string>, // key: `${fromNodeId}:${toNodeId}`, value: edgeId
  ) {
    if (report && sourceMap) {
      this.loadTrace(report, sourceMap, edgeMap);
    }
  }

  /**
   * Ingests a new trace execution report and maps its event source locations to graph nodes.
   */
  // skipcq: JS-R1005
  loadTrace(
    report: FlintTraceReport,
    sourceMap: FlintNodeSourceMap,
    edgeMap: ReadonlyMap<string, string> = new Map(),
  ): void {
    this.pause();
    this.currentStep = 0;

    const steps: TraceExecutionStep[] = [];
    const portValues: Record<string, unknown> = {};
    let previousNodeId: string | undefined;

    for (const [index, event] of report.events.entries()) {
      let nodeId: string | undefined;

      // Extract span from event to correlate with visual node
      if (event.source) {
        const span = event.source;
        for (const [mappedNodeId, nodeSpan] of sourceMap.nodeToSpan) {
          if (nodeSpan.line === span.line && span.column >= nodeSpan.column && span.column <= nodeSpan.endColumn) {
            nodeId = mappedNodeId;
            break;
          }
        }
      }

      const isTrap = event.type === 'trap';
      const trapMessage = isTrap ? (event.detail ?? 'Runtime Trap') : undefined;

      // Record any simulated or captured port value
      if (nodeId && event.value !== undefined) {
        portValues[nodeId] = event.value;
      }

      // Calculate causal edge pulse between consecutive executing nodes
      const edgePulses: { edgeId: string; offset: number }[] = [];
      if (previousNodeId && nodeId && previousNodeId !== nodeId) {
        const edgeKey = `${previousNodeId}:${nodeId}`;
        const edgeId = edgeMap.get(edgeKey);
        if (edgeId) {
          edgePulses.push({ edgeId, offset: 0.5 });
        }
      }

      steps.push({
        stepIndex: index,
        event,
        nodeId,
        portValues: { ...portValues },
        isTrap,
        trapMessage,
        edgePulses,
      });

      if (nodeId) {
        previousNodeId = nodeId;
      }
    }

    this.steps = steps;
    this.notify();
  }

  /**
   * Returns the complete sequence of correlated execution steps.
   */
  getSteps(): readonly TraceExecutionStep[] {
    return this.steps;
  }

  /**
   * Returns the 0-based index of the currently active execution step.
   */
  getCurrentStepIndex(): number {
    return this.currentStep;
  }

  /**
   * Returns the currently active execution step details.
   */
  getCurrentStep(): TraceExecutionStep | undefined {
    return this.steps[this.currentStep];
  }

  /**
   * Returns the current playback status, current step, step count, and speed.
   */
  getPlaybackState(): {
    readonly isPlaying: boolean;
    readonly currentStep: number;
    readonly totalSteps: number;
    readonly playbackSpeed: number;
  } {
    return {
      isPlaying: this.isPlaying,
      currentStep: this.currentStep,
      totalSteps: this.steps.length,
      playbackSpeed: this.playbackSpeed,
    };
  }

  /**
   * Subscribes a listener callback to step navigation events.
   */
  subscribe(listener: TraceStepListener): () => void {
    this.listeners.add(listener);
    const current = this.getCurrentStep();
    if (current) {
      listener(current, this);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Dispatches the active step to all registered listeners.
   */
  private notify(): void {
    const current = this.getCurrentStep();
    if (current) {
      for (const listener of this.listeners) {
        listener(current, this);
      }
    }
  }

  /**
   * Advances the playback timeline forward by one step.
   */
  stepForward(): boolean {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.notify();
      return true;
    }
    this.pause();
    return false;
  }

  /**
   * Rewinds the playback timeline backward by one step.
   */
  stepBackward(): boolean {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.notify();
      return true;
    }
    return false;
  }

  /**
   * Seeks directly to a specific step index in the execution timeline.
   */
  seekTo(stepIndex: number): void {
    const clamped = Math.max(0, Math.min(stepIndex, this.steps.length - 1));
    if (this.currentStep !== clamped) {
      this.currentStep = clamped;
      this.notify();
    }
  }

  /**
   * Updates the playback speed multiplier.
   */
  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(speed, 5));
    if (this.isPlaying) {
      this.scheduleNextPlaybackTick();
    }
  }

  /**
   * Starts automatic step playback.
   */
  play(): void {
    if (this.isPlaying || this.steps.length === 0) return;
    if (this.currentStep >= this.steps.length - 1) {
      this.currentStep = 0;
    }
    this.isPlaying = true;
    this.scheduleNextPlaybackTick();
  }

  /**
   * Pauses automatic step playback.
   */
  pause(): void {
    this.isPlaying = false;
    if (this.timerId !== undefined) {
      clearTimeout(this.timerId);
      this.timerId = undefined;
    }
  }

  /**
   * Schedules the next playback tick based on current playback speed.
   */
  private scheduleNextPlaybackTick(): void {
    if (this.timerId !== undefined) {
      clearTimeout(this.timerId);
    }
    const intervalMs = Math.round(500 / this.playbackSpeed);
    this.timerId = setTimeout(() => {
      if (this.isPlaying) {
        const advanced = this.stepForward();
        if (advanced) {
          this.scheduleNextPlaybackTick();
        }
      }
    }, intervalMs);
  }

  /**
   * Tears down the controller, pauses timers, and unregisters all listeners.
   */
  destroy(): void {
    this.pause();
    this.listeners.clear();
  }
}
