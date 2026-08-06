import { type MpRef, useCallback, useEffect, useRef, useState } from '@mission-platform/forge';

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

  const syncPorts = useCallback((current: MIDIAccess) => {
    setInputs(() => [...current.inputs.values()]);
    setOutputs(() => [...current.outputs.values()]);
  }, []);

  const requestAccess = useCallback(
    (options?: MIDIOptions) => {
      if (!isSupported) {
        setError(() => 'Web MIDI API is not supported');
        return;
      }

      void globalThis.navigator.requestMIDIAccess(options).then(
        (granted) => {
          access.current = granted;
          setIsConnected(() => true);
          setError(undefined);
          syncPorts(granted);
          granted.addEventListener('statechange', () => {
            syncPorts(granted);
          });
        },
        (error_: unknown) => {
          setError(() => (error_ instanceof Error ? error_.message : String(error_)));
        },
      );
    },
    [isSupported, syncPorts, access],
  );

  const playNote = useCallback(
    (note: number, velocity = DEFAULT_VELOCITY, durationMs = 300, output?: MIDIOutput) => {
      const current = access.current;
      const target = output ?? (current === undefined ? undefined : [...current.outputs.values()][0]);
      if (target === undefined) {
        return;
      }

      const now = globalThis.performance === undefined ? 0 : globalThis.performance.now();
      target.send([NOTE_ON, note, velocity]);
      target.send([NOTE_OFF, note, 0], now + durationMs);
    },
    [access],
  );

  useEffect(() => {
    return () => {
      access.current = undefined;
    };
  }, [access]);

  return { isSupported, isConnected, inputs, outputs, error, requestAccess, playNote };
}
