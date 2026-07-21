import { describe, it, expect } from 'vitest';
import { groupByMonth, yearsDescending, eventStartYear } from './calendar';
import type { EventItem } from './content';

const single = (id: string, start: string): EventItem => ({
	kind: 'single',
	id,
	slug: id,
	title: id,
	start: new Date(start),
	descriptionHtml: ''
});

describe('groupByMonth', () => {
	it('groups by month ascending and orders events within a month', () => {
		const groups = groupByMonth([
			single('c', '2026-03-10T19:00:00'),
			single('a', '2026-01-20T19:00:00'),
			single('b', '2026-01-05T19:00:00')
		]);
		expect(groups.map((g) => g.name)).toEqual(['Januar', 'Marts']);
		expect(groups[0].events.map((e) => e.id)).toEqual(['b', 'a']);
	});
});

describe('yearsDescending', () => {
	it('lists years newest first, inclusive', () => {
		expect(yearsDescending(2024, 2026)).toEqual([2026, 2025, 2024]);
	});
});

describe('eventStartYear', () => {
	it('returns the start year', () => {
		expect(eventStartYear(single('x', '2019-08-14T10:00:00'))).toBe(2019);
	});
});
