/**
 * Duty-roster domain (sgim-3ya.5): duties are DERIVED per event. Every event
 * implicitly has one slot per duty category; a stored assignment exists only
 * once someone is assigned (a free-text name). Pure, so it is unit-testable.
 */

/** A duty category (reference data). */
export interface DutyCategory {
	id: string;
	name: string;
	order: number;
}

/** A stored assignment (only assigned slots exist), flattened by the adapter. */
export interface DutyAssignmentRow {
	id: string; // assignment documentId (used to clear it)
	eventSlug: string;
	categoryId: string;
	assignee: string;
	start: Date; // the event's start, for the yearly summary
}

/** An event the roster is built for. */
export interface DutyEvent {
	eventId: string;
	eventSlug: string;
	eventTitle: string;
	start: Date;
	kind?: 'single' | 'multiday';
}

export interface DutySlot {
	categoryId: string;
	categoryName: string;
	/** Present when assigned — the row id (to clear) and the assignee's name. */
	assignmentId?: string;
	assignee?: string;
}

export interface DutyMeeting {
	eventId: string;
	eventSlug: string;
	eventTitle: string;
	start: Date;
	slots: DutySlot[];
}

export interface DutySummary {
	assignee: string;
	count: number;
}

/**
 * Builds the roster grid: each single-day event × category, with any stored
 * assignments overlaid. Multi-day events are excluded (they have no duties).
 */
export function buildDutyGrid(
	events: DutyEvent[],
	categories: DutyCategory[],
	assignments: DutyAssignmentRow[]
): DutyMeeting[] {
	const byKey = new Map<string, DutyAssignmentRow>();
	for (const a of assignments) {
		if (a.assignee) byKey.set(`${a.eventSlug}::${a.categoryId}`, a);
	}
	const sortedCategories = categories.slice().sort((a, b) => a.order - b.order);

	return events
		.filter((event) => event.kind !== 'multiday')
		.slice()
		.sort((a, b) => a.start.getTime() - b.start.getTime())
		.map((event) => ({
			eventId: event.eventId,
			eventSlug: event.eventSlug,
			eventTitle: event.eventTitle,
			start: event.start,
			slots: sortedCategories.map((cat) => {
				const a = byKey.get(`${event.eventSlug}::${cat.id}`);
				return {
					categoryId: cat.id,
					categoryName: cat.name,
					assignmentId: a?.id,
					assignee: a?.assignee
				};
			})
		}));
}

/** Counts assignments per assignee for the given year (includes past events). */
export function summarizeYearlyDuties(
	assignments: DutyAssignmentRow[],
	year: number
): DutySummary[] {
	const counts = new Map<string, number>();
	for (const a of assignments) {
		if (!a.assignee) continue;
		if (a.start.getFullYear() !== year) continue;
		counts.set(a.assignee, (counts.get(a.assignee) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort((a, b) => a[0].localeCompare(b[0], 'da'))
		.map(([assignee, count]) => ({ assignee, count }));
}
