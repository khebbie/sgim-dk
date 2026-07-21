/**
 * Structured JSON logger for the CMS (constitution section 4 / sgim-pgx.2).
 * One line of JSON per event — { timestamp, level, message, ...context } —
 * never plain strings. The clock and write sink are injected so output is
 * deterministic and unit-testable; requestId / userId / operation ride in the
 * context. A request-scoped logger is bound in the request-context middleware.
 */
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string | number;
  operation?: string;
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

export interface LoggerDeps {
  /** Injected clock; defaults to the system clock. */
  now?: () => Date;
  /** Sink for one JSON line; defaults to stdout. Injected in tests. */
  write?: (line: string) => void;
  base?: LogContext;
}

export function createLogger(deps: LoggerDeps = {}): Logger {
  const now = deps.now ?? (() => new Date());
  const write = deps.write ?? ((line: string) => process.stdout.write(line + '\n'));
  const base = deps.base ?? {};

  const emit = (level: LogLevel, message: string, context: LogContext = {}): void => {
    write(JSON.stringify({ timestamp: now().toISOString(), level, message, ...base, ...context }));
  };

  return {
    info: (message, context) => emit('info', message, context),
    warn: (message, context) => emit('warn', message, context),
    error: (message, context) => emit('error', message, context),
    child: (context) => createLogger({ now, write, base: { ...base, ...context } }),
  };
}
