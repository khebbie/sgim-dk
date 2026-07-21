/**
 * Structured JSON logger (constitution section 4 / sgim-x60.2). Emits one line
 * of JSON per event — { timestamp, level, message, ...context } — never plain
 * strings. The Clock and the write sink are injected so output is deterministic
 * and unit-testable; requestId / userId / operation ride in the context.
 *
 * This is the sanctioned place for server logging: route loads/actions and
 * endpoints log via a request-scoped Logger (event.locals.log), not console.
 */
import { systemClock, type Clock } from '$lib/domain/clock';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
	requestId?: string;
	userId?: string;
	operation?: string;
	[key: string]: unknown;
}

export interface Logger {
	info(message: string, context?: LogContext): void;
	warn(message: string, context?: LogContext): void;
	error(message: string, context?: LogContext): void;
	/** A logger that merges `context` into every line (e.g. per-request bindings). */
	child(context: LogContext): Logger;
}

export interface LoggerDeps {
	clock?: Clock;
	/** Sink for one JSON line; defaults to stdout. Injected in tests. */
	write?: (line: string) => void;
	base?: LogContext;
}

export function createLogger(deps: LoggerDeps = {}): Logger {
	const clock = deps.clock ?? systemClock;
	 
	const write = deps.write ?? ((line: string) => console.log(line));
	const base = deps.base ?? {};

	const emit = (level: LogLevel, message: string, context: LogContext = {}): void => {
		write(
			JSON.stringify({ timestamp: clock.now().toISOString(), level, message, ...base, ...context })
		);
	};

	return {
		info: (message, context) => emit('info', message, context),
		warn: (message, context) => emit('warn', message, context),
		error: (message, context) => emit('error', message, context),
		child: (context) => createLogger({ clock, write, base: { ...base, ...context } })
	};
}
