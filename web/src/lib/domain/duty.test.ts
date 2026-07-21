import { describe, it, expect } from 'vitest';
import {
	buildRosterFromMeetings,
	groupRoster,
	summarizeYearlyDuties,
	type DutyAssignmentRow
} from './duty';

const row = (over: Partial<DutyAssignmentRow>): DutyAssignmentRow => ({
	id: '1',
	eventSlug: 'e1',
	eventTitle: 'E1',
	start: new Date('2026-08-14'),
	categoryName: 'Kaffe',
	categoryOrder: 1,
	...over
});

describe('groupRoster', () => {
	it('groups by meeting, sorts meetings by date and slots by category order', () => {
		const roster = groupRoster([
			row({
				id: 'a',
				eventSlug: 'e2',
				eventTitle: 'Later',
				start: new Date('2026-09-01'),
				categoryOrder: 0
			}),
			row({ id: 'b', eventSlug: 'e1', categoryName: 'B', categoryOrder: 2 }),
			row({ id: 'c', eventSlug: 'e1', categoryName: 'A', categoryOrder: 1 })
		]);
		expect(roster.map((m) => m.eventSlug)).toEqual(['e1', 'e2']);
		expect(roster[0].slots.map((s) => s.categoryName)).toEqual(['A', 'B']);
	});

	it('distinguishes assigned from open slots', () => {
		const roster = groupRoster([
			row({ id: '1', categoryOrder: 1, memberName: 'medlem' }),
			row({ id: '2', categoryName: 'Rengøring', categoryOrder: 2 })
		]);
		expect(roster[0].slots[0].memberName).toBe('medlem');
		expect(roster[0].slots[1].memberName).toBeUndefined();
	});

	it('summarises completed duties per member for a given year', () => {
		const roster = groupRoster([
			row({
				id: '1',
				eventSlug: 'e1',
				eventTitle: 'E1',
				start: new Date('2026-01-10'),
				memberName: 'Anna'
			}),
			row({
				id: '2',
				eventSlug: 'e2',
				eventTitle: 'E2',
				start: new Date('2026-02-10'),
				memberName: 'Anna'
			}),
			row({
				id: '3',
				eventSlug: 'e3',
				eventTitle: 'E3',
				start: new Date('2025-12-10'),
				memberName: 'Anna'
			}),
			row({
				id: '4',
				eventSlug: 'e4',
				eventTitle: 'E4',
				start: new Date('2026-03-10'),
				memberName: 'Bo'
			})
		]);

		expect(summarizeYearlyDuties(roster, 2026)).toEqual([
			{ memberName: 'Anna', completedDuties: 2 },
			{ memberName: 'Bo', completedDuties: 1 }
		]);
	});

	it('only includes single-day events that have duty rows', () => {
		const roster = buildRosterFromMeetings(
			[
				{ eventSlug: 'e1', eventTitle: 'E1', start: new Date('2026-01-10'), kind: 'single' },
				{ eventSlug: 'e2', eventTitle: 'E2', start: new Date('2026-02-10'), kind: 'single' },
				{ eventSlug: 'e3', eventTitle: 'E3', start: new Date('2026-03-10'), kind: 'multiday' }
			],
			[{ eventSlug: 'e1', eventTitle: 'E1', start: new Date('2026-01-10'), slots: [] }]
		);

		expect(roster.map((meeting) => meeting.eventSlug)).toEqual([]);
	});

	it('includes roster meetings even when the event feed omits them', () => {
		const roster = buildRosterFromMeetings(
			[{ eventSlug: 'e1', eventTitle: 'E1', start: new Date('2026-01-10'), kind: 'single' }],
			[
				{
					eventSlug: 'e2',
					eventTitle: 'E2',
					start: new Date('2026-02-10'),
					slots: [{ id: 's1', categoryName: 'Kaffe', memberName: 'Anna' }]
				}
			]
		);

		expect(roster.map((meeting) => meeting.eventSlug)).toEqual(['e2']);
	});
});
