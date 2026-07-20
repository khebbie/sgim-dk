/**
 * Duty-roster domain types + pure grouping (sgim-x60.11). A flat list of
 * assignments (one per event × category) is grouped into per-meeting rosters,
 * sorted by date then category order. No I/O, so it is unit-testable.
 */

/** One assignment as returned by the adapter (flattened). */
export interface DutyAssignmentRow {
	id: string;
	eventSlug: string;
	eventTitle: string;
	start: Date;
	categoryName: string;
	categoryOrder: number;
	/** Assignee username; undefined = open slot. */
	memberName?: string;
}

export interface DutySlot {
	id: string;
	categoryName: string;
	memberName?: string;
}

export interface DutyMeeting {
	eventSlug: string;
	eventTitle: string;
	start: Date;
	slots: DutySlot[];
}

/** Groups flat assignments into per-meeting rosters (meetings by date, slots by category order). */
export function groupRoster(rows: DutyAssignmentRow[]): DutyMeeting[] {
	const byEvent = new Map<string, { meeting: DutyMeeting; rows: DutyAssignmentRow[] }>();
	for (const row of rows) {
		const entry = byEvent.get(row.eventSlug) ?? {
			meeting: {
				eventSlug: row.eventSlug,
				eventTitle: row.eventTitle,
				start: row.start,
				slots: []
			},
			rows: []
		};
		entry.rows.push(row);
		byEvent.set(row.eventSlug, entry);
	}

	return [...byEvent.values()]
		.sort((a, b) => a.meeting.start.getTime() - b.meeting.start.getTime())
		.map(({ meeting, rows: eventRows }) => ({
			...meeting,
			slots: eventRows
				.slice()
				.sort((a, b) => a.categoryOrder - b.categoryOrder)
				.map((r) => ({ id: r.id, categoryName: r.categoryName, memberName: r.memberName }))
		}));
}
