/**
 * Small pure helpers for reading Strapi v5's REST envelope ({ data, meta })
 * and its (flattened) entry fields. Centralised so the rest of the adapter
 * doesn't scatter untyped property access, and so a Strapi shape change is a
 * one-file edit. Missing required fields raise MappingError.
 */
import { MappingError } from './errors';

export type Node = Record<string, unknown>;

/** Extracts the single-entry `data` node from a Strapi response. */
export function dataNode(payload: unknown): Node {
	const data = (payload as { data?: unknown })?.data;
	if (!data || typeof data !== 'object') throw new MappingError('missing data object');
	return data as Node;
}

/** Extracts the collection `data` array from a Strapi response. */
export function dataList(payload: unknown): Node[] {
	const data = (payload as { data?: unknown })?.data;
	if (!Array.isArray(data)) throw new MappingError('missing data array');
	return data as Node[];
}

export function str(node: Node, key: string): string {
	const value = node[key];
	if (typeof value !== 'string' || value.length === 0) {
		throw new MappingError(`missing string field "${key}"`);
	}
	return value;
}

export function optStr(node: Node, key: string): string | undefined {
	const value = node[key];
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function optDate(node: Node, key: string): Date | undefined {
	const raw = optStr(node, key);
	if (raw === undefined) return undefined;
	return requireDateValue(key, raw);
}

export function date(node: Node, key: string): Date {
	return requireDateValue(key, str(node, key));
}

function requireDateValue(key: string, raw: string): Date {
	const parsed = new Date(raw);
	if (Number.isNaN(parsed.getTime())) throw new MappingError(`invalid date field "${key}"`);
	return parsed;
}
