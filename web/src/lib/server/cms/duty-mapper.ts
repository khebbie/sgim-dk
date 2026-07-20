/**
 * Maps the duty-assignment roster payload (custom find, sgim-pgx.11) to flat
 * domain rows. Rows missing their event/category are skipped defensively.
 */
import type { DutyAssignmentRow } from '$lib/domain/duty';
import { dataList, type Node } from './envelope';

export function mapDutyRows(payload: unknown): DutyAssignmentRow[] {
	return dataList(payload).flatMap(rowToDuty);
}

function rowToDuty(node: Node): DutyAssignmentRow[] {
	const event = node.event as Node | null;
	const category = node.category as Node | null;
	if (!event || !category) return [];
	const member = node.member as { username?: string } | null;
	return [
		{
			id: String(node.documentId),
			eventSlug: String(event.slug),
			eventTitle: String(event.title),
			start: new Date(String(event.startDate)),
			categoryName: String(category.name),
			categoryOrder: typeof category.order === 'number' ? category.order : 0,
			memberName: member?.username
		}
	];
}
