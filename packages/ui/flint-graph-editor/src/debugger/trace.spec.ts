import { describe, expect, it } from 'vitest';

import { TraceDebuggerController } from './trace-controller';

import type { FlintNodeSourceMap } from '@mission-platform/flint';
import type { FlintTraceReport } from '@mission-platform/flint-runtime';

describe('Flint Trace Debugger Controller', () => {
  const mockSourceMap: FlintNodeSourceMap = {
    nodeToSpan: new Map([
      ['node-in', { line: 1, column: 1, endLine: 1, endColumn: 20, start: 0, end: 20 }],
      ['node-add', { line: 2, column: 3, endLine: 2, endColumn: 35, start: 25, end: 57 }],
      ['node-out', { line: 3, column: 3, endLine: 3, endColumn: 20, start: 60, end: 77 }],
    ]),
    spanToNode: new Map([
      ['1:1:1:2', 'node-in'],
      ['2:3:2:35', 'node-add'],
      ['3:3:3:20', 'node-out'],
    ]),
    portToAstIdentifier: new Map([
      ['node-in:value', 'a'],
      ['node-add:result', 'v_add_res'],
    ]),
  };

  const mockEdgeMap = new Map<string, string>([
    ['node-in:node-add', 'edge-1'],
    ['node-add:node-out', 'edge-2'],
  ]);

  const mockReport: FlintTraceReport = {
    version: '1.0',
    replayId: 'replay-1',
    capture: 'events',
    steps: 3,
    memoryBytes: 0,
    termination: 'returned',
    traceHash: 'hash-1',
    events: [
      {
        sequence: 0,
        type: 'instruction',
        step: 0,
        functionName: 'evaluate',
        source: { line: 1, column: 1, endLine: 1, endColumn: 2 },
        value: '10',
      },
      {
        sequence: 1,
        type: 'instruction',
        step: 1,
        functionName: 'evaluate',
        source: { line: 2, column: 3, endLine: 2, endColumn: 35 },
        value: '42',
      },
      {
        sequence: 2,
        type: 'instruction',
        step: 2,
        functionName: 'evaluate',
        source: { line: 3, column: 3, endLine: 3, endColumn: 20 },
        value: '42',
      },
    ],
    counters: {
      instructions: 3,
      calls: 1,
      capabilityCalls: 0,
      allocations: 0,
      reallocations: 0,
      deallocations: 0,
      rangeChecks: 0,
      memoryBytes: 0,
      peakMemoryBytes: 0,
      droppedEvents: 0,
    },
  };

  it('ingests trace report and maps execution events to visual nodes', () => {
    const controller = new TraceDebuggerController(mockReport, mockSourceMap, mockEdgeMap);
    const steps = controller.getSteps();

    expect(steps).toHaveLength(3);
    expect(steps[0]?.nodeId).toBe('node-in');
    expect(steps[1]?.nodeId).toBe('node-add');
    expect(steps[2]?.nodeId).toBe('node-out');

    // Edge pulse should connect node-in to node-add
    expect(steps[1]?.edgePulses).toContainEqual({
      edgeId: 'edge-1',
      offset: 0.5,
    });
    // Edge pulse should connect node-add to node-out
    expect(steps[2]?.edgePulses).toContainEqual({
      edgeId: 'edge-2',
      offset: 0.5,
    });
  });

  it('navigates trace steps forward and backward', () => {
    const controller = new TraceDebuggerController(mockReport, mockSourceMap, mockEdgeMap);

    expect(controller.getCurrentStepIndex()).toBe(0);
    expect(controller.getCurrentStep()?.nodeId).toBe('node-in');

    const canStepForward = controller.stepForward();
    expect(canStepForward).toBe(true);
    expect(controller.getCurrentStepIndex()).toBe(1);
    expect(controller.getCurrentStep()?.nodeId).toBe('node-add');

    controller.stepForward();
    expect(controller.getCurrentStepIndex()).toBe(2);

    // Can't step forward past last step
    expect(controller.stepForward()).toBe(false);
    expect(controller.getCurrentStepIndex()).toBe(2);

    // Step backward
    controller.stepBackward();
    expect(controller.getCurrentStepIndex()).toBe(1);
  });

  it('seeks directly to specific step index', () => {
    const controller = new TraceDebuggerController(mockReport, mockSourceMap, mockEdgeMap);

    controller.seekTo(2);
    expect(controller.getCurrentStepIndex()).toBe(2);
    expect(controller.getCurrentStep()?.nodeId).toBe('node-out');

    // Clamps to bounds
    controller.seekTo(100);
    expect(controller.getCurrentStepIndex()).toBe(2);

    controller.seekTo(-5);
    expect(controller.getCurrentStepIndex()).toBe(0);
  });

  it('captures runtime traps and error diagnostics', () => {
    const trapReport: FlintTraceReport = {
      ...mockReport,
      events: [
        {
          sequence: 3,
          type: 'trap',
          step: 2,
          detail: 'Integer division by zero in divide_i32',
          source: { line: 2, column: 3, endLine: 2, endColumn: 35 },
        },
      ],
    };

    const controller = new TraceDebuggerController(trapReport, mockSourceMap, mockEdgeMap);
    const step = controller.getCurrentStep();

    expect(step?.isTrap).toBe(true);
    expect(step?.trapMessage).toContain('Integer division by zero');
    expect(step?.nodeId).toBe('node-add');
  });

  it('notifies subscribers on step changes', () => {
    const controller = new TraceDebuggerController(mockReport, mockSourceMap, mockEdgeMap);
    let notifiedIndex = -1;

    const unsubscribe = controller.subscribe((step) => {
      notifiedIndex = step.stepIndex;
    });

    controller.stepForward();
    expect(notifiedIndex).toBe(1);

    controller.seekTo(2);
    expect(notifiedIndex).toBe(2);

    unsubscribe();
    controller.stepBackward();
    // Should not update after unsubscribe
    expect(notifiedIndex).toBe(2);
  });
});
