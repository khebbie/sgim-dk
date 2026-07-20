/**
 * Helpers that turn an HTTP `Result<unknown, ContentError>` plus a pure mapper
 * into a domain `Result`, converting any MappingError into ContentError.mapping.
 * Keeps the content-source methods tiny (constitution: Sandi Metz).
 */
import { ok, err, isOk, type Result } from '$lib/domain/result';
import type { ContentError } from '$lib/domain/content-source';
import { dataNode, dataList, type Node } from './envelope';
import { MappingError } from './errors';

type Raw = Result<unknown, ContentError>;

export function mapOne<T>(raw: Raw, map: (node: Node) => T): Result<T, ContentError> {
	if (!isOk(raw)) return raw;
	return guard(() => map(dataNode(raw.value)));
}

export function mapMany<T>(raw: Raw, map: (node: Node) => T): Result<T[], ContentError> {
	if (!isOk(raw)) return raw;
	return guard(() => dataList(raw.value).map(map));
}

/** For "by slug/id" reads that return a filtered collection: first hit or not_found. */
export function mapFirst<T>(raw: Raw, map: (node: Node) => T): Result<T, ContentError> {
	if (!isOk(raw)) return raw;
	return guard(() => {
		const [first] = dataList(raw.value);
		if (!first) throw new MappingError('__not_found__');
		return map(first);
	}, true);
}

function guard<T>(run: () => T, firstMissingIsNotFound = false): Result<T, ContentError> {
	try {
		return ok(run());
	} catch (error) {
		if (firstMissingIsNotFound && isNotFoundMarker(error)) return err({ kind: 'not_found' });
		const detail = error instanceof MappingError ? error.message : 'unknown mapping failure';
		return err({ kind: 'mapping', detail });
	}
}

function isNotFoundMarker(error: unknown): boolean {
	return error instanceof MappingError && error.message === '__not_found__';
}
