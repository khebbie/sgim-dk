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

const weekdayShort = new Intl.DateTimeFormat('da-DK', { weekday: 'short' });
const monthShort = new Intl.DateTimeFormat('da-DK', { month: 'short' });

const stripDot = (s: string): string => s.replace(/\.$/, '');

/**
 * The parts of an event's start date for the compact calendar "chip"
 * (decorative — the full, accessible date still comes from formatEventWhen).
 */
export function eventChip(event: EventItem): { weekday: string; day: string; month: string } {
	const date = event.kind === 'single' ? event.start : event.startDate;
	return {
		weekday: stripDot(weekdayShort.format(date)),
		day: String(date.getDate()),
		month: stripDot(monthShort.format(date))
	};
}

/** When an event happens: a single date (with "kl HH:MM" if timed), or a range. */
export function formatEventWhen(event: EventItem): string {
	if (event.kind === 'single') {
		const date = longDate.format(event.start);
		return hasTime(event.start) ? `${date} kl ${formatTime(event.start)}` : date;
	}
	return `${longDate.format(event.startDate)} – ${longDate.format(event.endDate)}`;
}
