/**
 * Danish date formatting shared by the pages. Pure (Intl only), no I/O.
 */
import type { EventItem } from '$lib/domain/content';

const longDate = new Intl.DateTimeFormat('da-DK', { dateStyle: 'long' });

export function formatDate(date: Date): string {
	return longDate.format(date);
}

/** When an event happens: a single date, or a start–end range for multi-day. */
export function formatEventWhen(event: EventItem): string {
	if (event.kind === 'single') return longDate.format(event.start);
	return `${longDate.format(event.startDate)} – ${longDate.format(event.endDate)}`;
}
