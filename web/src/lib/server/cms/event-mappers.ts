/**
 * Maps the single CMS `event` collection (eventType enum single-day|multi-day,
 * with date + time fields) onto the domain EventItem union (sgim-x60.14).
 */
import type { EventItem } from '$lib/domain/content';
import { type Node, str, optStr } from './envelope';

/** Combines a Strapi `date` (YYYY-MM-DD) and optional `time` (HH:mm:ss) into a Date. */
function combine(dateStr: string, timeStr?: string): Date {
	return new Date(`${dateStr}T${timeStr ?? '00:00:00'}`);
}

export function mapEvent(node: Node): EventItem {
	const id = str(node, 'documentId');
	const slug = str(node, 'slug');
	const title = str(node, 'title');
	const descriptionHtml = optStr(node, 'description') ?? '';
	const location = optStr(node, 'location');
	const startDate = str(node, 'startDate');

	if (optStr(node, 'eventType') === 'multi-day') {
		return {
			kind: 'multiday',
			id,
			slug,
			title,
			startDate: combine(startDate),
			endDate: combine(optStr(node, 'endDate') ?? startDate),
			dailyTime: optStr(node, 'startTime'),
			location,
			descriptionHtml,
			speaker: optStr(node, 'organizer'),
			clubSlug: undefined
		};
	}

	const startTime = optStr(node, 'startTime');
	const endTime = optStr(node, 'endTime');
	return {
		kind: 'single',
		id,
		slug,
		title,
		start: combine(startDate, startTime),
		end: endTime ? combine(startDate, endTime) : undefined,
		location,
		descriptionHtml,
		speaker: optStr(node, 'organizer'),
		clubSlug: undefined
	};
}
