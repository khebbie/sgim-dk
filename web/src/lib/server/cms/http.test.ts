import { describe, it, expect } from 'vitest';
import { createCmsHttp, type FetchFn } from './http';
import { buildCmsPolicy, type ResilienceOptions } from './resilience';
import { isOk } from '$lib/domain/result';

function http(fetchFn: FetchFn, opts: Partial<ResilienceOptions> = {}) {
	const policy = buildCmsPolicy({ timeoutMs: 50, maxRetries: 1, retryDelayMs: 0, ...opts });
	return createCmsHttp({ baseUrl: 'http://cms', fetch: fetchFn, policy });
}

const jsonResponse = (body: unknown, status = 200) =>
	Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('resilient getJson', () => {
	it('returns ok with parsed JSON on 200', async () => {
		const result = await http(() => jsonResponse({ data: { ok: 1 } })).getJson('/x');
		expect(isOk(result) && result.value).toEqual({ data: { ok: 1 } });
	});

	it('maps 404 to not_found (no retry)', async () => {
		const result = await http(() => jsonResponse({}, 404)).getJson('/x');
		expect(result).toEqual({ ok: false, error: { kind: 'not_found' } });
	});

	it('maps other 4xx to client with status', async () => {
		const result = await http(() => jsonResponse({}, 400)).getJson('/x');
		expect(result).toEqual({ ok: false, error: { kind: 'client', status: 400 } });
	});

	it('maps 5xx to server and RETRIES it', async () => {
		let calls = 0;
		const result = await http(
			() => {
				calls += 1;
				return jsonResponse({}, 503);
			},
			{ maxRetries: 2, retryDelayMs: 0 }
		).getJson('/x');
		expect(result).toEqual({ ok: false, error: { kind: 'server', status: 503 } });
		expect(calls).toBe(3); // first try + 2 retries
	});

	it('does NOT retry a 4xx', async () => {
		let calls = 0;
		await http(
			() => {
				calls += 1;
				return jsonResponse({}, 400);
			},
			{ maxRetries: 2, retryDelayMs: 0 }
		).getJson('/x');
		expect(calls).toBe(1);
	});

	it('maps fetch TypeError to network', async () => {
		const result = await http(() => Promise.reject(new TypeError('fetch failed')), {
			maxRetries: 0
		}).getJson('/x');
		expect(result).toEqual({ ok: false, error: { kind: 'network' } });
	});

	it('maps a slow call to timeout', async () => {
		const hanging: FetchFn = (_url, init) =>
			new Promise((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () =>
					reject(new DOMException('Aborted', 'AbortError'))
				);
			});
		const result = await http(hanging, { timeoutMs: 20, maxRetries: 0 }).getJson('/x');
		expect(result).toEqual({ ok: false, error: { kind: 'timeout' } });
	});
});
