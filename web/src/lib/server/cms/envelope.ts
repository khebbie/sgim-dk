/**
 * Small pure helpers for reading Strapi v5's REST envelope ({ data, meta })
 * and its (flattened) entry fields. Centralised so the rest of the adapter
 * doesn't scatter untyped property access, and so a Strapi shape change is a
 * one-file edit. Missing required fields raise MappingError.
 *
 * Strapi v5 response structure for collection types:
 * { data: [{ id: 1, attributes: { title: '...', content: '...' } }], meta: {...} }
 *
 * This module extracts the attributes from each entry so mappers receive
 * the actual content fields directly.
 */
import { MappingError } from './errors';

export type Node = Record<string, unknown>;

/**
 * Extracts the attributes object from a Strapi entry.
 * In Strapi v5, content is nested under the 'attributes' field.
 */
function extractAttributes(node: Node): Node {
	const attributes = node.attributes;
	if (attributes && typeof attributes === 'object' && !Array.isArray(attributes)) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { attributes: _attrs, ...rest } = node;
		return { ...rest, ...attributes };
	}
	return node;
}

/** Extracts the single-entry `data` node from a Strapi response. */
export function dataNode(payload: unknown): Node {
	const data = (payload as { data?: unknown })?.data;
	if (!data || typeof data !== 'object') throw new MappingError('missing data object');
	return extractAttributes(data as Node);
}

/** Extracts the collection `data` array from a Strapi response. */
export function dataList(payload: unknown): Node[] {
	const data = (payload as { data?: unknown })?.data;
	if (!Array.isArray(data)) throw new MappingError('missing data array');
	return data.map(extractAttributes);
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
