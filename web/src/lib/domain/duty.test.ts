import { describe, it, expect } from 'vitest';
import {
	buildDutyGrid,
	summarizeYearlyDuties,
	type DutyAssignmentRow,
	type DutyCategory,
	type DutyEvent
} from './duty';

const categories: DutyCategory[] = [
	{ id: 'cat-coffee', name: 'Kaffe', order: 1 },
	{ id: 'cat-lead', name: 'Mødeleder', order: 0 }
];

const event = (over: Partial<DutyEvent>): DutyEvent => ({
	eventId: 'ev1',
	eventSlug: 'e1',
	eventTitle: 'E1',
	start: new Date('2026-08-14'),
	kind: 'single',
	...over
});

const assignment = (over: Partial<DutyAssignmentRow>): DutyAssignmentRow => ({
	id: 'a1',
	eventSlug: 'e1',
	categoryId: 'cat-coffee',
	assignee: 'Anna',
	start: new Date('2026-08-14'),
	...over
});

describe('buildDutyGrid', () => {
	it('gives every single-day event a slot per category, sorted by category order', () => {
		const grid = buildDutyGrid([event({})], categories, []);
		expect(grid).toHaveLength(1);
		expect(grid[0].slots.map((s) => s.categoryName)).toEqual(['Mødeleder', 'Kaffe']);
		expect(grid[0].slots.every((s) => s.assignee === undefined)).toBe(true);
	});

	it('overlays an assignment onto its slot', () => {
		const grid = buildDutyGrid([event({})], categories, [assignment({ id: 'x' })]);
		const coffee = grid[0].slots.find((s) => s.categoryId === 'cat-coffee');
		expect(coffee?.assignee).toBe('Anna');
		expect(coffee?.assignmentId).toBe('x');
	});

	it('excludes multi-day events', () => {
		expect(buildDutyGrid([event({ kind: 'multiday' })], categories, [])).toEqual([]);
	});

	it('sorts events by start date', () => {
		const grid = buildDutyGrid(
			[
				event({ eventSlug: 'late', start: new Date('2026-09-01') }),
				event({ eventSlug: 'early', start: new Date('2026-08-01') })
			],
			categories,
			[]
		);
		expect(grid.map((m) => m.eventSlug)).toEqual(['early', 'late']);
	});
});

describe('summarizeYearlyDuties', () => {
	it('counts assignments per assignee for the year (incl. past), alphabetical', () => {
		const rows = [
			assignment({ id: '1', assignee: 'Anna', start: new Date('2026-01-10') }),
			assignment({ id: '2', assignee: 'Anna', start: new Date('2026-02-10') }),
			assignment({ id: '3', assignee: 'Anna', start: new Date('2025-12-10') }), // other year
			assignment({ id: '4', assignee: 'Bo', start: new Date('2026-03-10') })
		];
		expect(summarizeYearlyDuties(rows, 2026)).toEqual([
			{ assignee: 'Anna', count: 2 },
			{ assignee: 'Bo', count: 1 }
		]);
	});
});
