/**
 * Composition root for the Strapi-backed ContentSource. This is the only place
 * that binds concrete infrastructure (global fetch, system clock, the resilience
 * policy built from Config) to the port. Pages import the returned ContentSource
 * — never anything else from this folder.
 */
import type { Config } from '$lib/server/config-loader';
import type { ContentSource } from '$lib/domain/content-source';
import { systemClock, type Clock } from '$lib/domain/clock';
import { createStrapiContentSource } from './strapi-content-source';
import { createCmsHttp, type FetchFn } from './http';
import { buildCmsPolicy, type ResilienceOptions } from './resilience';

export interface CmsContentSourceDeps {
	config: Config;
	/** Injectable for tests / SvelteKit's `fetch`; defaults to global fetch. */
	fetch?: FetchFn;
	clock?: Clock;
	resilience?: Partial<Omit<ResilienceOptions, 'timeoutMs'>>;
}

export function createCmsContentSource(deps: CmsContentSourceDeps): ContentSource {
	const policy = buildCmsPolicy({ timeoutMs: deps.config.cmsRequestTimeoutMs, ...deps.resilience });
	const http = createCmsHttp({
		baseUrl: deps.config.cmsBaseUrl,
		fetch: deps.fetch ?? globalThis.fetch,
		policy
	});
	return createStrapiContentSource({ http, clock: deps.clock ?? systemClock });
}

export type { ContentSource };
