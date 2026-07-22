/**
 * Redirects from the old Umbraco/.aspx site to the new routes (sgim-0lt.12).
 *
 * These URLs have been indexed and linked for years, so dropping them would
 * lose that traffic and every bookmark. The paths below were confirmed to
 * return 200 on the legacy site rather than guessed.
 *
 * Pure and table-driven so the mapping is testable and reviewable in one place.
 */

/** Legacy path (lowercase) -> new path. */
export const LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
	'/home.aspx': '/',
	'/program.aspx': '/kalender',
	'/klubber.aspx': '/klubber',
	'/om-os.aspx': '/om-os',
	// The old site gave these clubs their own pages; they are club records now.
	'/juniorklub.aspx': '/klubber/juniorklubben',
	'/teenklub.aspx': '/klubber/teenklubben',
	'/imu.aspx': '/klubber/imu',
	'/log-ind.aspx': '/login',
	'/medlemmer.aspx': '/members',
	// The new site has no search page; the front page is the closest thing.
	'/soeg.aspx': '/'
};

/**
 * The new path for a legacy URL, or undefined if it is not a legacy URL.
 *
 * Matching is case-insensitive because old links and search-engine records use
 * inconsistent casing, and any query string is dropped — the legacy parameters
 * (e.g. log-ind.aspx?ReturnUrl=...) mean nothing to the new routes.
 */
export function legacyRedirect(pathname: string): string | undefined {
	return LEGACY_REDIRECTS[pathname.toLowerCase()];
}
