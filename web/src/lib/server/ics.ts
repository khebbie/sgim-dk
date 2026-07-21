/**
 * ICS calendar feed generation (sgim-pgx.16 / sgim-3ya.2).
 * Uses the 'ics' library to generate RFC 5545 compliant iCalendar files.
 *
 * Covers the full event set: timed single-day events become timed VEVENTs,
 * untimed single-day events and multi-day events become all-day VEVENTs
 * (DTSTART/DTEND with VALUE=DATE, end-exclusive per RFC 5545).
 *
 * The CMS should only be used by the website and admin users, so this
 * endpoint is provided by the website, not the CMS directly.
 */
import {
	createEvents,
	type EventAttributes,
	type HeaderAttributes,
	type ReturnObject,
	type DateArray
} from 'ics';
import type { EventItem } from '$lib/domain/content';

/** Default length for a timed event with no explicit end, so DTEND != DTSTART. */
const DEFAULT_DURATION_MINUTES = 90;

/** Timed VEVENT date parts: [year, month(1-indexed), day, hour, minute]. */
function dateTimeArray(date: Date): DateArray {
	return [
		date.getFullYear(),
		date.getMonth() + 1,
		date.getDate(),
		date.getHours(),
		date.getMinutes()
	];
}

/** All-day VEVENT date parts: [year, month(1-indexed), day] -> DTSTART;VALUE=DATE. */
function dateOnlyArray(date: Date): DateArray {
	return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60_000);
}

/** A start at exactly 00:00 means the CMS entry carries no time -> treat as all-day. */
function isAllDay(date: Date): boolean {
	return date.getHours() === 0 && date.getMinutes() === 0;
}

function toIcsEvent(event: EventItem): EventAttributes {
	const base = {
		uid: `sgim-event-${event.id}@sgim.dk`,
		title: event.title,
		location: event.location,
		description: stripHtmlTags(event.descriptionHtml),
		productId: 'sgim.dk-calendar'
	};

	// Multi-day: an all-day span. DTEND is exclusive, so add one day to the last.
	if (event.kind === 'multiday') {
		return {
			...base,
			start: dateOnlyArray(event.startDate),
			end: dateOnlyArray(addDays(event.endDate, 1))
		};
	}

	// Single-day with no time: an all-day event covering that one day.
	if (isAllDay(event.start)) {
		return {
			...base,
			start: dateOnlyArray(event.start),
			end: dateOnlyArray(addDays(event.start, 1))
		};
	}

	// Single-day with a time: a timed event; default the end so it isn't zero-length.
	const end = event.end ?? addMinutes(event.start, DEFAULT_DURATION_MINUTES);
	return {
		...base,
		start: dateTimeArray(event.start),
		end: dateTimeArray(end),
		startInputType: 'local',
		endInputType: 'local'
	};
}

/** Generates an ICS calendar feed from all events (single-day and multi-day). */
export function generateIcsCalendar(events: EventItem[]): string {
	const headerAttributes: HeaderAttributes = {
		productId: 'sgim.dk-calendar',
		calName: 'SGIM Arrangementer'
	};

	const result: ReturnObject = createEvents(events.map(toIcsEvent), headerAttributes);

	if (result.error) {
		throw result.error;
	}

	return result.value ?? '';
}

/**
 * Removes HTML tags from a string to create plain text descriptions.
 * ICS format expects plain text, not HTML.
 */
function stripHtmlTags(html: string): string {
	return html.replace(/<[^>]*>/g, '');
}
