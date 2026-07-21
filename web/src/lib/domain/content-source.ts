/**
 * The ContentSource port: the ONLY way the frontend reads CMS content.
 * Pages/components depend on this interface, never on a concrete adapter or on
 * Strapi shapes. The dependency-cruiser boundary rules enforce that vendor
 * imports live only in the adapter (web/src/lib/server/cms/**).
 */
import type { Result } from './result';
import type { SiteSettings, NavItem, StaticPage, Club, EventItem, Aktuelt } from './content';
import type { DutyAssignmentRow, DutyCategory } from './duty';

/**
 * Distinct failure modes so callers can react appropriately (constitution:
 * handle timeout/network/4xx/5xx distinctly). `not_found` is separated from
 * generic `client` so a missing page maps cleanly to an HTTP 404.
 */
export type ContentError =
	| { kind: 'timeout' }
	| { kind: 'network' }
	| { kind: 'unavailable' } // upstream circuit open / repeatedly failing
	| { kind: 'not_found' }
	| { kind: 'client'; status: number }
	| { kind: 'server'; status?: number }
	| { kind: 'mapping'; detail: string };

export type ContentResult<T> = Promise<Result<T, ContentError>>;

export interface ContentSource {
	getSiteSettings(): ContentResult<SiteSettings>;
	getNavigation(): ContentResult<NavItem[]>;
	getStaticPageBySlug(slug: string): ContentResult<StaticPage>;
	listUpcomingEvents(): ContentResult<EventItem[]>;
	/** All events whose start falls in the given calendar year (for the calendar page). */
	listEventsByYear(year: number): ContentResult<EventItem[]>;
	/** Years that have events (newest first), always including the current year. */
	getEventYears(): ContentResult<number[]>;
	getEvent(id: string): ContentResult<EventItem>;
	listClubs(): ContentResult<Club[]>;
	getClub(slug: string): ContentResult<Club>;
	getActiveAktuelt(): ContentResult<Aktuelt[]>;
	/** Every event (all years, single- and multi-day) for the ICS calendar feed. */
	listAllEvents(): ContentResult<EventItem[]>;

	/** The duty categories (reference data) used to derive the roster grid. */
	getDutyCategories(): ContentResult<DutyCategory[]>;

	// Members-only duty roster (require the member's JWT).
	/** Stored duty assignments (only assigned slots exist). */
	getDutyRoster(token: string): ContentResult<DutyAssignmentRow[]>;
	/** Assign a free-text name to an (event, category) slot (upsert). */
	claimDuty(
		eventId: string,
		categoryId: string,
		assignee: string,
		token: string
	): ContentResult<void>;
	/** Clear an assignment by its id. */
	releaseDuty(assignmentId: string, token: string): ContentResult<void>;
}
