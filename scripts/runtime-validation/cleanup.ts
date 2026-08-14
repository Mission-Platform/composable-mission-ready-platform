export interface ManagedProcess {
  pid?: number;
  kill?: (signal?: NodeJS.Signals) => void;
}

export interface CleanupOptions {
  graceMs?: number;
  kill?: (pid: number, signal: NodeJS.Signals) => void;
  wait?: (delayMs: number) => Promise<void>;
}

export async function terminateProcessTree(process: ManagedProcess, options: CleanupOptions = {}): Promise<void> {
  if (!process.pid && !process.kill) return;

  // IMPORTANT: prefer `globalThis.process.kill(pid, signal)` (supports negative pids for process groups)
  // even when the managed process object carries its own `.kill()` method.
  // Otherwise, the managed `.kill()` path may ignore the negative pid and only signal the leader,
  // risking detached grandchildren leaks.
  const kill: (pid: number, signal: NodeJS.Signals) => void =
    options.kill ??
    ((pid: number, signal: NodeJS.Signals) => {
      try {
        globalThis.process.kill(pid, signal);
      } catch {
        // Safe fallback: if group kill isn't supported/allowed, fall back to the managed process kill.
        process.kill?.(signal);
      }
    });
  if (process.pid) {
    try {
      kill(-process.pid, 'SIGTERM');
    } catch {
      try {
        kill(process.pid, 'SIGTERM');
      } catch {
        // The child may have exited between readiness and cleanup.
      }
    }
  } else {
    process.kill?.('SIGTERM');
  }
  if (options.graceMs)
    await (options.wait ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs))))(
      options.graceMs,
    );
  if (process.pid) {
    try {
      kill(-process.pid, 'SIGKILL');
    } catch {
      try {
        kill(process.pid, 'SIGKILL');
      } catch {
        // Best-effort cleanup: the process already ended.
      }
    }
  }
}

export function createProcessRegistry(options: CleanupOptions = {}) {
  const processes = new Set<ManagedProcess>();
  return {
    add(process: ManagedProcess): ManagedProcess {
      processes.add(process);
      return process;
    },
    remove(process: ManagedProcess): void {
      processes.delete(process);
    },
    async cleanup(): Promise<void> {
      await Promise.all([...processes].map((process) => terminateProcessTree(process, options)));
      processes.clear();
    },
  };
}
