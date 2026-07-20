import { describe, it, expect } from 'vitest';
import { BrokenCircuitError, TaskCancelledError } from 'cockatiel';
import {
	classifyError,
	httpErrorForStatus,
	HttpClientError,
	HttpServerError,
	MappingError
} from './errors';

describe('httpErrorForStatus', () => {
	it('maps 4xx to a non-retryable client error', () => {
		expect(httpErrorForStatus(404)).toBeInstanceOf(HttpClientError);
	});
	it('maps 5xx to a retryable server error', () => {
		expect(httpErrorForStatus(503)).toBeInstanceOf(HttpServerError);
	});
});

describe('classifyError — distinct failure modes', () => {
	it('open circuit -> unavailable', () => {
		expect(classifyError(new BrokenCircuitError())).toEqual({ kind: 'unavailable' });
	});
	it('cockatiel timeout -> timeout', () => {
		expect(classifyError(new TaskCancelledError())).toEqual({ kind: 'timeout' });
	});
	it('AbortError -> timeout', () => {
		expect(classifyError(new DOMException('Aborted', 'AbortError'))).toEqual({ kind: 'timeout' });
	});
	it('404 -> not_found (distinct from other 4xx)', () => {
		expect(classifyError(new HttpClientError(404))).toEqual({ kind: 'not_found' });
	});
	it('other 4xx -> client with status', () => {
		expect(classifyError(new HttpClientError(400))).toEqual({ kind: 'client', status: 400 });
	});
	it('5xx -> server with status', () => {
		expect(classifyError(new HttpServerError(502))).toEqual({ kind: 'server', status: 502 });
	});
	it('TypeError (fetch failure) -> network', () => {
		expect(classifyError(new TypeError('fetch failed'))).toEqual({ kind: 'network' });
	});
	it('MappingError -> mapping with detail', () => {
		expect(classifyError(new MappingError('bad'))).toEqual({ kind: 'mapping', detail: 'bad' });
	});
	it('unknown -> server (safe default)', () => {
		expect(classifyError(new Error('???'))).toEqual({ kind: 'server' });
	});
});
