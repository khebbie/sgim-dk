/**
 * App wiring: binds the validated Config to the ContentSource factory using the
 * request's `fetch` (so SvelteKit can track/cache SSR fetches). Route server
 * loads call this — they never touch the Strapi adapter directly.
 */
import type { ContentSource } from '$lib/domain/content-source';
import type { FetchFn } from '$lib/server/cms/http';
import { createCmsContentSource } from '$lib/server/cms';
import { getConfig } from '$lib/server/config';

export function contentSource(fetch: FetchFn): ContentSource {
	return createCmsContentSource({ config: getConfig(), fetch });
}
