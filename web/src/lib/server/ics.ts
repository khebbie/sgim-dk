/**
 * ICS calendar feed generation for single-day events (sgim-pgx.16).
 * Uses the 'ics' library to generate RFC 5545 compliant iCalendar files.
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
import type { SingleEvent } from '$lib/domain/content';

/**
 * Converts a Date to a DateArray for the ics library.
 * DateArray format: [year, month, day, hour, minute]
 * Note: month is 0-indexed (0-11), but the ics library handles this.
 */
function dateToArray(date: Date): DateArray {
	return [
		date.getFullYear(),
		date.getMonth() + 1, // ics library expects 1-indexed months
		date.getDate(),
		date.getHours(),
		date.getMinutes()
	];
}

/**
 * Generates an ICS calendar feed from single-day events.
 * Only single-day events are included (multi-day events are filtered out).
 */
export function generateIcsCalendar(events: SingleEvent[]): string {
	const icsEvents: EventAttributes[] = events.map((event) => ({
		uid: `sgim-event-${event.id}@sgim.dk`,
		title: event.title,
		start: dateToArray(event.start),
		end: dateToArray(event.end ?? event.start),
		startInputType: 'local',
		endInputType: 'local',
		location: event.location,
		description: stripHtmlTags(event.descriptionHtml),
		productId: 'sgim.dk-calendar'
	}));

	const headerAttributes: HeaderAttributes = {
		productId: 'sgim.dk-calendar',
		calName: 'SGIM Arrangementer'
	};

	const result: ReturnObject = createEvents(icsEvents, headerAttributes);

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
