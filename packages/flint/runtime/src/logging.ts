/**
 * Supported logging severity levels for runtime event recording.
 */
export type FlintLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured runtime log event emitted by the logger.
 */
export interface FlintLogEvent {
  readonly timestamp: number;
  readonly level: FlintLogLevel;
  readonly scope: string;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * Consumer callback function receiving structured runtime log events.
 */
export type FlintLogSink = (event: FlintLogEvent) => void;

/**
 * Scoped diagnostic logging interface for runtime event tracing.
 */
export interface FlintLogger {
  readonly scope: string;
  readonly child: (scope: string) => FlintLogger;
  readonly log: (level: FlintLogLevel, message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly debug: (message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly info: (message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly warn: (message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly error: (message: string, data?: Readonly<Record<string, unknown>>) => void;
}

/**
 * Configuration options for initializing a runtime logger instance.
 */
export interface FlintLoggerOptions {
  readonly scope?: string;
  readonly sink?: FlintLogSink;
  readonly clock?: () => number;
  readonly minimumLevel?: FlintLogLevel;
}

const levelRank: Record<FlintLogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Creates a scoped FlintLogger instance with custom severity filtering and sinks.
 *
 * @param options - Configuration options for logger initialization.
 * @returns Configured FlintLogger instance.
 */
export function createFlintLogger(options: FlintLoggerOptions = {}): FlintLogger {
  const scope = options.scope ?? 'fws';
  const sink = options.sink ?? (() => {});
  const clock = options.clock ?? Date.now;
  const minimumLevel = options.minimumLevel ?? 'info';
  const logger: FlintLogger = {
    scope,
    child: (childScope) => createFlintLogger({ ...options, scope: `${scope}.${childScope}` }),
    log: (level, message, data) => {
      if (levelRank[level] < levelRank[minimumLevel]) return;
      try {
        sink({ timestamp: clock(), level, scope, message, ...(data === undefined ? {} : { data }) });
      } catch {
        // Observability must never change guest program behavior.
      }
    },
    debug: (message, data) => logger.log('debug', message, data),
    info: (message, data) => logger.log('info', message, data),
    warn: (message, data) => logger.log('warn', message, data),
    error: (message, data) => logger.log('error', message, data),
  };
  return logger;
}
