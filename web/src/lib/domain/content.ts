/**
 * Technology-agnostic domain types for site content. These are what the
 * ContentSource port returns — the frontend never sees Strapi's response
 * shapes (constitution: Replaceability, Ports & Adapters). The Strapi adapter
 * maps its JSON onto these; swapping the CMS means rewriting only the adapter.
 */

export interface SiteSettings {
	siteName: string;
	/** Short site intro shown on the default homepage (CMS: siteDescription). */
	intro: string;
	email?: string;
	phone?: string;
	address?: string;
	instagramUrl?: string;
	facebookUrl?: string;
	footerHtml?: string;
	copyrightText?: string;
	logoUrl?: string;
}

export interface NavItem {
	label: string;
	href: string;
	children: NavItem[];
}

export interface StaticPage {
	title: string;
	slug: string;
	bodyHtml: string;
	heroImageUrl?: string;
	seoDescription?: string;
}

export interface Club {
	name: string;
	slug: string;
	descriptionHtml: string;
	ageGroup?: string;
	meetingSchedule?: string;
	contactPersonName?: string;
	contactEmail?: string;
	imageUrl?: string;
}

/**
 * Two event kinds share one discriminated union so the frontend renders a
 * single merged, chronologically-sorted feed (see sgim-pgx.6 / sgim-x60.6).
 */
export type EventItem = SingleEvent | MultiDayEvent;

export interface SingleEvent {
	kind: 'single';
	id: string;
	slug: string;
	title: string;
	start: Date;
	end?: Date;
	location?: string;
	descriptionHtml: string;
	speaker?: string;
	clubSlug?: string;
}

export interface MultiDayEvent {
	kind: 'multiday';
	id: string;
	slug: string;
	title: string;
	startDate: Date;
	endDate: Date;
	dailyTime?: string;
	location?: string;
	descriptionHtml: string;
	speaker?: string;
	clubSlug?: string;
}

/** Front-page takeover entry (already filtered to its active window by the CMS). */
export interface Aktuelt {
	title: string;
	bodyHtml: string;
	imageUrl?: string;
	ctaLabel?: string;
	ctaUrl?: string;
}
