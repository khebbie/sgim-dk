import { describe, it, expect } from 'vitest';
import { createCmsContentSource } from './index';
import type { FetchFn } from './http';
import type { Config } from '$lib/server/config-loader';
import type { ContentSource } from '$lib/domain/content-source';
import { isOk } from '$lib/domain/result';
import { createInMemoryContentSource } from '$lib/testing/in-memory-content-source';

const config: Config = {
	cmsBaseUrl: 'http://cms',
	cmsRequestTimeoutMs: 50,
	sessionSecret: 'test'
};

const respondWith =
	(body: unknown): FetchFn =>
	() =>
		Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

/** A representative page-level consumer that only knows the port. */
async function clubNames(source: ContentSource): Promise<string[]> {
	const result = await source.listClubs();
	return isOk(result) ? result.value.map((club) => club.name) : [];
}

describe('createCmsContentSource (composition root)', () => {
	it('wires config + resilience + fetch into a working Strapi source', async () => {
		const source = createCmsContentSource({
			config,
			fetch: respondWith({ data: [{ name: 'IMU', slug: 'imu', description: 'x' }] }),
			resilience: { retryDelayMs: 0 }
		});
		const result = await source.listClubs();
		expect(isOk(result) && result.value[0].name).toBe('IMU');
	});
});

describe('port is a real seam (Replaceability)', () => {
	it('the same consumer works against the in-memory fake and the Strapi adapter', async () => {
		const strapi = createCmsContentSource({
			config,
			fetch: respondWith({ data: [{ name: 'IMU', slug: 'imu', description: 'x' }] }),
			resilience: { retryDelayMs: 0 }
		});
		const fake = createInMemoryContentSource({
			clubs: [{ name: 'IMU', slug: 'imu', descriptionHtml: 'x' }]
		});
		expect(await clubNames(strapi)).toEqual(await clubNames(fake));
	});
});
