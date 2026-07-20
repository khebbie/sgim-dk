import { describe, it, expect } from 'vitest';
import { isActive, chooseNavigation, FALLBACK_NAV } from './navigation';
import { ok, err } from './result';
import type { NavItem } from './content';

describe('isActive', () => {
	it('matches the root only exactly', () => {
		expect(isActive('/', '/')).toBe(true);
		expect(isActive('/', '/klubber')).toBe(false);
	});
	it('matches a section by exact path or nested child path', () => {
		expect(isActive('/klubber', '/klubber')).toBe(true);
		expect(isActive('/klubber', '/klubber/imu')).toBe(true);
	});
	it('does not treat a shared prefix as active', () => {
		expect(isActive('/klub', '/klubber')).toBe(false);
	});
});

describe('chooseNavigation', () => {
	const nav: NavItem[] = [{ label: 'Om os', href: '/om-os', children: [] }];

	it('uses the CMS menu when present and non-empty', () => {
		expect(chooseNavigation(ok(nav))).toEqual({ navigation: nav, usedFallback: false });
	});
	it('falls back on a transport error', () => {
		expect(chooseNavigation(err({ kind: 'timeout' }))).toEqual({
			navigation: FALLBACK_NAV,
			usedFallback: true
		});
	});
	it('falls back when the CMS returns an empty menu', () => {
		expect(chooseNavigation(ok([]))).toEqual({ navigation: FALLBACK_NAV, usedFallback: true });
	});
});
