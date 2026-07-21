/**
 * Resilient JSON GET against the CMS. All I/O for the adapter funnels through
 * here: the injected `fetch` runs inside the resilience policy, and any failure
 * is turned into a typed `ContentError` (never thrown to callers).
 */
import type { IPolicy } from 'cockatiel';
import { ok, err, type Result } from '$lib/domain/result';
import type { ContentError } from '$lib/domain/content-source';
import { httpErrorForStatus, classifyError } from './errors';

/** Matches the global `fetch` signature so it can be injected in tests. */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface CmsHttp {
	getJson(path: string, token?: string): Promise<Result<unknown, ContentError>>;
	/** POST, optionally with a JSON body (used for the duty claim/release actions). */
	post(path: string, token?: string, body?: unknown): Promise<Result<unknown, ContentError>>;
}

export interface CmsHttpDeps {
	baseUrl: string;
	fetch: FetchFn;
	policy: IPolicy;
}

export function createCmsHttp(deps: CmsHttpDeps): CmsHttp {
	return {
		getJson: (path, token) => getJson(deps, path, token),
		post: (path, token, body) => post(deps, path, token, body)
	};
}

async function post(
	deps: CmsHttpDeps,
	path: string,
	token?: string,
	body?: unknown
): Promise<Result<unknown, ContentError>> {
	try {
		const data = await deps.policy.execute(({ signal }) =>
			sendPost(deps, path, signal, token, body)
		);
		return ok(data);
	} catch (error) {
		return err(classifyError(error));
	}
}

async function sendPost(
	deps: CmsHttpDeps,
	path: string,
	signal: AbortSignal,
	token?: string,
	body?: unknown
): Promise<unknown> {
	const headers = authHeaders(token);
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	const response = await deps.fetch(deps.baseUrl + path, {
		method: 'POST',
		signal,
		headers,
		body: body !== undefined ? JSON.stringify(body) : undefined
	});
	if (!response.ok) throw httpErrorForStatus(response.status);
	return response.status === 204 ? null : response.json();
}

async function getJson(
	deps: CmsHttpDeps,
	path: string,
	token?: string
): Promise<Result<unknown, ContentError>> {
	try {
		const data = await deps.policy.execute(({ signal }) => fetchJson(deps, path, signal, token));
		return ok(data);
	} catch (error) {
		return err(classifyError(error));
	}
}

async function fetchJson(
	deps: CmsHttpDeps,
	path: string,
	signal: AbortSignal,
	token?: string
): Promise<unknown> {
	const response = await deps.fetch(deps.baseUrl + path, { signal, headers: authHeaders(token) });
	if (!response.ok) throw httpErrorForStatus(response.status);
	return response.json();
}

function authHeaders(token?: string): Record<string, string> {
	return token ? { Authorization: `Bearer ${token}` } : {};
}
