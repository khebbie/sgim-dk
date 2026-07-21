/**
 * Pure calendar logic (sgim-x60.15): group a year's events by month and build
 * the year navigation list, matching sgim.dk (year tabs + month sections).
 * No I/O, no framework — unit-testable.
 */
import type { EventItem } from './content';

export const DANISH_MONTHS = [
	'Januar',
	'Februar',
	'Marts',
	'April',
	'Maj',
	'Juni',
	'Juli',
	'August',
	'September',
	'Oktober',
	'November',
	'December'
];

export interface MonthGroup {
	month: number; // 0-11
	name: string;
	events: EventItem[];
}

function startOf(event: EventItem): Date {
	return event.kind === 'single' ? event.start : event.startDate;
}

export function eventStartYear(event: EventItem): number {
	return startOf(event).getFullYear();
}

/** Groups events by calendar month (ascending), events within a month by start. */
export function groupByMonth(events: EventItem[]): MonthGroup[] {
	const byMonth = new Map<number, EventItem[]>();
	for (const event of events) {
		const month = startOf(event).getMonth();
		const list = byMonth.get(month) ?? [];
		list.push(event);
		byMonth.set(month, list);
	}
	return [...byMonth.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([month, monthEvents]) => ({
			month,
			name: DANISH_MONTHS[month],
			events: monthEvents.slice().sort((a, b) => startOf(a).getTime() - startOf(b).getTime())
		}));
}

/** Years from newest to oldest (like sgim.dk's tabs), inclusive of both bounds. */
export function yearsDescending(minYear: number, maxYear: number): number[] {
	const years: number[] = [];
	for (let year = maxYear; year >= minYear; year--) years.push(year);
	return years;
}
