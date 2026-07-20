/**
 * Pure Strapi-entry -> domain mappers, reconciled to the real CMS field names
 * (sgim-x60.14). No I/O, so every mapper is unit-tested with fixtures.
 */
import type { SiteSettings, NavItem, StaticPage, Club, Aktuelt } from '$lib/domain/content';
import { type Node, str, optStr } from './envelope';

/** Extracts a Strapi media URL (relative to the CMS) if the field is populated. */
export function mediaUrl(value: unknown): string | undefined {
	const url = (value as { url?: unknown } | null)?.url;
	return typeof url === 'string' && url.length > 0 ? url : undefined;
}

export function mapSiteSettings(node: Node): SiteSettings {
	return {
		siteName: str(node, 'siteName'),
		intro: optStr(node, 'siteDescription') ?? '',
		email: optStr(node, 'email'),
		phone: optStr(node, 'phone'),
		address: optStr(node, 'address'),
		instagramUrl: optStr(node, 'instagramUrl'),
		facebookUrl: optStr(node, 'facebookUrl'),
		footerHtml: optStr(node, 'footerText'),
		copyrightText: optStr(node, 'copyrightText'),
		logoUrl: mediaUrl(node.logo)
	};
}

/** Navigation entries are flat {title, slug}; derive an href from the slug. */
export function mapNavItem(node: Node): NavItem {
	const slug = optStr(node, 'slug');
	const href = !slug || slug === 'hjem' || slug === 'home' ? '/' : `/${slug}`;
	return { label: str(node, 'title'), href, children: [] };
}

export function mapAktuelt(node: Node): Aktuelt {
	return {
		title: str(node, 'title'),
		bodyHtml: optStr(node, 'content') ?? '',
		imageUrl: mediaUrl(node.image),
		ctaLabel: optStr(node, 'ctaText'),
		ctaUrl: optStr(node, 'ctaUrl')
	};
}

export function mapClub(node: Node): Club {
	return {
		name: str(node, 'name'),
		slug: str(node, 'slug'),
		descriptionHtml: optStr(node, 'description') ?? '',
		ageGroup: optStr(node, 'targetAudience'),
		meetingSchedule: meetingSchedule(node),
		contactPersonName: optStr(node, 'contactPerson'),
		contactEmail: optStr(node, 'contactEmail'),
		imageUrl: mediaUrl(node.logo) ?? mediaUrl(node.coverImage)
	};
}

const DANISH_DAYS: Record<string, string> = {
	monday: 'Mandag',
	tuesday: 'Tirsdag',
	wednesday: 'Onsdag',
	thursday: 'Torsdag',
	friday: 'Fredag',
	saturday: 'Lørdag',
	sunday: 'Søndag',
	various: 'Varierende'
};

function meetingSchedule(node: Node): string | undefined {
	const day = optStr(node, 'meetingDay');
	const time = optStr(node, 'meetingTime');
	const dayDa = day ? (DANISH_DAYS[day] ?? day) : undefined;
	return [dayDa, time].filter(Boolean).join(' ') || undefined;
}

export function mapStaticPage(node: Node): StaticPage {
	return {
		title: str(node, 'title'),
		slug: str(node, 'slug'),
		bodyHtml: optStr(node, 'content') ?? '',
		heroImageUrl: mediaUrl(node.featuredImage),
		seoDescription: optStr(node, 'metaDescription')
	};
}

/** True when a single-type Aktuelt entry is enabled and within its date window. */
export function isAktueltActive(node: Node, now: Date): boolean {
	if (node.enabled !== true) return false;
	const start = optStr(node, 'startDate');
	const end = optStr(node, 'endDate');
	const afterStart = !start || new Date(start).getTime() <= now.getTime();
	const beforeEnd = !end || new Date(end).getTime() >= now.getTime();
	return afterStart && beforeEnd;
}
