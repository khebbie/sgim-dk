/**
 * Pure navigation helpers shared by the layout. No framework/CMS imports, so
 * the fallback + active-state + degradation decisions are unit-testable.
 */
import { isOk, type Result } from './result';
import type { ContentError } from './content-source';
import type { NavItem } from './content';

/** Minimal hardcoded menu used when the CMS navigation is unavailable. */
export const FALLBACK_NAV: NavItem[] = [
	{ label: 'Hjem', href: '/', children: [] },
	{ label: 'Kalender', href: '/kalender', children: [] },
	{ label: 'Klubber', href: '/klubber', children: [] },
	{ label: 'Om os', href: '/om-os', children: [] }
];

/** Whether a menu href is "active" for the current path (exact for "/", prefix otherwise). */
export function isActive(href: string, pathname: string): boolean {
	if (href === '/') return pathname === '/';
	return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Chooses the menu to render: the CMS one when present and non-empty, else the
 * fallback. `usedFallback` lets the caller log a degradation without deciding here.
 */
export function chooseNavigation(result: Result<NavItem[], ContentError>): {
	navigation: NavItem[];
	usedFallback: boolean;
} {
	if (isOk(result) && result.value.length > 0) {
		return { navigation: result.value, usedFallback: false };
	}
	return { navigation: FALLBACK_NAV, usedFallback: true };
}
