/**
 * Strapi implementation of the ContentSource port. Composes the resilient HTTP
 * core, the pure mappers, and the injected Clock. Contains NO framework-visible
 * Strapi types beyond this module — callers get domain types only.
 */
import { isOk, ok, err, type Result } from '$lib/domain/result';
import type { Clock } from '$lib/domain/clock';
import type { ContentSource, ContentResult, ContentError } from '$lib/domain/content-source';
import type { Aktuelt } from '$lib/domain/content';
import { upcomingFeed } from '$lib/domain/events';
import { groupRoster } from '$lib/domain/duty';
import { mapDutyRows } from './duty-mapper';
import type { CmsHttp } from './http';
import { endpoints } from './endpoints';
import { dataNode } from './envelope';
import { MappingError } from './errors';
import {
	mapSiteSettings,
	mapNavItem,
	mapStaticPage,
	mapClub,
	mapAktuelt,
	isAktueltActive
} from './mappers';
import { mapEvent } from './event-mappers';
import { mapOne, mapMany, mapFirst } from './map-result';

export interface StrapiDeps {
	http: CmsHttp;
	clock: Clock;
}

export function createStrapiContentSource(deps: StrapiDeps): ContentSource {
	const get = (path: string) => deps.http.getJson(path);
	return {
		async getSiteSettings() {
			return mapOne(await get(endpoints.siteSettings), mapSiteSettings);
		},
		async getNavigation() {
			return mapMany(await get(endpoints.navigation), mapNavItem);
		},
		async getStaticPageBySlug(slug) {
			return mapFirst(await get(endpoints.staticPageBySlug(slug)), mapStaticPage);
		},
		async listClubs() {
			return mapMany(await get(endpoints.clubs), mapClub);
		},
		async getClub(slug) {
			return mapFirst(await get(endpoints.clubBySlug(slug)), mapClub);
		},
		async getEvent(slug) {
			return mapFirst(await get(endpoints.eventBySlug(slug)), mapEvent);
		},
		async listUpcomingEvents() {
			const events = mapMany(await get(endpoints.events), mapEvent);
			return isOk(events) ? ok(upcomingFeed(events.value, deps.clock.now())) : events;
		},
		getActiveAktuelt() {
			return getActiveAktuelt(deps);
		},
		async getDutyRoster(token) {
			const raw = await deps.http.getJson('/api/duty-assignments', token);
			if (!isOk(raw)) return raw;
			try {
				return ok(groupRoster(mapDutyRows(raw.value)));
			} catch (error) {
				const detail =
					error instanceof MappingError ? error.message : 'duty roster mapping failure';
				return err<ContentError>({ kind: 'mapping', detail });
			}
		},
		async claimDuty(assignmentId, token) {
			return toVoid(await deps.http.post(`/api/duty-assignments/${assignmentId}/claim`, token));
		},
		async releaseDuty(assignmentId, token) {
			return toVoid(await deps.http.post(`/api/duty-assignments/${assignmentId}/release`, token));
		}
	};
}

/** Discards a successful POST body; passes any transport error through. */
function toVoid(result: Result<unknown, ContentError>): Result<void, ContentError> {
	return isOk(result) ? ok(undefined) : result;
}

/** Single-type Aktuelt: absent (404) or inactive -> []; active -> the one entry. */
async function getActiveAktuelt(deps: StrapiDeps): ContentResult<Aktuelt[]> {
	const raw = await deps.http.getJson(endpoints.aktuelt);
	if (!isOk(raw)) return raw.error.kind === 'not_found' ? ok([]) : raw;
	try {
		const node = dataNode(raw.value);
		return ok(isAktueltActive(node, deps.clock.now()) ? [mapAktuelt(node)] : []);
	} catch (error) {
		const detail = error instanceof MappingError ? error.message : 'aktuelt mapping failure';
		return err<ContentError>({ kind: 'mapping', detail });
	}
}
