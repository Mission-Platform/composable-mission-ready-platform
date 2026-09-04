import { type MpRef, useEffect, useRef, useState } from '@mission-platform/forge-jsx';

/** Reactive state and controls returned by {@link useMidi}. */
export interface MidiControls {
  /** Whether the browser exposes the Web MIDI API. */
  isSupported: boolean;
  /** Whether MIDI access has been granted and is active. */
  isConnected: boolean;
  /** The currently available MIDI input ports. */
  inputs: MIDIInput[];
  /** The currently available MIDI output ports. */
  outputs: MIDIOutput[];
  /** The most recent access/permission error message, or `undefined`. */
  error: string | undefined;
  /** Request access to the system's MIDI devices. */
  requestAccess: (options?: MIDIOptions) => void;
  /**
   * Send a note-on immediately followed by a note-off to a MIDI output.
   *
   * @param note MIDI note number (0–127).
   * @param velocity Note velocity (0–127, default 127).
   * @param durationMs How long to hold the note in milliseconds (default 300).
   * @param output Target output; defaults to the first available output.
   */
  playNote: (note: number, velocity?: number, durationMs?: number, output?: MIDIOutput) => void;
}

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const DEFAULT_VELOCITY = 0x7f;

/**
 * Framework-neutral Web MIDI hook. Requests MIDI access, tracks the available
 * input/output ports, and can play notes on an output device.
 *
 * SSR-safe: `isSupported` is `false` and every control is a no-op when the API
 * or DOM is unavailable.
 * Automatic cleanup: the `statechange` listener is removed on unmount.
 */
export function useMidi(): MidiControls {
  const isSupported =
    globalThis.navigator !== undefined && typeof globalThis.navigator.requestMIDIAccess === 'function';

  const [isConnected, setIsConnected] = useState(false);
  const [inputs, setInputs] = useState<MIDIInput[]>([]);
  const [outputs, setOutputs] = useState<MIDIOutput[]>([]);
  // eslint-disable-next-line unicorn/no-useless-undefined
  const [error, setError] = useState<string | undefined>(undefined);
  const access: MpRef<MIDIAccess | undefined> = useRef<MIDIAccess | undefined>(undefined);
  const mounted: MpRef<boolean> = useRef(false);
  const stateChangeListener: MpRef<((event: Event) => void) | undefined> = useRef<((event: Event) => void) | undefined>(
    undefined,
  );
  const requestId: MpRef<number> = useRef(0);

  const syncPorts = (current: MIDIAccess): void => {
    setInputs(() => [...current.inputs.values()]);
    setOutputs(() => [...current.outputs.values()]);
  };

  const removeStateChangeListener = (): void => {
    const current = access.current;
    const listener = stateChangeListener.current;
    if (current !== undefined && listener !== undefined) {
      current.removeEventListener('statechange', listener);
    }
    stateChangeListener.current = undefined;
  };

  const requestAccess = (options?: MIDIOptions): void => {
    if (!isSupported) {
      setError(() => 'Web MIDI API is not supported');
      return;
    }

    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    void globalThis.navigator.requestMIDIAccess(options).then(
      (granted) => {
        if (!mounted.current || currentRequestId !== requestId.current) return;
        if (access.current !== granted) {
          removeStateChangeListener();
        }
        access.current = granted;
        setIsConnected(() => true);
        setError(undefined);
        syncPorts(granted);
        if (stateChangeListener.current === undefined) {
          const listener = (): void => {
            if (mounted.current && access.current === granted) syncPorts(granted);
          };
          stateChangeListener.current = listener;
          granted.addEventListener('statechange', listener);
        }
      },
      (error_: unknown) => {
        if (!mounted.current || currentRequestId !== requestId.current) return;
        setError(() => (error_ instanceof Error ? error_.message : String(error_)));
      },
    );
  };

  const playNote = (note: number, velocity = DEFAULT_VELOCITY, durationMs = 300, output?: MIDIOutput): void => {
    const current = access.current;
    const target = output ?? (current === undefined ? undefined : [...current.outputs.values()][0]);
    if (target === undefined) {
      return;
    }

    const now = globalThis.performance === undefined ? 0 : globalThis.performance.now();
    target.send([NOTE_ON, note, velocity]);
    target.send([NOTE_OFF, note, 0], now + durationMs);
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
      removeStateChangeListener();
      access.current = undefined;
    };
  }, [access]);

  return { isSupported, isConnected, inputs, outputs, error, requestAccess, playNote };
}
