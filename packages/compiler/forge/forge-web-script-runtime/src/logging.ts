export type ForgeWebScriptLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ForgeWebScriptLogEvent {
  readonly timestamp: number;
  readonly level: ForgeWebScriptLogLevel;
  readonly scope: string;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export type ForgeWebScriptLogSink = (event: ForgeWebScriptLogEvent) => void;

export interface ForgeWebScriptLogger {
  readonly scope: string;
  readonly child: (scope: string) => ForgeWebScriptLogger;
  readonly log: (level: ForgeWebScriptLogLevel, message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly debug: (message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly info: (message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly warn: (message: string, data?: Readonly<Record<string, unknown>>) => void;
  readonly error: (message: string, data?: Readonly<Record<string, unknown>>) => void;
}

export interface ForgeWebScriptLoggerOptions {
  readonly scope?: string;
  readonly sink?: ForgeWebScriptLogSink;
  readonly clock?: () => number;
  readonly minimumLevel?: ForgeWebScriptLogLevel;
}

const levelRank: Record<ForgeWebScriptLogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function createForgeWebScriptLogger(options: ForgeWebScriptLoggerOptions = {}): ForgeWebScriptLogger {
  const scope = options.scope ?? 'fws';
  const sink = options.sink ?? (() => {});
  const clock = options.clock ?? Date.now;
  const minimumLevel = options.minimumLevel ?? 'info';
  const logger: ForgeWebScriptLogger = {
    scope,
    child: (childScope) => createForgeWebScriptLogger({ ...options, scope: `${scope}.${childScope}` }),
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
