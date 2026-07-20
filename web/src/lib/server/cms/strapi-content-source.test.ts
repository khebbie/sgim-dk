import { describe, it, expect } from 'vitest';
import { ok, err, isOk } from '$lib/domain/result';
import type { Result } from '$lib/domain/result';
import type { ContentError } from '$lib/domain/content-source';
import type { Clock } from '$lib/domain/clock';
import { createStrapiContentSource } from './strapi-content-source';
import type { CmsHttp } from './http';

const fixedClock: Clock = { now: () => new Date('2026-08-01T00:00:00Z') };

function sourceFrom(
	handler: (path: string) => Result<unknown, ContentError>,
	clock: Clock = fixedClock
) {
	const http: CmsHttp = { getJson: (path) => Promise.resolve(handler(path)) };
	return createStrapiContentSource({ http, clock });
}

const single = (id: string, startDate: string) => ({
	documentId: id,
	slug: id,
	title: id,
	eventType: 'single-day',
	startDate,
	description: 'x'
});
const multi = (id: string, startDate: string, endDate: string) => ({
	documentId: id,
	slug: id,
	title: id,
	eventType: 'multi-day',
	startDate,
	endDate,
	description: 'x'
});

describe('StrapiContentSource', () => {
	it('maps site settings (siteDescription -> intro)', async () => {
		const source = sourceFrom(() =>
			ok({ data: { siteName: 'SGIM', siteDescription: 'Velkommen' } })
		);
		const result = await source.getSiteSettings();
		expect(isOk(result) && result.value).toMatchObject({ siteName: 'SGIM', intro: 'Velkommen' });
	});

	it('returns not_found when a by-slug query yields an empty collection', async () => {
		const source = sourceFrom(() => ok({ data: [] }));
		expect(await source.getStaticPageBySlug('missing')).toEqual({
			ok: false,
			error: { kind: 'not_found' }
		});
	});

	it('merges the single event collection into an ascending upcoming feed', async () => {
		const source = sourceFrom(() =>
			ok({
				data: [
					single('past', '2026-07-01'),
					single('B', '2026-09-01'),
					multi('C', '2026-08-15', '2026-08-20')
				]
			})
		);
		const result = await source.listUpcomingEvents();
		expect(isOk(result) && result.value.map((e) => e.id)).toEqual(['C', 'B']);
	});

	it('maps eventType to the domain kind', async () => {
		const source = sourceFrom(() => ok({ data: [multi('C', '2026-08-15', '2026-08-20')] }));
		const result = await source.getEvent('C');
		expect(isOk(result) && result.value.kind).toBe('multiday');
	});

	it('returns the Aktuelt when enabled and within its window', async () => {
		const source = sourceFrom(() =>
			ok({
				data: {
					enabled: true,
					title: 'Sommerpause',
					content: '<p>x</p>',
					startDate: '2026-07-01T00:00:00Z',
					endDate: '2026-09-01T00:00:00Z'
				}
			})
		);
		const result = await source.getActiveAktuelt();
		expect(isOk(result) && result.value.map((a) => a.title)).toEqual(['Sommerpause']);
	});

	it('returns no Aktuelt when disabled', async () => {
		const source = sourceFrom(() => ok({ data: { enabled: false, title: 'x', content: 'y' } }));
		expect(await source.getActiveAktuelt()).toEqual({ ok: true, value: [] });
	});

	it('treats a missing Aktuelt single-type (404) as none', async () => {
		const source = sourceFrom(() => err({ kind: 'not_found' }));
		expect(await source.getActiveAktuelt()).toEqual({ ok: true, value: [] });
	});

	it('passes a transport error straight through', async () => {
		const source = sourceFrom(() => err({ kind: 'server', status: 500 }));
		expect(await source.getSiteSettings()).toEqual({
			ok: false,
			error: { kind: 'server', status: 500 }
		});
	});

	it('turns an unmappable payload into a mapping error', async () => {
		const source = sourceFrom(() => ok({ data: { email: 'only@this.dk' } }));
		const result = await source.getSiteSettings();
		expect(!isOk(result) && result.error.kind).toBe('mapping');
	});
});
