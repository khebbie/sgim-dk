import { describe, it, expect } from 'vitest';
import { groupRoster, type DutyAssignmentRow } from './duty';

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
});
