import { describe, it, expect } from 'vitest';
import { mapNavItem, mapAktuelt, mapStaticPage, mapClub, isAktueltActive } from './mappers';
import { MappingError } from './errors';

describe('mapNavItem', () => {
	it('derives an href from the slug', () => {
		expect(mapNavItem({ title: 'Klubber', slug: 'klubber' })).toEqual({
			label: 'Klubber',
			href: '/klubber',
			children: []
		});
	});
	it('maps the home slug to "/"', () => {
		expect(mapNavItem({ title: 'Hjem', slug: 'hjem' }).href).toBe('/');
	});
});

describe('mapAktuelt', () => {
	it('maps content -> bodyHtml and ctaText -> ctaLabel', () => {
		const a = mapAktuelt({
			title: 'Sommerpause',
			content: '<p>...</p>',
			ctaText: 'Læs',
			ctaUrl: '/x'
		});
		expect(a).toMatchObject({
			title: 'Sommerpause',
			bodyHtml: '<p>...</p>',
			ctaLabel: 'Læs',
			ctaUrl: '/x'
		});
	});
});

describe('mapStaticPage', () => {
	it('maps title/slug/content and optional meta', () => {
		const p = mapStaticPage({ title: 'Om os', slug: 'om-os', content: '<p>hej</p>' });
		expect(p).toMatchObject({ title: 'Om os', slug: 'om-os', bodyHtml: '<p>hej</p>' });
	});
	// Regression (sgim-pgx.17 / sgim-3ya.3): Strapi richtext is Markdown; the mapper
	// must convert it to HTML. A previous version dropped the markdownToHtml call and
	// raw Markdown leaked to the page. Feed real Markdown so removing that call fails here.
	it('converts Markdown content to HTML', () => {
		const p = mapStaticPage({
			title: 'Om os',
			slug: 'om-os',
			content: '## Overskrift\n\nEn **fed** tekst med [link](https://sgim.dk).'
		});
		expect(p.bodyHtml).toContain('<h2>Overskrift</h2>');
		expect(p.bodyHtml).toContain('<strong>fed</strong>');
		expect(p.bodyHtml).toContain('<a href="https://sgim.dk">link</a>');
		// The raw Markdown syntax must not survive into the output.
		expect(p.bodyHtml).not.toContain('## Overskrift');
		expect(p.bodyHtml).not.toContain('**fed**');
	});
	it('throws MappingError when a required field is missing', () => {
		expect(() => mapStaticPage({ slug: 'om-os' })).toThrow(MappingError);
	});
});

describe('mapClub', () => {
	it('maps the club shape (targetAudience -> ageGroup)', () => {
		const c = mapClub({
			name: 'Juniorklub',
			slug: 'junior',
			description: '<p>...</p>',
			targetAudience: '9-13',
			contactEmail: 'a@b.dk'
		});
		expect(c).toMatchObject({ name: 'Juniorklub', ageGroup: '9-13', contactEmail: 'a@b.dk' });
	});
});

describe('isAktueltActive', () => {
	const now = new Date('2026-08-01T00:00:00Z');
	it('is false when disabled', () => {
		expect(isAktueltActive({ enabled: false }, now)).toBe(false);
	});
	it('is true when enabled and within the window', () => {
		expect(
			isAktueltActive(
				{ enabled: true, startDate: '2026-07-01T00:00:00Z', endDate: '2026-09-01T00:00:00Z' },
				now
			)
		).toBe(true);
	});
	it('is false before the start or after the end', () => {
		expect(isAktueltActive({ enabled: true, startDate: '2026-09-01T00:00:00Z' }, now)).toBe(false);
		expect(isAktueltActive({ enabled: true, endDate: '2026-07-01T00:00:00Z' }, now)).toBe(false);
	});
	it('is true when enabled with no window (immediate)', () => {
		expect(isAktueltActive({ enabled: true }, now)).toBe(true);
	});
});
