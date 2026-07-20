/**
 * Minimal Result type for type-based error handling (constitution: "Error
 * Handling Through Types"). Public content-source operations return a Result
 * instead of throwing, so callers must handle failure explicitly.
 */

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
	return result.ok;
}
