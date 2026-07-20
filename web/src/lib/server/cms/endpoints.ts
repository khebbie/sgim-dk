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
	eventBySlug: (slug: string) => `/api/events?${slugFilter(slug)}&populate=*`
};
