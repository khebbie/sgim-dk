/**
 * In-memory ContentSource for tests and local development. Proves the port is a
 * real seam: pages depend only on `ContentSource`, so this fake is fully
 * interchangeable with the Strapi adapter (constitution: Replaceability). Not
 * under `server/cms/**` because it carries no vendor code.
 */
import { ok, err } from '$lib/domain/result';
import type { ContentSource, ContentResult } from '$lib/domain/content-source';
import type {
	SiteSettings,
	NavItem,
	StaticPage,
	Club,
	EventItem,
	Aktuelt
} from '$lib/domain/content';
import type { DutyAssignmentRow, DutyCategory } from '$lib/domain/duty';
import { eventStartYear } from '$lib/domain/calendar';

export interface FakeData {
	siteSettings?: SiteSettings;
	navigation?: NavItem[];
	staticPages?: StaticPage[];
	clubs?: Club[];
	events?: EventItem[];
	aktuelt?: Aktuelt[];
	dutyCategories?: DutyCategory[];
	duties?: DutyAssignmentRow[];
}

export function createInMemoryContentSource(data: FakeData = {}): ContentSource {
	const found = <T>(value: T | undefined): ContentResult<T> =>
		Promise.resolve(value === undefined ? err({ kind: 'not_found' }) : ok(value));

	return {
		getSiteSettings: () => found(data.siteSettings),
		getNavigation: () => Promise.resolve(ok(data.navigation ?? [])),
		getStaticPageBySlug: (slug) => found(data.staticPages?.find((p) => p.slug === slug)),
		listUpcomingEvents: () => Promise.resolve(ok(data.events ?? [])),
		listEventsByYear: (year) =>
			Promise.resolve(ok((data.events ?? []).filter((e) => eventStartYear(e) === year))),
		getEventYears: () =>
			Promise.resolve(
				ok([...new Set((data.events ?? []).map(eventStartYear))].sort((a, b) => b - a))
			),
		getEvent: (id) => found(data.events?.find((e) => e.id === id)),
		listClubs: () => Promise.resolve(ok(data.clubs ?? [])),
		getClub: (slug) => found(data.clubs?.find((c) => c.slug === slug)),
		getActiveAktuelt: () => Promise.resolve(ok(data.aktuelt ?? [])),
		listAllEvents: () => Promise.resolve(ok(data.events ?? [])),
		getDutyCategories: () => Promise.resolve(ok(data.dutyCategories ?? [])),
		getDutyRoster: () => Promise.resolve(ok(data.duties ?? [])),
		claimDuty: () => Promise.resolve(ok(undefined)),
		releaseDuty: () => Promise.resolve(ok(undefined))
	};
}
