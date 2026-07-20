/**
 * Error taxonomy for the Strapi adapter and a pure classifier that maps any
 * thrown value onto a domain `ContentError`. Kept separate + pure so the
 * timeout/network/4xx/5xx handling required by the constitution is unit-tested
 * without real HTTP or timers.
 */
import { BrokenCircuitError, TaskCancelledError } from 'cockatiel';
import type { ContentError } from '$lib/domain/content-source';

/** Thrown for HTTP 4xx — non-retryable (the request itself is wrong). */
export class HttpClientError extends Error {
	constructor(public readonly status: number) {
		super(`CMS responded ${status}`);
		this.name = 'HttpClientError';
	}
}

/** Thrown for HTTP 5xx — retryable (upstream may recover). */
export class HttpServerError extends Error {
	constructor(public readonly status: number) {
		super(`CMS responded ${status}`);
		this.name = 'HttpServerError';
	}
}

/** Thrown when a Strapi payload can't be mapped to a domain type. */
export class MappingError extends Error {
	constructor(detail: string) {
		super(detail);
		this.name = 'MappingError';
	}
}

export function httpErrorForStatus(status: number): HttpClientError | HttpServerError {
	return status >= 500 ? new HttpServerError(status) : new HttpClientError(status);
}

/** Maps any thrown value to a distinct domain ContentError. */
export function classifyError(error: unknown): ContentError {
	if (error instanceof BrokenCircuitError) return { kind: 'unavailable' };
	if (error instanceof TaskCancelledError || isAbort(error)) return { kind: 'timeout' };
	if (error instanceof HttpClientError) return clientError(error.status);
	if (error instanceof HttpServerError) return { kind: 'server', status: error.status };
	if (error instanceof MappingError) return { kind: 'mapping', detail: error.message };
	if (error instanceof TypeError) return { kind: 'network' };
	return { kind: 'server' };
}

function clientError(status: number): ContentError {
	return status === 404 ? { kind: 'not_found' } : { kind: 'client', status };
}

function isAbort(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}
