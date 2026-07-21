/**
 * Centralised CMS endpoint paths, reconciled to the real Strapi apiIDs
 * (sgim-x60.14 / sgim-pgx.15). Single types: site-setting, aktuelt.
 * Collections: events, clubs, navigations, static-pages.
 */
const slugFilter = (slug: string) => `filters[slug][$eq]=${encodeURIComponent(slug)}`;

export const endpoints = {
	siteSettings: '/api/site-setting?populate=*',
	// Navigation entries are flat; the header menu is the ones tagged location=header.
	navigation: '/api/navigations?filters[location][$eq]=header&sort=title:asc',
	clubs: '/api/clubs?sort=name:asc&populate=*',
	events: '/api/events?populate=*&pagination[pageSize]=100',
	// Single type: returns the one entry (or 404 when none exists yet).
	aktuelt: '/api/aktuelt?populate=*',
	staticPageBySlug: (slug: string) => `/api/static-pages?${slugFilter(slug)}&populate=*`,
	clubBySlug: (slug: string) => `/api/clubs?${slugFilter(slug)}&populate=*`,
	eventBySlug: (slug: string) => `/api/events?${slugFilter(slug)}&populate=*`,
	// Calendar (sgim-x60.15): events within one year, and the earliest/latest
	// event date (limit 1) to derive the year-navigation range cheaply.
	eventsByYear: (year: number) =>
		`/api/events?populate=*&sort=startDate:asc&pagination[pageSize]=500` +
		`&filters[startDate][$gte]=${year}-01-01&filters[startDate][$lte]=${year}-12-31`,
	eventBoundary: (dir: 'asc' | 'desc') =>
		`/api/events?fields[0]=startDate&sort=startDate:${dir}&pagination[pageSize]=1`
};
