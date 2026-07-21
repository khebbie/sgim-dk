/**
 * Maps the duty-assignment roster payload (custom find, sgim-3ya.5) to flat
 * domain rows. Only assigned rows exist; rows missing event/category/assignee
 * are skipped defensively.
 */
import type { DutyAssignmentRow, DutyCategory } from '$lib/domain/duty';
import { dataList, type Node } from './envelope';

export function mapDutyRows(payload: unknown): DutyAssignmentRow[] {
	return dataList(payload).flatMap(rowToDuty);
}

function rowToDuty(node: Node): DutyAssignmentRow[] {
	const event = node.event as Node | null;
	const category = node.category as Node | null;
	const assignee = typeof node.assignee === 'string' ? node.assignee.trim() : '';
	if (!event || !category || !assignee) return [];
	return [
		{
			id: String(node.documentId),
			eventSlug: String(event.slug),
			categoryId: String(category.documentId),
			assignee,
			start: new Date(String(event.startDate))
		}
	];
}

export function mapDutyCategory(node: Node): DutyCategory {
	return {
		id: String(node.documentId),
		name: String(node.name),
		order: typeof node.order === 'number' ? node.order : 0
	};
}
