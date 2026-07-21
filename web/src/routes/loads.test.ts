/**
 * Page-load tests against the in-memory ContentSource fake (sgim-x60.12) —
 * proves the route loads work without a live Strapi, using the port seam.
 */
import { describe, it, expect, vi } from 'vitest';
import type { ContentSource } from '$lib/domain/content-source';
import { createInMemoryContentSource } from '$lib/testing/in-memory-content-source';
import type { EventItem, StaticPage, Club, Aktuelt } from '$lib/domain/content';

let fake: ContentSource;
vi.mock('$lib/server/content', () => ({ contentSource: () => fake }));

import { load as homeLoad } from './+page.server';
import { load as clubsLoad } from './klubber/+page.server';
import { load as pageLoad } from './[slug]/+page.server';
import { load as kalenderLoad } from './kalender/+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ev = (event: any) => event as any;

// SvelteKit types a load's return as `void | data`; unwrap for assertions.
 
const out = <T>(result: unknown) => result as T;

const single = (id: string, start: string): EventItem => ({
	kind: 'single',
	id,
	slug: id,
	title: id,
	start: new Date(start),
	descriptionHtml: ''
});

describe('home load', () => {
	it('selects the default view when no Aktuelt is active', async () => {
		fake = createInMemoryContentSource({
			aktuelt: [],
			events: [single('a', '2026-08-14T19:00:00')]
		});
		const data = out<{ view: { mode: string }; upcomingEvents: unknown[] }>(
			await homeLoad(ev({ fetch: () => {} }))
		);
		expect(data.view.mode).toBe('default');
	});

	it('selects the takeover view when an Aktuelt is active, capping events at 3', async () => {
		const aktuelt: Aktuelt = { title: 'Sommerfest', bodyHtml: '<p>Kom med</p>' };
		fake = createInMemoryContentSource({
			aktuelt: [aktuelt],
			events: [1, 2, 3, 4].map((n) => single(`e${n}`, `2026-08-1${n}T19:00:00`))
		});
		const data = out<{ view: { mode: string }; upcomingEvents: unknown[] }>(
			await homeLoad(ev({ fetch: () => {} }))
		);
		expect(data.view.mode).toBe('takeover');
		expect(data.upcomingEvents).toHaveLength(3);
	});
});

describe('klubber load', () => {
	it('returns the clubs from the content source', async () => {
		const clubs: Club[] = [{ name: 'Juniorklub', slug: 'junior' } as Club];
		fake = createInMemoryContentSource({ clubs });
		const data = out<{ clubs: { slug: string }[] }>(await clubsLoad(ev({ fetch: () => {} })));
		expect(data.clubs.map((c) => c.slug)).toEqual(['junior']);
	});
});

describe('[slug] static page load', () => {
	it('returns the page for an existing slug', async () => {
		const page: StaticPage = { title: 'Om os', slug: 'om-os', bodyHtml: '<p>hej</p>' };
		fake = createInMemoryContentSource({ staticPages: [page] });
		const data = out<{ page: { title: string } }>(
			await pageLoad(ev({ fetch: () => {}, params: { slug: 'om-os' } }))
		);
		expect(data.page.title).toBe('Om os');
	});

	it('throws 404 for a missing slug', async () => {
		fake = createInMemoryContentSource({ staticPages: [] });
		await expect(pageLoad(ev({ fetch: () => {}, params: { slug: 'nope' } }))).rejects.toMatchObject(
			{ status: 404 }
		);
	});
});

describe('kalender load', () => {
	it('groups the newest year events by month', async () => {
		fake = createInMemoryContentSource({
			events: [single('jan', '2026-01-10T19:00:00'), single('mar', '2026-03-10T19:00:00')]
		});
		const data = out<{ year: number | null; months: { name: string }[] }>(
			await kalenderLoad(ev({ fetch: () => {}, url: new URL('http://x/kalender') }))
		);
		expect(data.year).toBe(2026);
		expect(data.months.map((m) => m.name)).toEqual(['Januar', 'Marts']);
	});
});
