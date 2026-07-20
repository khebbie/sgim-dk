import { describe, it, expect } from 'vitest';
import { upcomingFeed } from './events';
import type { EventItem } from './content';

const now = new Date('2026-08-01T00:00:00Z');

const single = (id: string, start: string, end?: string): EventItem => ({
	kind: 'single',
	id,
	slug: id,
	title: id,
	start: new Date(start),
	end: end ? new Date(end) : undefined,
	descriptionHtml: 'x'
});
const multi = (id: string, startDate: string, endDate: string): EventItem => ({
	kind: 'multiday',
	id,
	slug: id,
	title: id,
	startDate: new Date(startDate),
	endDate: new Date(endDate),
	descriptionHtml: 'x'
});

describe('upcomingFeed', () => {
	it('sorts both kinds ascending by start', () => {
		const feed = upcomingFeed(
			[single('B', '2026-09-01'), multi('C', '2026-08-15', '2026-08-20')],
			now
		);
		expect(feed.map((e) => e.id)).toEqual(['C', 'B']);
	});

	it('drops a finished single event but keeps one still running (end in the future)', () => {
		const feed = upcomingFeed(
			[single('past', '2026-07-01'), single('running', '2026-07-30', '2026-08-05')],
			now
		);
		expect(feed.map((e) => e.id)).toEqual(['running']);
	});

	it('keeps a multi-day event until its endDate passes', () => {
		const feed = upcomingFeed([multi('ended', '2026-07-01', '2026-07-31')], now);
		expect(feed).toEqual([]);
	});
});
