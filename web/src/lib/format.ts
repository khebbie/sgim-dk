/**
 * Danish date formatting shared by the pages. Pure (Intl only), no I/O.
 */
import type { EventItem } from '$lib/domain/content';

const longDate = new Intl.DateTimeFormat('da-DK', { dateStyle: 'long' });

export function formatDate(date: Date): string {
	return longDate.format(date);
}

const hasTime = (date: Date): boolean => date.getHours() !== 0 || date.getMinutes() !== 0;

/** 24-hour time as HH:MM (e.g. "19:00"). */
function formatTime(date: Date): string {
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}`;
}

/** When an event happens: a single date (with "kl HH:MM" if timed), or a range. */
export function formatEventWhen(event: EventItem): string {
	if (event.kind === 'single') {
		const date = longDate.format(event.start);
		return hasTime(event.start) ? `${date} kl ${formatTime(event.start)}` : date;
	}
	return `${longDate.format(event.startDate)} – ${longDate.format(event.endDate)}`;
}
